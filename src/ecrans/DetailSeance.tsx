import { useLiveQuery } from 'dexie-react-hooks'
import { supprimerRealisee } from '../actionsSeance'
import { Bouton, Entete, Section } from '../composants/ui'
import { db } from '../db'
import { bilanSeance, formaterSeries } from '../logique/seance'

const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

/** Bilan d'une séance terminée (juste après la fin, ou depuis l'historique). */
export function DetailSeance({ id, retour, justeTerminee = false }: { id: string; retour: () => void; justeTerminee?: boolean }) {
  const seance = useLiveQuery(() => db.seancesRealisees.get(id), [id])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  if (!seance || !exercices) return null
  const exos = new Map(exercices.map((e) => [e.id, e]))
  const b = bilanSeance(seance)

  const supprimer = async () => {
    if (!confirm('Supprimer cette séance de l’historique ?')) return
    retour()
    await supprimerRealisee(id)
  }

  return (
    <div className="pb-10">
      <Entete titre={justeTerminee ? 'Séance terminée 💪' : seance.nom} retour={justeTerminee ? undefined : retour} />
      <p className="px-1 text-sm text-discret first-letter:uppercase">
        {justeTerminee ? seance.nom : dateLongue(seance.date)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-bord bg-carte p-4">
          <p className="text-xs text-discret">Séries validées</p>
          <p className="text-2xl font-bold tabular-nums">
            {b.validees}
            <span className="text-base text-discret">/{b.total}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-bord bg-carte p-4">
          <p className="text-xs text-discret">Charge totale soulevée</p>
          <p className="text-2xl font-bold tabular-nums">
            {Math.round(b.tonnage).toLocaleString('fr-FR')}
            <span className="text-base text-discret"> kg</span>
          </p>
        </div>
      </div>

      {b.echecs.length > 0 && (
        <Section titre="À surveiller" pied="Ces séries seront prises en compte dans le bilan de fin de semaine pour ajuster tes charges.">
          {b.echecs.map((e, i) => (
            <div key={i} className="px-4 py-3 text-sm">
              <span className="text-amber-300">{exos.get(e.exerciceId)?.nom}</span>
              <span className="text-discret">
                {' '}
                — série {e.serie} : {e.detail}
              </span>
            </div>
          ))}
        </Section>
      )}

      <Section titre="Détail">
        {seance.exercices.map((e, i) => (
          <div key={i} className="px-4 py-3">
            <p>{exos.get(e.exerciceId)?.nom ?? 'Exercice supprimé'}</p>
            <p className="text-sm text-discret">{formaterSeries(e.series)}</p>
          </div>
        ))}
      </Section>

      {seance.note && (
        <Section titre="Note">
          <p className="px-4 py-3 text-sm whitespace-pre-wrap">{seance.note}</p>
        </Section>
      )}

      <div className="mt-6 space-y-3">
        {justeTerminee ? (
          <Bouton onClick={retour}>OK</Bouton>
        ) : (
          <Bouton variante="danger" onClick={supprimer}>
            Supprimer de l'historique
          </Bouton>
        )}
      </div>
    </div>
  )
}
