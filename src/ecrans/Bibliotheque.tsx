import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Entete, Ligne, Puce } from '../composants/ui'
import { MUSCLES, NOM_COURT_MUSCLE, NOM_EQUIPEMENT, NOM_MUSCLE } from '../data/muscles'
import { db } from '../db'
import type { Exercice, Muscle } from '../types'
import { FicheExercice } from './FicheExercice'

/** Retire accents et majuscules pour la recherche. */
const normaliser = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Bibliotheque({ retour }: { retour: () => void }) {
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const [recherche, setRecherche] = useState('')
  const [muscle, setMuscle] = useState<Muscle | null>(null)
  const [fiche, setFiche] = useState<{ exercice?: Exercice } | null>(null)

  const liste = useMemo(() => {
    const r = normaliser(recherche.trim())
    return (exercices ?? [])
      .filter((e) => !muscle || e.musclesPrincipaux.includes(muscle))
      .filter((e) => !r || normaliser(e.nom).includes(r))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [exercices, recherche, muscle])

  if (fiche) return <FicheExercice exercice={fiche.exercice} fermer={() => setFiche(null)} />

  return (
    <div className="pb-6">
      <Entete
        titre="Bibliothèque"
        retour={retour}
        action={
          <button
            onClick={() => setFiche({})}
            aria-label="Ajouter un exercice"
            className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-fond"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        }
      />

      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher"
        className="w-full rounded-xl border border-bord bg-carte px-4 py-2.5 text-base outline-none placeholder:text-discret"
      />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Puce actif={muscle === null} onClick={() => setMuscle(null)}>
          Tous
        </Puce>
        {MUSCLES.map((m) => (
          <Puce key={m} actif={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
            {NOM_COURT_MUSCLE[m]}
          </Puce>
        ))}
      </div>

      <p className="mt-4 mb-2 px-1 text-xs text-discret">
        {liste.length} exercice{liste.length > 1 ? 's' : ''}
      </p>
      <div className="divide-y divide-bord overflow-hidden rounded-2xl border border-bord bg-carte">
        {liste.map((e) => (
          <Ligne
            key={e.id}
            onClick={() => setFiche({ exercice: e })}
            chevron
            droite={e.perso ? <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-xs text-accent">Perso</span> : undefined}
          >
            <p className="truncate">{e.nom}</p>
            <p className="truncate text-xs text-discret">
              {e.musclesPrincipaux.map((m) => NOM_MUSCLE[m]).join(', ')} · {NOM_EQUIPEMENT[e.equipement]}
            </p>
          </Ligne>
        ))}
        {exercices && liste.length === 0 && <p className="px-4 py-6 text-center text-discret">Aucun exercice.</p>}
      </div>
    </div>
  )
}
