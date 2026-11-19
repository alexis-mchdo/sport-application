import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Entete, Ligne, Section } from '../composants/ui'
import { db } from '../db'
import { bilanSeance } from '../logique/seance'
import { DetailSeance } from './DetailSeance'

/** Pour l'instant : l'historique. Les graphiques arrivent à l'étape 6. */
export function Stats() {
  const realisees = useLiveQuery(() => db.seancesRealisees.orderBy('date').reverse().toArray(), [])
  const bilans = useLiveQuery(() => db.bilans.toArray(), [])
  const [detail, setDetail] = useState<string | null>(null)

  if (!realisees || !bilans) return null
  if (detail) return <DetailSeance id={detail} retour={() => setDetail(null)} />

  const terminees = realisees.filter((s) => !s.enCours)
  // Regroupement par semaine d'entraînement (la plus récente en premier)
  const parSemaine = new Map<number, typeof terminees>()
  for (const s of terminees) parSemaine.set(s.semaine ?? 0, [...(parSemaine.get(s.semaine ?? 0) ?? []), s])
  const jourCourt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const titreSemaine = (n: number, seances: typeof terminees) => {
    const bilan = bilans.find((b) => b.semaine === String(n))
    const dates = bilan ? `${jourCourt(bilan.debut)} – ${jourCourt(bilan.fin)}` : 'en cours'
    const changements = bilan?.decisions.length ? ` · ${bilan.decisions.length} charge${bilan.decisions.length > 1 ? 's' : ''} ajustée${bilan.decisions.length > 1 ? 's' : ''}` : ''
    return `Semaine ${n} · ${dates} · ${seances.length} séance${seances.length > 1 ? 's' : ''}${changements}`
  }

  return (
    <div className="pb-6">
      <Entete titre="Stats" />
      <div className="rounded-2xl border border-bord bg-carte p-4 text-sm text-discret">
        Les graphiques de progression arrivent bientôt. En attendant, voici ton historique.
      </div>

      {terminees.length === 0 && <p className="mt-8 text-center text-discret">Aucune séance terminée pour l'instant.</p>}

      {[...parSemaine.entries()].sort((a, b) => b[0] - a[0]).map(([n, seances]) => (
        <Section key={n} titre={titreSemaine(n, seances)}>
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
