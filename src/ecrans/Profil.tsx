import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Feuille } from '../composants/Feuille'
import { ListeExercices } from '../composants/ListeExercices'
import { Bouton, Entete, Ligne, Puce, Section, Segmente } from '../composants/ui'
import { JOURS, NOM_JOUR_COURT } from '../data/jours'
import { EQUIPEMENTS, MUSCLES, NOM_COURT_MUSCLE, NOM_EQUIPEMENT } from '../data/muscles'
import { db, lireProfil, modifierProfil } from '../db'
import {
  NOM_ACTIVITE,
  NOM_COTE,
  NOM_GRAVITE,
  NOM_LIEU,
  NOM_NIVEAU,
  NOM_OBJECTIF,
  NOM_SEXE,
  NOM_STRESS,
  NOM_ZONE,
  RECORDS,
  completion,
  profilEnTexte,
} from '../logique/profil'
import type { Blessure, Profil as TypeProfil } from '../types'

const maj = (modifier: (p: TypeProfil) => void) => modifierProfil(modifier)

/** Choix unique sous forme de puces (re-toucher la puce active la désélectionne). */
function Choix<T extends string | number>({
  options,
  valeur,
  onChange,
}: {
  options: [T, string][]
  valeur: T | undefined
  onChange: (v: T | undefined) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 p-3">
      {options.map(([v, libelle]) => (
        <Puce key={String(v)} actif={valeur === v} onClick={() => onChange(valeur === v ? undefined : v)}>
          {libelle}
        </Puce>
      ))}
    </div>
  )
}

