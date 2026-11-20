import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CarteChaleur } from '../composants/graphiques/CarteChaleur'
import { Colonnes } from '../composants/graphiques/Colonnes'
import { Courbe } from '../composants/graphiques/Courbe'
import { Entete, Ligne, Puce, Section, Segmente } from '../composants/ui'
import { MUSCLES, NOM_MUSCLE } from '../data/muscles'
import { db, lireReglages } from '../db'
import { CIBLES } from '../logique/equilibre'
import { bilanSeance } from '../logique/seance'
import {
  dernieresSemaines,
  exercicesPratiques,
  progressionExercice,
  records,
  seancesParSemaine,
  semainesDAffilee,
  tonnage,
  volumeParSemaine,
} from '../logique/stats'
import type { SeanceRealisee } from '../types'
import { DetailSeance } from './DetailSeance'

const kg = (n: number) => (Math.round(n * 10) / 10).toLocaleString('fr-FR')
const jourCourt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const RECORDS_VISIBLES = 6

function Tuile({ libelle, valeur, sous }: { libelle: string; valeur: string; sous?: string }) {
  return (
    <div className="rounded-2xl border border-bord bg-carte p-3">
      <p className="text-[11px] text-discret">{libelle}</p>
      <p className="mt-0.5 text-2xl font-bold">{valeur}</p>
      {sous && <p className="text-[11px] text-discret">{sous}</p>}
    </div>
  )
}

