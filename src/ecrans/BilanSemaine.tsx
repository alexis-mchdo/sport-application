import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { analyserSemaine, choisirPropositionIA, lireAnalyseSemaine } from '../actionsIA'
import { cloturerSemaine } from '../actionsSeance'
import { Bouton, Entete, Ligne, Section, Segmente } from '../composants/ui'
import { RESSENTIS } from '../data/ressentis'
import { db, lireReglages } from '../db'
import { ErreurIA } from '../ia/gemini'
import { NOM_ZONE } from '../logique/profil'
import { iaRemplaceRegle } from '../logique/ia'
import { proposerProgression, type Proposition } from '../logique/progression'
import { bilanSeance } from '../logique/seance'
import type { DecisionProgression, ZoneCorps } from '../types'

const cle = (p: Proposition) => `${p.seanceId}:${p.exerciceId}`
const kg = (n: number) => n.toLocaleString('fr-FR')

function changement(p: Proposition) {
  if (p.avant.poidsKg !== p.apres.poidsKg) return `${kg(p.avant.poidsKg)} → ${kg(p.apres.poidsKg)} kg`
  if (p.avant.reps !== p.apres.reps) return `${p.avant.reps} → ${p.apres.reps} reps`
  return p.avant.poidsKg > 0 ? `${kg(p.avant.poidsKg)} kg` : `${p.avant.reps} reps`
}