function ChoixMultiple<T extends string | number>({ options, valeurs, onChange }: { options: [T, string][]; valeurs: T[]; onChange: (v: T[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2 p-3">
      {options.map(([v, libelle]) => (
        <Puce key={String(v)} actif={valeurs.includes(v)} onClick={() => onChange(valeurs.includes(v) ? valeurs.filter((x) => x !== v) : [...valeurs, v])}>
          {libelle}
        </Puce>
      ))}
    </div>
  )
}

/** Ligne avec valeur numérique : un tap ouvre la saisie (vide = effacer). */
function LigneNombre({ libelle, valeur, unite, onChange }: { libelle: string; valeur: number | undefined; unite?: string; onChange: (v: number | undefined) => void }) {
  const saisir = () => {
    const texte = prompt(libelle, valeur === undefined ? '' : String(valeur).replace('.', ','))
    if (texte === null) return
    if (texte.trim() === '') return onChange(undefined)
    const v = Number(texte.replace(',', '.'))
    if (Number.isFinite(v) && v >= 0) onChange(v)
  }
  return (
    <Ligne onClick={saisir} droite={valeur === undefined ? '—' : `${valeur.toLocaleString('fr-FR')}${unite ? ` ${unite}` : ''}`}>
      {libelle}
    </Ligne>
  )
}

const entrees = <K extends string>(r: Record<K, string>) => Object.entries(r) as [K, string][]

type SousEcran = { type: 'exercices'; liste: 'exercicesAEviter' | 'exercicesPreferes' } | null

export function Profil() {
  const profil = useLiveQuery(lireProfil, [])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const [sousEcran, setSousEcran] = useState<SousEcran>(null)
  const [blessure, setBlessure] = useState<Blessure | null>(null)
  const [apercu, setApercu] = useState(false)
  const [anneeCourante] = useState(() => new Date().getFullYear())

  if (!profil || !exercices) return null
  const exos = new Map(exercices.map((e) => [e.id, e]))

  if (sousEcran) {
    const { liste } = sousEcran
    return (
      <div className="pb-6">
        <Entete titre={liste === 'exercicesAEviter' ? 'Exercice à éviter' : 'Exercice préféré'} retour={() => setSousEcran(null)} />
        <ListeExercices
          chevron={false}
          droite={(e) => (profil[liste].includes(e.id) ? <span className="text-accent">✓</span> : null)}
          onChoisir={async (e) => {
            await maj((p) => {
              p[liste] = p[liste].includes(e.id) ? p[liste].filter((x) => x !== e.id) : [...p[liste], e.id]
            })
            setSousEcran(null)
          }}
        />
      </div>
    )
  }

  const pourcentage = completion(profil)

  const listeExercices = (liste: 'exercicesAEviter' | 'exercicesPreferes', titre: string, pied: string) => (
    <Section titre={titre} pied={pied}>
      {profil[liste].map((id) => (
        <Ligne
          key={id}
          droite={
            <button onClick={() => maj((p) => (p[liste] = p[liste].filter((x) => x !== id)))} className="text-red-400" aria-label="Retirer">
              ✕
            </button>
          }
        >
          {exos.get(id)?.nom ?? id}
        </Ligne>
      ))}
      <Ligne onClick={() => setSousEcran({ type: 'exercices', liste })}>
        <span className="text-accent">+ Ajouter</span>
      </Ligne>
    </Section>
  )

  const enregistrerBlessure = async () => {
    if (!blessure) return
    await maj((p) => {
      const i = p.blessures.findIndex((b) => b.id === blessure.id)
      if (i >= 0) p.blessures[i] = blessure
      else p.blessures.push(blessure)
    })
    setBlessure(null)
  }

  return (
    <div className="pb-10">
      <Entete titre="Profil" />

      <div className="rounded-2xl border border-bord bg-carte p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Profil complété</p>
          <p className="text-lg font-bold text-accent tabular-nums">{pourcentage} %</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fond">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pourcentage}%` }} />
        </div>
        <p className="mt-3 text-xs text-discret">
          Ces informations serviront à l'IA pour créer ton premier programme et l'ajuster (progression, blessures…). Plus il
          est complet, plus les conseils seront précis. Tout reste sur ton iPhone.
        </p>
      </div>

      <Section titre="Toi">
        <Choix options={entrees(NOM_SEXE)} valeur={profil.sexe} onChange={(v) => maj((p) => (p.sexe = v))} />
        <LigneNombre
          libelle={profil.anneeNaissance ? `Année de naissance (${anneeCourante - profil.anneeNaissance} ans)` : 'Année de naissance'}
          valeur={profil.anneeNaissance}
          onChange={(v) => maj((p) => (p.anneeNaissance = v))}
        />
        <LigneNombre libelle="Taille" unite="cm" valeur={profil.tailleCm} onChange={(v) => maj((p) => (p.tailleCm = v))} />
        <LigneNombre libelle="Poids" unite="kg" valeur={profil.poidsKg} onChange={(v) => maj((p) => (p.poidsKg = v))} />
      </Section>

      <Section titre="Expérience">
        <Choix options={entrees(NOM_NIVEAU)} valeur={profil.niveau} onChange={(v) => maj((p) => (p.niveau = v))} />
        <LigneNombre libelle="Années de pratique" valeur={profil.anneesPratique} onChange={(v) => maj((p) => (p.anneesPratique = v))} />
      </Section>

      <Section titre="Objectif principal">
        <Choix options={entrees(NOM_OBJECTIF)} valeur={profil.objectif} onChange={(v) => maj((p) => (p.objectif = v))} />
      </Section>

      <Section titre="Muscles à prioriser" pied="Facultatif : les muscles que tu veux développer en priorité.">
        <ChoixMultiple
          options={MUSCLES.map((m) => [m, NOM_COURT_MUSCLE[m]])}
          valeurs={profil.musclesPrioritaires}
          onChange={(v) => maj((p) => (p.musclesPrioritaires = v))}
        />
      </Section>

      <Section titre="Disponibilité">
        <p className="px-4 pt-3 text-sm text-discret">Séances par semaine</p>
        <Choix
          options={[2, 3, 4, 5, 6, 7].map((n) => [n, String(n)])}
          valeur={profil.seancesParSemaine}
          onChange={(v) => maj((p) => (p.seancesParSemaine = v))}
        />
        <p className="px-4 pt-1 text-sm text-discret">Durée par séance</p>
        <Choix
          options={[45, 60, 75, 90, 120].map((n) => [n, `${n} min`])}
          valeur={profil.dureeSeanceMin}
          onChange={(v) => maj((p) => (p.dureeSeanceMin = v))}
        />
        <p className="px-4 pt-1 text-sm text-discret">Jours possibles</p>
        <ChoixMultiple
          options={JOURS.map((j) => [j, NOM_JOUR_COURT[j]])}
          valeurs={profil.joursDisponibles}
          onChange={(v) => maj((p) => (p.joursDisponibles = [...v].sort()))}
        />
      </Section>

      <Section titre="Matériel">
        <Choix options={entrees(NOM_LIEU)} valeur={profil.lieu} onChange={(v) => maj((p) => (p.lieu = v))} />
        <p className="px-4 pt-1 text-sm text-discret">Équipement disponible</p>
        <ChoixMultiple
          options={EQUIPEMENTS.map((e) => [e, NOM_EQUIPEMENT[e]])}
          valeurs={profil.equipements}
          onChange={(v) => maj((p) => (p.equipements = v))}
        />
      </Section>

      <Section titre="Blessures et douleurs" pied="L'IA adaptera les exercices en conséquence. Indique aussi les anciennes blessures à surveiller.">
        {profil.blessures.map((b) => (
          <Ligne key={b.id} onClick={() => setBlessure(b)} chevron>
            <p>
              {NOM_ZONE[b.zone]} <span className="text-discret">({NOM_COTE[b.cote].toLowerCase()})</span>
            </p>
            <p className={`text-xs ${b.active ? 'text-amber-300' : 'text-discret'}`}>
              {b.active ? 'Actuelle' : 'Ancienne'} · {NOM_GRAVITE[b.gravite]}
              {b.note ? ` · ${b.note}` : ''}
            </p>
          </Ligne>
        ))}
        <Ligne
          onClick={() => setBlessure({ id: crypto.randomUUID(), zone: 'epaule', cote: 'droite', gravite: 'gene', active: true, note: '' })}
        >
          <span className="text-accent">+ Ajouter</span>
        </Ligne>
      </Section>

      {listeExercices('exercicesAEviter', 'Exercices à éviter', "Ceux que tu ne peux pas ou ne veux pas faire.")}
      {listeExercices('exercicesPreferes', 'Exercices préférés', "Ceux que tu aimes et veux garder dans ton programme.")}

      <Section titre="Récupération">
        <LigneNombre libelle="Sommeil moyen" unite="h / nuit" valeur={profil.sommeilHeures} onChange={(v) => maj((p) => (p.sommeilHeures = v))} />
        <p className="px-4 pt-3 text-sm text-discret">Stress</p>
        <Choix options={entrees(NOM_STRESS)} valeur={profil.stress} onChange={(v) => maj((p) => (p.stress = v))} />
        <p className="px-4 pt-1 text-sm text-discret">Activité au quotidien (hors sport)</p>
        <Choix options={entrees(NOM_ACTIVITE)} valeur={profil.activiteQuotidienne} onChange={(v) => maj((p) => (p.activiteQuotidienne = v))} />
      </Section>

      <Section titre="Records actuels" pied="Charge max sur 1 à 5 répétitions, approximative. Sert à proposer des poids de départ.">
        {RECORDS.map((r) => (
          <LigneNombre
            key={r.cle}
            libelle={r.nom}
            unite={r.unite}
            valeur={profil.records[r.cle]}
            onChange={(v) => maj((p) => (p.records = { ...p.records, [r.cle]: v }))}
          />
        ))}
      </Section>

      <Section titre="Autre chose à savoir">
        <textarea
          key={profil.notes}
          defaultValue={profil.notes}
          onBlur={(e) => maj((p) => (p.notes = e.target.value))}
          rows={3}
          placeholder="Ex. je fais aussi du foot le dimanche, je veux un dos plus large…"
          className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-discret"
        />
      </Section>

      <button onClick={() => setApercu(!apercu)} className="mt-6 w-full py-2 text-sm text-accent">
        {apercu ? "Masquer l'aperçu" : "Voir ce que l'IA recevra"}
      </button>
      {apercu && (
        <pre className="mt-2 rounded-2xl border border-bord bg-carte p-4 text-xs whitespace-pre-wrap text-discret">
          {profilEnTexte(profil, exos)}
        </pre>
      )}

      {blessure && (
        <Feuille titre="Blessure / douleur" fermer={() => setBlessure(null)}>
          <div className="-mx-3 -mt-3">
            <Choix options={entrees(NOM_ZONE)} valeur={blessure.zone} onChange={(v) => v && setBlessure({ ...blessure, zone: v })} />
            <Choix options={entrees(NOM_COTE)} valeur={blessure.cote} onChange={(v) => v && setBlessure({ ...blessure, cote: v })} />
            <Choix options={entrees(NOM_GRAVITE)} valeur={blessure.gravite} onChange={(v) => v && setBlessure({ ...blessure, gravite: v })} />
          </div>
          <Segmente
            options={[
              { valeur: 'oui', libelle: 'Actuelle' },
              { valeur: 'non', libelle: 'Ancienne' },
            ]}
            valeur={blessure.active ? 'oui' : 'non'}
            onChange={(v) => setBlessure({ ...blessure, active: v === 'oui' })}
          />
          <input
            value={blessure.note}
            onChange={(e) => setBlessure({ ...blessure, note: e.target.value })}
            placeholder="Précision (ex. douleur au développé)"
            className="mt-3 w-full rounded-xl border border-bord bg-fond px-4 py-2.5 text-base outline-none placeholder:text-discret"
          />
          <div className="mt-4 space-y-2">
            <Bouton onClick={enregistrerBlessure}>Enregistrer</Bouton>
            {profil.blessures.some((b) => b.id === blessure.id) && (
              <Bouton
                variante="danger"
                onClick={async () => {
                  await maj((p) => (p.blessures = p.blessures.filter((b) => b.id !== blessure.id)))
                  setBlessure(null)
                }}
              >
                Supprimer
              </Bouton>
            )}
          </div>
        </Feuille>
      )}
    </div>
  )
}