export function Stats() {
  const realisees = useLiveQuery(() => db.seancesRealisees.orderBy('date').reverse().toArray(), [])
  const bilans = useLiveQuery(() => db.bilans.toArray(), [])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const programmes = useLiveQuery(() => db.programmes.toArray(), [])
  const reglages = useLiveQuery(lireReglages, [])
  const [vue, setVue] = useState<'graphiques' | 'historique'>('graphiques')
  const [detail, setDetail] = useState<string | null>(null)
  const [exoChoisi, setExoChoisi] = useState<string | null>(null)
  const [tousRecords, setTousRecords] = useState(false)

  if (!realisees || !bilans || !exercices || !programmes || !reglages) return null
  if (detail) return <DetailSeance id={detail} retour={() => setDetail(null)} />

  const exos = new Map(exercices.map((e) => [e.id, e]))
  const terminees = realisees.filter((s) => !s.enCours)
  const courante = reglages.semaine.numero

  return (
    <div className="pb-6">
      <Entete titre="Stats" />
      <div className="rounded-2xl border border-bord bg-carte p-1">
        <Segmente
          options={[
            { valeur: 'graphiques', libelle: 'Progression' },
            { valeur: 'historique', libelle: 'Historique' },
          ]}
          valeur={vue}
          onChange={setVue}
        />
      </div>

      {terminees.length === 0 ? (
        <p className="mt-10 text-center text-discret">Aucune séance terminée pour l'instant.</p>
      ) : vue === 'historique' ? (
        <Historique terminees={terminees} bilans={bilans} ouvrir={setDetail} />
      ) : (
        (() => {
          const semaines = dernieresSemaines(courante)
          const libelles = semaines.map((n) => `S${n}`)
          const pratiques = exercicesPratiques(terminees)
          const exoId = exoChoisi && pratiques.includes(exoChoisi) ? exoChoisi : pratiques[0]
          const progression = exoId ? progressionExercice(exoId, terminees) : null
          const pts = progression?.points ?? []
          const unite = progression?.unite === 'kg' ? 'kg (1RM estimé)' : 'reps max'
          const recs = records(terminees)
          const volumes = volumeParSemaine(terminees, exos, semaines)
          const parSemaine = seancesParSemaine(terminees, semaines)
          const programme = programmes.find((p) => p.actif)
          const tonnageCourant = tonnage(terminees.filter((s) => s.semaine === courante))
          const tonnagePrecedent = tonnage(terminees.filter((s) => s.semaine === courante - 1))
          const evolution = tonnagePrecedent > 0 ? Math.round(((tonnageCourant - tonnagePrecedent) / tonnagePrecedent) * 100) : null

          return (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Tuile libelle="Séances" valeur={String(terminees.length)} sous="au total" />
                <Tuile libelle="Semaines d'affilée" valeur={String(semainesDAffilee(terminees, courante))} sous="avec 1 séance ou +" />
                <Tuile
                  libelle={`Charge S${courante}`}
                  valeur={`${(tonnageCourant / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t`}
                  sous={evolution !== null ? `${evolution > 0 ? '+' : ''}${evolution} % vs S${courante - 1}` : undefined}
                />
              </div>

              <Section titre="Progression par exercice">
                <div className="-mb-1 flex gap-2 overflow-x-auto p-3 [scrollbar-width:none]">
                  {pratiques.map((id) => (
                    <Puce key={id} actif={id === exoId} onClick={() => setExoChoisi(id)}>
                      {exos.get(id)?.nom ?? id}
                    </Puce>
                  ))}
                </div>
                {exoId && (
                  <div className="px-3 pb-3">
                    <p className="mb-1 px-1 text-xs text-discret">
                      {progression?.unite === 'kg' ? '1RM estimé (kg), meilleure série de chaque séance' : 'Répétitions max par séance'}
                    </p>
                    <Courbe
                      titre={`${exos.get(exoId)?.nom} — ${unite}`}
                      unite={progression?.unite === 'kg' ? 'kg' : 'reps'}
                      points={pts.map((p) => ({
                        date: p.date,
                        valeur: p.valeur,
                        detail: p.meilleure.poidsKg > 0 ? `${p.meilleure.repsFaites} × ${kg(p.meilleure.poidsKg)} kg` : `${p.meilleure.repsFaites} reps`,
                      }))}
                    />
                    {pts.length >= 2 && (
                      <p className="mt-1 px-1 text-xs text-discret">
                        Depuis le {jourCourt(pts[0].date)} :{' '}
                        <span className="font-semibold text-texte">
                          {pts.at(-1)!.valeur - pts[0].valeur >= 0 ? '+' : ''}
                          {kg(pts.at(-1)!.valeur - pts[0].valeur)} {progression?.unite === 'kg' ? 'kg' : 'reps'}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </Section>

              <Section titre="Records" pied="1RM estimé avec la formule d'Epley : poids × (1 + reps / 30).">
                {recs.slice(0, tousRecords ? undefined : RECORDS_VISIBLES).map((r) => (
                  <Ligne
                    key={r.exerciceId}
                    droite={
                      <span className="text-right">
                        <span className="block font-semibold text-texte tabular-nums">
                          {r.unite === 'kg' ? `≈ ${Math.round(r.valeur)} kg` : `${r.valeur} reps`}
                        </span>
                        <span className="block text-[11px]">{jourCourt(r.date)}</span>
                      </span>
                    }
                  >
                    <p className="truncate">{exos.get(r.exerciceId)?.nom}</p>
                    <p className="text-xs text-discret">
                      {r.serie.poidsKg > 0 ? `${r.serie.repsFaites} × ${kg(r.serie.poidsKg)} kg` : `${r.serie.repsFaites} reps`}
                      {r.semaine === courante && <span className="ml-2 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">Nouveau</span>}
                    </p>
                  </Ligne>
                ))}
                {recs.length > RECORDS_VISIBLES && (
                  <button onClick={() => setTousRecords(!tousRecords)} className="w-full py-3 text-sm text-accent">
                    {tousRecords ? 'Voir moins' : `Voir les ${recs.length} records`}
                  </button>
                )}
              </Section>

              <Section titre="Séries par muscle et par semaine" pied="Séries validées : 1 pour un muscle principal, ½ pour un secondaire.">
                <div className="p-3">
                  <CarteChaleur
                    colonnes={libelles}
                    unite="séries"
                    lignes={MUSCLES.map((m) => ({
                      libelle: NOM_MUSCLE[m],
                      valeurs: semaines.map((n) => volumes.get(n)![m]),
                      aide: `cible ${CIBLES[m].min}–${CIBLES[m].max}`,
                    }))}
                  />
                </div>
              </Section>

              <Section titre="Séances par semaine">
                <div className="p-3">
                  <Colonnes
                    titre="Nombre de séances par semaine d'entraînement"
                    objectif={programme?.seances.length}
                    colonnes={semaines.map((n) => ({
                      libelle: `S${n}`,
                      valeur: parSemaine.get(n) ?? 0,
                      description: `Semaine ${n} : ${parSemaine.get(n) ?? 0} séance(s)`,
                    }))}
                  />
                </div>
              </Section>
            </>
          )
        })()
      )}
    </div>
  )
}

function Historique({
  terminees,
  bilans,
  ouvrir,
}: {
  terminees: SeanceRealisee[]
  bilans: { semaine: string; debut: string; fin: string; decisions: unknown[] }[]
  ouvrir: (id: string) => void
}) {
  // Regroupement par semaine d'entraînement (la plus récente en premier)
  const parSemaine = new Map<number, SeanceRealisee[]>()
  for (const s of terminees) parSemaine.set(s.semaine ?? 0, [...(parSemaine.get(s.semaine ?? 0) ?? []), s])
  const titreSemaine = (n: number, seances: SeanceRealisee[]) => {
    const bilan = bilans.find((b) => b.semaine === String(n))
    const dates = bilan ? `${jourCourt(bilan.debut)} – ${jourCourt(bilan.fin)}` : 'en cours'
    const changements = bilan?.decisions.length
      ? ` · ${bilan.decisions.length} charge${bilan.decisions.length > 1 ? 's' : ''} ajustée${bilan.decisions.length > 1 ? 's' : ''}`
      : ''
    return `Semaine ${n} · ${dates} · ${seances.length} séance${seances.length > 1 ? 's' : ''}${changements}`
  }

  return (
    <>
      {[...parSemaine.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([n, seances]) => (
          <Section key={n} titre={titreSemaine(n, seances)}>
            {seances.map((s) => {
              const b = bilanSeance(s)
              return (
                <Ligne
                  key={s.id}
                  onClick={() => ouvrir(s.id)}
                  chevron
                  droite={b.echecs.length > 0 ? <span className="text-xs text-amber-300">{b.echecs.length} !</span> : undefined}
                >
                  <p>{s.nom}</p>
                  <p className="text-xs text-discret first-letter:uppercase">
                    {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })} · {b.validees}/{b.total} séries
                  </p>
                </Ligne>
              )
            })}
          </Section>
        ))}
    </>
  )
}