/** Bilan de la semaine d'entraînement : progression proposée, puis passage à la semaine suivante. */
export function BilanSemaine({ retour, apresCloture }: { retour: () => void; apresCloture: () => void }) {
  const programmes = useLiveQuery(() => db.programmes.toArray(), [])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const realisees = useLiveQuery(() => db.seancesRealisees.toArray(), [])
  const reglages = useLiveQuery(lireReglages, [])
  const [refus, setRefus] = useState<Set<string>>(new Set())
  const [envoi, setEnvoi] = useState(false)
  const analyseIA = useLiveQuery(lireAnalyseSemaine, [])
  const [iaEnCours, setIaEnCours] = useState(false)
  const [erreurIA, setErreurIA] = useState<string | null>(null)
  const [voirRejets, setVoirRejets] = useState(false)

  if (!programmes || !exercices || !realisees || !reglages || analyseIA === undefined) return null
  const programme = programmes.find((p) => p.actif)
  const numero = reglages.semaine.numero
  const exos = new Map(exercices.map((e) => [e.id, e]))
  const cette = realisees.filter((s) => !s.enCours && s.semaine === numero)
  const precedente = realisees.filter((s) => !s.enCours && s.semaine === numero - 1)
  const propositions = programme ? proposerProgression(programme, exos, cette, precedente) : []
  const changements = propositions.filter((p) => p.type === 'monter' || p.type === 'baisser')
  const gardes = propositions.filter((p) => p.type === 'garder')
  const pasFaits = propositions.filter((p) => p.type === 'pasFait')

  const bilans = cette.map(bilanSeance)
  const validees = bilans.reduce((t, b) => t + b.validees, 0)
  const total = bilans.reduce((t, b) => t + b.total, 0)
  const tonnage = bilans.reduce((t, b) => t + b.tonnage, 0)
  const ressentis = cette.map((s) => s.ressenti).filter((r): r is number => r !== undefined)
  const ressentiMoyen = ressentis.length ? Math.round(ressentis.reduce((a, b) => a + b, 0) / ressentis.length) : undefined
  const douleurs = new Map<ZoneCorps, number>()
  for (const s of cette) for (const z of s.douleurs ?? []) douleurs.set(z, (douleurs.get(z) ?? 0) + 1)

  const propositionsIA = analyseIA?.analyse.propositions ?? []
  const accepteesIA = propositionsIA.filter((p) => analyseIA?.acceptees.includes(p.id))
  const refuseesIA = propositionsIA.filter((p) => !analyseIA?.acceptees.includes(p.id))
  const remplaceeParIA = (p: Proposition) => iaRemplaceRegle(p.seanceId, p.exerciceId, accepteesIA)

  const lancerAnalyse = async () => {
    setIaEnCours(true)
    setErreurIA(null)
    try {
      await analyserSemaine()
    } catch (e) {
      setErreurIA(e instanceof ErreurIA ? e.message : `Erreur : ${(e as Error).message}`)
    } finally {
      setIaEnCours(false)
    }
  }

  const valider = async () => {
    if (!programme) return
    const nonFaites = programme.seances.length - new Set(cette.map((s) => s.seanceId)).size
    const message =
      nonFaites > 0
        ? `${nonFaites} séance${nonFaites > 1 ? 's' : ''} pas faite${nonFaites > 1 ? 's' : ''} cette semaine. Passer quand même à la semaine ${numero + 1} ?`
        : `Valider le bilan et passer à la semaine ${numero + 1} ?`
    if (!confirm(message)) return
    setEnvoi(true)
    const decisions: DecisionProgression[] = changements
      .filter((p) => !refus.has(cle(p)) && !remplaceeParIA(p))
      .map((p) => ({
        seanceId: p.seanceId,
        exerciceId: p.exerciceId,
        ancienPoids: p.avant.poidsKg,
        nouveauPoids: p.apres.poidsKg,
        ancienReps: p.avant.reps,
        nouveauReps: p.apres.reps,
      }))
    await cloturerSemaine(programme, decisions, analyseIA ? { acceptees: accepteesIA, refusees: refuseesIA } : undefined)
    apresCloture()
  }

  return (
    <div className="pb-10">
      <Entete titre={`Bilan semaine ${numero}`} retour={retour} />

      <div className="grid grid-cols-3 gap-2">
        {[
          ['Séances', `${new Set(cette.map((s) => s.seanceId)).size}/${programme?.seances.length ?? 0}`],
          ['Séries', `${validees}/${total}`],
          ['Charge', `${(tonnage / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t`],
        ].map(([titre, valeur]) => (
          <div key={titre} className="rounded-2xl border border-bord bg-carte p-3">
            <p className="text-[11px] text-discret">{titre}</p>
            <p className="text-lg font-bold tabular-nums">{valeur}</p>
          </div>
        ))}
      </div>

      {(ressentiMoyen || douleurs.size > 0) && (
        <Section titre="Ressenti">
          {ressentiMoyen && (
            <Ligne droite={`${RESSENTIS[ressentiMoyen - 1][1]} ${RESSENTIS[ressentiMoyen - 1][2]}`}>En moyenne</Ligne>
          )}
          {douleurs.size > 0 && (
            <Ligne droite={<span className="text-amber-300">{[...douleurs].map(([z, n]) => `${NOM_ZONE[z]} ×${n}`).join(', ')}</span>}>
              Douleurs signalées
            </Ligne>
          )}
        </Section>
      )}

      <Section
        titre="Charges de la semaine prochaine"
        pied={changements.length ? 'Choisis « Non » pour garder la charge actuelle.' : undefined}
      >
        {changements.length === 0 && (
          <p className="px-4 py-4 text-sm text-discret">Aucun changement proposé cette semaine.</p>
        )}
        {changements.map((p) => (
          <div key={cle(p)} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate">{exos.get(p.exerciceId)?.nom}</p>
              <p className={`text-sm font-semibold ${p.type === 'monter' ? 'text-accent' : 'text-amber-300'}`}>
                {p.type === 'monter' ? '↑' : '↓'} {changement(p)}
              </p>
              <p className="truncate text-xs text-discret">
                {p.seanceNom} · {p.raison}
              </p>
            </div>
            <div className={`w-28 shrink-0 ${remplaceeParIA(p) ? 'opacity-30' : ''}`}>
              <Segmente
                options={[
                  { valeur: 'oui', libelle: 'Oui' },
                  { valeur: 'non', libelle: 'Non' },
                ]}
                valeur={refus.has(cle(p)) ? 'non' : 'oui'}
                onChange={(v) =>
                  setRefus((r) => {
                    const n = new Set(r)
                    if (v === 'non') n.add(cle(p))
                    else n.delete(cle(p))
                    return n
                  })
                }
              />
            </div>
          </div>
        ))}
      </Section>

      {gardes.length > 0 && (
        <Section titre="On garde">
          {gardes.map((p) => (
            <div key={cle(p)} className="px-4 py-3">
              <p className="truncate">{exos.get(p.exerciceId)?.nom}</p>
              <p className="truncate text-xs text-discret">
                {changement(p)} · {p.seanceNom} · {p.raison}
              </p>
            </div>
          ))}
        </Section>
      )}

      {pasFaits.length > 0 && (
        <p className="mt-3 px-1 text-xs text-discret">
          {pasFaits.length} exercice{pasFaits.length > 1 ? 's' : ''} pas fait{pasFaits.length > 1 ? 's' : ''} cette semaine : charges inchangées.
        </p>
      )}

      <Section
        titre="Analyse de l'IA"
        pied={
          analyseIA
            ? "Rien n'est appliqué sans ton « Oui ». Tes refus sont mémorisés et renvoyés à l'IA la prochaine fois."
            : undefined
        }
      >
        {!reglages.cleIA && (
          <p className="px-4 py-4 text-sm text-discret">
            Ajoute ta clé gratuite dans Réglages → IA pour que l'IA analyse ta semaine (séries, ressentis, douleurs, profil).
          </p>
        )}

        {reglages.cleIA && !analyseIA && (
          <div className="space-y-2 p-3">
            <Bouton onClick={lancerAnalyse} disabled={iaEnCours || cette.length === 0}>
              {iaEnCours ? 'Analyse en cours… (jusqu’à 1 min)' : '✨ Analyser ma semaine'}
            </Bouton>
            {cette.length === 0 && <p className="text-center text-xs text-discret">Fais au moins une séance d'abord.</p>}
            {erreurIA && <p className="text-sm text-red-400">{erreurIA}</p>}
          </div>
        )}

        {analyseIA && (
          <>
            {analyseIA.analyse.conseils.map((c, i) => (
              <p key={i} className="px-4 py-3 text-sm">
                💡 {c}
              </p>
            ))}
            {propositionsIA.length === 0 && (
              <p className="px-4 py-3 text-sm text-discret">Aucun changement proposé : continue comme ça.</p>
            )}
            {propositionsIA.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.description}</p>
                  <p className="text-xs text-discret">{p.raison}</p>
                </div>
                <div className="w-28 shrink-0">
                  <Segmente
                    options={[
                      { valeur: 'oui', libelle: 'Oui' },
                      { valeur: 'non', libelle: 'Non' },
                    ]}
                    valeur={analyseIA.acceptees.includes(p.id) ? 'oui' : 'non'}
                    onChange={(v) => choisirPropositionIA(p.id, v === 'oui')}
                  />
                </div>
              </div>
            ))}
            {analyseIA.analyse.rejets.length > 0 && (
              <div className="px-4 py-3">
                <button onClick={() => setVoirRejets(!voirRejets)} className="text-xs text-discret">
                  {analyseIA.analyse.rejets.length} proposition{analyseIA.analyse.rejets.length > 1 ? 's' : ''} écartée
                  {analyseIA.analyse.rejets.length > 1 ? 's' : ''} par l'app (règles de sécurité) {voirRejets ? '▲' : '▼'}
                </button>
                {voirRejets && (
                  <ul className="mt-2 space-y-1 text-xs text-discret">
                    {analyseIA.analyse.rejets.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="p-3">
              <button onClick={lancerAnalyse} disabled={iaEnCours} className="w-full py-1 text-sm text-accent disabled:opacity-40">
                {iaEnCours ? 'Analyse en cours…' : "Relancer l'analyse"}
              </button>
              {erreurIA && <p className="text-sm text-red-400">{erreurIA}</p>}
            </div>
          </>
        )}
      </Section>

      <div className="mt-6">
        <Bouton onClick={valider} disabled={!programme || envoi}>
          Valider et passer à la semaine {numero + 1}
        </Bouton>
        <p className="mt-2 px-1 text-center text-xs text-discret">
          Les séances de cette semaine restent dans Stats, en lecture seule.
        </p>
      </div>
    </div>
  )
}
