import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { modifierProgramme, modifierSeance } from '../actionsProgramme'
import { ListeExercices } from '../composants/ListeExercices'
import { Bouton, Compteur, Entete, Puce, Section } from '../composants/ui'
import { JOURS, NOM_JOUR_COURT } from '../data/jours'
import { db, lireReglages } from '../db'
import { prescriptionParDefaut, resumePrescription } from '../logique/programme'
import type { ExoPrevu } from '../types'

type Selecteur = { mode: 'ajout' } | { mode: 'remplacer'; index: number } | null

export function EditeurSeance({ programmeId, seanceId, retour }: { programmeId: string; seanceId: string; retour: () => void }) {
  const programme = useLiveQuery(() => db.programmes.get(programmeId), [programmeId])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const reglages = useLiveQuery(lireReglages, [])
  const [ouvert, setOuvert] = useState<number | null>(null)
  const [selecteur, setSelecteur] = useState<Selecteur>(null)

  const seance = programme?.seances.find((s) => s.id === seanceId)
  if (!programme || !exercices || !reglages || !seance) return null
  const exos = new Map(exercices.map((e) => [e.id, e]))
  const maj = (modifier: Parameters<typeof modifierSeance>[2]) => modifierSeance(programmeId, seanceId, modifier)

  if (selecteur) {
    const dejaLa = new Set(seance.exercices.map((e) => e.exerciceId))
    return (
      <div className="pb-6">
        <Entete
          titre={selecteur.mode === 'ajout' ? 'Ajouter un exercice' : 'Remplacer par…'}
          retour={() => setSelecteur(null)}
        />
        <ListeExercices
          chevron={false}
          droite={(e) => (dejaLa.has(e.id) ? <span className="text-xs">Déjà dans la séance</span> : null)}
          onChoisir={async (e) => {
            if (selecteur.mode === 'ajout') {
              await maj((s) => s.exercices.push(prescriptionParDefaut(e)))
              setOuvert(seance.exercices.length)
            } else {
              const i = selecteur.index
              await maj((s) => (s.exercices[i] = { ...s.exercices[i], exerciceId: e.id }))
            }
            setSelecteur(null)
          }}
        />
      </div>
    )
  }

  const renommer = () => {
    const nom = prompt('Nom de la séance', seance.nom)?.trim()
    if (nom) maj((s) => (s.nom = nom))
  }

  const deplacer = (i: number, sens: -1 | 1) => {
    const j = i + sens
    if (j < 0 || j >= seance.exercices.length) return
    maj((s) => ([s.exercices[i], s.exercices[j]] = [s.exercices[j], s.exercices[i]]))
    setOuvert(j)
  }

  const supprimerSeance = async () => {
    if (!confirm(`Supprimer la séance « ${seance.nom} » ?`)) return
    retour()
    await modifierProgramme(programmeId, (p) => (p.seances = p.seances.filter((s) => s.id !== seanceId)))
  }

  const petitBouton = 'flex-1 rounded-xl border border-bord py-2 text-sm active:bg-bord disabled:opacity-30'

  return (
    <div className="pb-10">
      <Entete
        titre={seance.nom}
        retour={retour}
        action={
          <button onClick={renommer} className="mb-1.5 shrink-0 text-sm text-accent">
            Renommer
          </button>
        }
      />

      {reglages.modePlanning === 'jourFixe' && (
        <Section titre="Jour">
          <div className="flex flex-wrap gap-2 p-3">
            {JOURS.map((j) => (
              <Puce key={j} actif={seance.jourSemaine === j} onClick={() => maj((s) => (s.jourSemaine = j))}>
                {NOM_JOUR_COURT[j]}
              </Puce>
            ))}
            <Puce actif={!seance.jourSemaine} onClick={() => maj((s) => (s.jourSemaine = undefined))}>
              Aucun
            </Puce>
          </div>
        </Section>
      )}

      <Section titre="Exercices" pied={seance.exercices.length > 0 ? 'Touche un exercice pour régler séries, répétitions et poids.' : undefined}>
        {seance.exercices.length === 0 && <p className="px-4 py-5 text-center text-sm text-discret">Aucun exercice pour l'instant.</p>}
        {seance.exercices.map((p, i) => {
          const e = exos.get(p.exerciceId)
          const estOuvert = ouvert === i
          const majExo = (champs: Partial<ExoPrevu>) => maj((s) => Object.assign(s.exercices[i], champs))
          return (
            <div key={`${p.exerciceId}-${i}`}>
              <button onClick={() => setOuvert(estOuvert ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="w-5 shrink-0 text-sm text-discret tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{e?.nom ?? 'Exercice supprimé'}</p>
                  <p className={`truncate text-xs ${p.poidsKg === 0 && e?.equipement !== 'poids_du_corps' ? 'text-amber-300' : 'text-discret'}`}>
                    {resumePrescription(p, e)}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" className={`h-5 w-5 text-discret transition-transform ${estOuvert ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {estOuvert && (
                <div className="space-y-4 border-t border-bord bg-fond/40 px-3 py-4">
                  <div className="flex justify-between gap-1">
                    <Compteur libelle="Séries" valeur={p.series} min={1} max={10} onChange={(series) => majExo({ series })} />
                    <Compteur libelle="Reps" valeur={p.reps} min={1} max={50} onChange={(reps) => majExo({ reps })} />
                  </div>
                  <div className="flex justify-center">
                    <Compteur
                      libelle="Poids"
                      valeur={p.poidsKg}
                      pas={e?.incrementKg ?? 2.5}
                      max={500}
                      suffixe=" kg"
                      onChange={(poidsKg) => majExo({ poidsKg })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className={petitBouton} disabled={i === 0} onClick={() => deplacer(i, -1)} aria-label="Monter">
                      ↑
                    </button>
                    <button className={petitBouton} disabled={i === seance.exercices.length - 1} onClick={() => deplacer(i, 1)} aria-label="Descendre">
                      ↓
                    </button>
                    <button className={petitBouton} onClick={() => setSelecteur({ mode: 'remplacer', index: i })}>
                      Remplacer
                    </button>
                    <button
                      className={`${petitBouton} text-red-400`}
                      onClick={() => {
                        maj((s) => s.exercices.splice(i, 1))
                        setOuvert(null)
                      }}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </Section>

      <div className="mt-3 space-y-3">
        <Bouton onClick={() => setSelecteur({ mode: 'ajout' })}>+ Ajouter un exercice</Bouton>
        <Bouton variante="danger" onClick={supprimerSeance}>
          Supprimer la séance
        </Bouton>
      </div>
    </div>
  )
}
