import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Entete, Ligne, Section } from '../composants/ui'
import { db } from '../db'
import { bilanSeance } from '../logique/seance'
import { DetailSeance } from './DetailSeance'

/** Pour l'instant : l'historique. Les graphiques arrivent à l'étape 6. */
export function Stats() {
  const realisees = useLiveQuery(() => db.seancesRealisees.orderBy('date').reverse().toArray(), [])
  const [detail, setDetail] = useState<string | null>(null)

  if (!realisees) return null
  if (detail) return <DetailSeance id={detail} retour={() => setDetail(null)} />

  const terminees = realisees.filter((s) => !s.enCours)
  const parMois = new Map<string, typeof terminees>()
  for (const s of terminees) {
    const mois = new Date(s.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    parMois.set(mois, [...(parMois.get(mois) ?? []), s])
  }

  return (
    <div className="pb-6">
      <Entete titre="Stats" />
      <div className="rounded-2xl border border-bord bg-carte p-4 text-sm text-discret">
        Les graphiques de progression arrivent bientôt. En attendant, voici ton historique.
      </div>

      {terminees.length === 0 && <p className="mt-8 text-center text-discret">Aucune séance terminée pour l'instant.</p>}

      {[...parMois.entries()].map(([mois, seances]) => (
        <Section key={mois} titre={mois}>
          {seances.map((s) => {
            const b = bilanSeance(s)
            return (
              <Ligne
                key={s.id}
                onClick={() => setDetail(s.id)}
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
    </div>
  )
}
