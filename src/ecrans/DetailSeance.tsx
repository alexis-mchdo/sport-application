import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { modifierRealisee, supprimerRealisee } from '../actionsSeance'
import { Bouton, Entete, Puce, Section } from '../composants/ui'
import { db, lireReglages } from '../db'
import { RESSENTIS } from '../data/ressentis'
import { NOM_ZONE } from '../logique/profil'
import { bilanSeance, formaterSeries } from '../logique/seance'
import type { ZoneCorps } from '../types'
import { SeanceEnCours } from './SeanceEnCours'


const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

/** Bilan d'une séance terminée (juste après la fin, ou depuis l'historique). */
export function DetailSeance({ id, retour, justeTerminee = false }: { id: string; retour: () => void; justeTerminee?: boolean }) {
  const seance = useLiveQuery(() => db.seancesRealisees.get(id), [id])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const reglages = useLiveQuery(lireReglages, [])
  const [modification, setModification] = useState(false)
  if (!seance || !exercices || !reglages) return null
  if (modification) return <SeanceEnCours id={id} modeEdition fermer={() => setModification(false)} />

  const exos = new Map(exercices.map((e) => [e.id, e]))
  const b = bilanSeance(seance)
  // Seules les séances de la semaine en cours sont modifiables ; les semaines clôturées sont figées.
  const modifiable = seance.semaine === reglages.semaine.numero
  const douleurs = seance.douleurs ?? []
  const basculerDouleur = (z: ZoneCorps) =>
    modifierRealisee(id, (s) => {
      const d = s.douleurs ?? []
      s.douleurs = d.includes(z) ? d.filter((x) => x !== z) : [...d, z]
    })

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

      <Section titre="Comment c'était ?" pied={modifiable ? "Ton ressenti servira au bilan de la semaine (et plus tard à l'IA)." : undefined}>
        <div className="grid grid-cols-5 gap-1 p-2">
          {RESSENTIS.map(([valeur, emoji, libelle]) => (
            <button
              key={valeur}
              disabled={!modifiable}
              onClick={() => modifierRealisee(id, (s) => (s.ressenti = s.ressenti === valeur ? undefined : valeur))}
              className={`flex flex-col items-center rounded-xl py-2 ${seance.ressenti === valeur ? 'bg-accent/20 ring-1 ring-accent' : modifiable ? '' : 'opacity-40'}`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="mt-1 text-[10px] text-discret">{libelle}</span>
            </button>
          ))}
        </div>
        {(modifiable || douleurs.length > 0) && (
          <>
            <p className="px-4 pt-3 text-sm text-discret">Une douleur ou une gêne ?</p>
            <div className="flex flex-wrap gap-2 p-3">
              {(Object.keys(NOM_ZONE) as ZoneCorps[])
                .filter((z) => modifiable || douleurs.includes(z))
                .map((z) => (
                  <Puce key={z} actif={douleurs.includes(z)} onClick={() => modifiable && basculerDouleur(z)}>
                    {NOM_ZONE[z]}
                  </Puce>
                ))}
            </div>
          </>
        )}
      </Section>

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
        {justeTerminee && <Bouton onClick={retour}>OK</Bouton>}
        {modifiable && (
          <Bouton variante="secondaire" onClick={() => setModification(true)}>
            Modifier les séries
          </Bouton>
        )}
        {!justeTerminee && modifiable && (
          <Bouton variante="danger" onClick={supprimer}>
            Supprimer la séance
          </Bouton>
        )}
        {!modifiable && <p className="text-center text-xs text-discret">Semaine clôturée : séance en lecture seule.</p>}
      </div>
    </div>
  )
}
