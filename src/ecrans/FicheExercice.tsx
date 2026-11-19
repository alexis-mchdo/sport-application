import { useState } from 'react'
import { Bouton, Entete, Puce, Section, Segmente } from '../composants/ui'
import { EQUIPEMENTS, MUSCLES, NOM_EQUIPEMENT, NOM_MUSCLE } from '../data/muscles'
import { db } from '../db'
import type { Exercice, Muscle } from '../types'

const INCREMENTS = [1, 1.25, 2, 2.5, 4, 5]

function nouvelExercice(): Exercice {
  return {
    id: `perso-${crypto.randomUUID()}`,
    nom: '',
    musclesPrincipaux: [],
    musclesSecondaires: [],
    type: 'poly',
    equipement: 'halteres',
    incrementKg: 2,
    perso: true,
  }
}

/** Fiche d'un exercice. Lecture seule pour la bibliothèque fournie, modifiable pour les exercices perso. */
export function FicheExercice({ exercice, fermer }: { exercice?: Exercice; fermer: () => void }) {
  const [brouillon, setBrouillon] = useState<Exercice>(exercice ?? nouvelExercice())
  const modifiable = brouillon.perso
  const estNouveau = !exercice || exercice.id !== brouillon.id

  const maj = (champs: Partial<Exercice>) => setBrouillon((b) => ({ ...b, ...champs }))

  // Un tap fait tourner : aucun → principal → secondaire → aucun
  const basculerMuscle = (m: Muscle) => {
    const { musclesPrincipaux: p, musclesSecondaires: s } = brouillon
    if (p.includes(m)) maj({ musclesPrincipaux: p.filter((x) => x !== m), musclesSecondaires: [...s, m] })
    else if (s.includes(m)) maj({ musclesSecondaires: s.filter((x) => x !== m) })
    else maj({ musclesPrincipaux: [...p, m] })
  }

  const creerVariante = () =>
    setBrouillon({ ...brouillon, id: `perso-${crypto.randomUUID()}`, nom: `${brouillon.nom} (perso)`, perso: true })

  const valide = brouillon.nom.trim().length > 0 && brouillon.musclesPrincipaux.length > 0

  const enregistrer = async () => {
    await db.exercices.put({ ...brouillon, nom: brouillon.nom.trim() })
    fermer()
  }

  const supprimer = async () => {
    const id = brouillon.id
    const programmes = await db.programmes.toArray()
    const dansProgramme = programmes.some((p) => p.seances.some((s) => s.exercices.some((e) => e.exerciceId === id)))
    const dansHistorique = await db.seancesRealisees.filter((s) => s.exercices.some((e) => e.exerciceId === id)).count()
    if (dansProgramme || dansHistorique) {
      alert('Cet exercice est utilisé dans un programme ou dans ton historique : il ne peut pas être supprimé.')
      return
    }
    if (!confirm(`Supprimer « ${brouillon.nom} » ?`)) return
    await db.exercices.delete(id)
    fermer()
  }

  return (
    <div className="pb-10">
      <Entete titre={estNouveau && modifiable ? 'Nouvel exercice' : 'Exercice'} retour={fermer} />

      <Section titre="Nom">
        {modifiable ? (
          <input
            value={brouillon.nom}
            onChange={(e) => maj({ nom: e.target.value })}
            placeholder="Ex. Développé couché Smith"
            className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-discret"
          />
        ) : (
          <p className="px-4 py-3 font-semibold">{brouillon.nom}</p>
        )}
      </Section>

      <Section titre="Type">
        <div className="p-2">
          {modifiable ? (
            <Segmente
              options={[
                { valeur: 'poly', libelle: 'Polyarticulaire' },
                { valeur: 'isolation', libelle: 'Isolation' },
              ]}
              valeur={brouillon.type}
              onChange={(type) => maj({ type })}
            />
          ) : (
            <p className="px-2 py-1">{brouillon.type === 'poly' ? 'Polyarticulaire' : 'Isolation'}</p>
          )}
        </div>
      </Section>

      <Section titre="Équipement">
        <div className="flex flex-wrap gap-2 p-3">
          {(modifiable ? EQUIPEMENTS : [brouillon.equipement]).map((eq) => (
            <Puce key={eq} actif={brouillon.equipement === eq} onClick={() => modifiable && maj({ equipement: eq })}>
              {NOM_EQUIPEMENT[eq]}
            </Puce>
          ))}
        </div>
      </Section>

      <Section
        titre="Muscles"
        pied={modifiable ? '1 tap = principal (plein), 2 taps = secondaire (contour), 3 taps = retiré.' : undefined}
      >
        <div className="flex flex-wrap gap-2 p-3">
          {MUSCLES.filter(
            (m) => modifiable || brouillon.musclesPrincipaux.includes(m) || brouillon.musclesSecondaires.includes(m),
          ).map((m) => {
            const principal = brouillon.musclesPrincipaux.includes(m)
            const secondaire = brouillon.musclesSecondaires.includes(m)
            return (
              <Puce
                key={m}
                actif={principal || secondaire}
                variante={principal ? 'accent' : 'secondaire'}
                onClick={() => modifiable && basculerMuscle(m)}
              >
                {NOM_MUSCLE[m]}
                {!modifiable && secondaire && ' (sec.)'}
              </Puce>
            )
          })}
        </div>
      </Section>

      <Section titre="Progression" pied="Poids ajouté quand toutes les séries de la semaine sont validées.">
        <div className="flex flex-wrap gap-2 p-3">
          {(modifiable ? INCREMENTS : [brouillon.incrementKg]).map((i) => (
            <Puce key={i} actif={brouillon.incrementKg === i} onClick={() => modifiable && maj({ incrementKg: i })}>
              +{i.toLocaleString('fr-FR')} kg
            </Puce>
          ))}
        </div>
      </Section>

      <div className="mt-8 space-y-3">
        {modifiable ? (
          <>
            <Bouton onClick={enregistrer} disabled={!valide}>
              Enregistrer
            </Bouton>
            {!estNouveau && (
              <Bouton variante="danger" onClick={supprimer}>
                Supprimer
              </Bouton>
            )}
          </>
        ) : (
          <>
            <Bouton variante="secondaire" onClick={creerVariante}>
              Créer une variante perso
            </Bouton>
            <p className="px-1 text-center text-xs text-discret">Les exercices de la bibliothèque ne sont pas modifiables.</p>
          </>
        )}
      </div>
    </div>
  )
}
