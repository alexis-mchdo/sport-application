import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { modifierProgramme, modifierSeance } from '../actionsProgramme'
import { JaugeEquilibre } from '../composants/JaugeEquilibre'
import { Bouton, Entete, Ligne, Section, Toast } from '../composants/ui'
import { useToast } from '../composants/useToast'
import { JOURS, NOM_JOUR_COURT } from '../data/jours'
import { NOM_COURT_MUSCLE } from '../data/muscles'
import { db, lireReglages } from '../db'
import { indexer } from '../logique/equilibre'
import { choisirSeancePour, nouvelleSeance, prescriptionParDefaut, seancesTriees } from '../logique/programme'
import type { Exercice, Seance } from '../types'
import { AssistantProgramme } from './AssistantProgramme'
import { EditeurSeance } from './EditeurSeance'
import { DemanderClaude } from './DemanderClaude'
import { ImporterProgramme } from './ImporterProgramme'
import { ListeProgrammes } from './ListeProgrammes'

type SousEcran = { type: 'seance'; id: string } | { type: 'liste' } | { type: 'assistant' } | { type: 'claude' } | { type: 'importer' } | null

/** Muscles principaux d'une séance, du plus travaillé au moins travaillé. */
function resumeMuscles(seance: Seance, exos: Map<string, Exercice>) {
  const compte = new Map<string, number>()
  for (const { exerciceId, series } of seance.exercices)
    for (const m of exos.get(exerciceId)?.musclesPrincipaux ?? []) compte.set(m, (compte.get(m) ?? 0) + series)
  return [...compte.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([m]) => NOM_COURT_MUSCLE[m as keyof typeof NOM_COURT_MUSCLE])
    .join(', ')
}

export function Programme() {
  const [sousEcran, setSousEcran] = useState<SousEcran>(null)
  const programmes = useLiveQuery(() => db.programmes.toArray(), [])
  const exercices = useLiveQuery(() => db.exercices.toArray(), [])
  const reglages = useLiveQuery(lireReglages, [])
  const toast = useToast()

  if (!programmes || !exercices || !reglages) return null
  const fermer = () => setSousEcran(null)

  if (sousEcran?.type === 'assistant' || (programmes.length === 0 && sousEcran?.type !== 'liste'))
    return <AssistantProgramme retour={programmes.length > 0 ? fermer : undefined} apresCreation={fermer} />
  if (sousEcran?.type === 'liste')
    return <ListeProgrammes retour={fermer} nouveau={() => setSousEcran({ type: 'assistant' })} />

  if (sousEcran?.type === 'claude') return <DemanderClaude retour={fermer} typeInitial="programme" modeInitial="adapter" />
  if (sousEcran?.type === 'importer') return <ImporterProgramme retour={fermer} apresImport={fermer} />

  const programme = programmes.find((p) => p.actif) ?? programmes[0]
  if (sousEcran?.type === 'seance' && programme.seances.some((s) => s.id === sousEcran.id))
    return <EditeurSeance programmeId={programme.id} seanceId={sousEcran.id} retour={fermer} />

  const exos = indexer(exercices)
  const jourFixe = reglages.modePlanning === 'jourFixe'
  const seances = seancesTriees(programme, jourFixe)

  const ajouterSeance = async () => {
    const s = nouvelleSeance(programme, jourFixe)
    await modifierProgramme(programme.id, (p) => p.seances.push(s))
    setSousEcran({ type: 'seance', id: s.id })
  }

  const ajouterSuggestion = async (exerciceId: string, muscle: Parameters<typeof choisirSeancePour>[1] | undefined) => {
    const e = exos.get(exerciceId)
    if (!e) return
    const cible = choisirSeancePour(programme, muscle ?? e.musclesPrincipaux[0], exos)
    if (!cible) return
    await modifierSeance(programme.id, cible.id, (s) => s.exercices.push(prescriptionParDefaut(e)))
    toast.afficher(`${e.nom} ajouté à ${cible.nom}`)
  }

  const ligneSeance = (s: Seance, prefixe: string) => (
    <Ligne key={s.id} onClick={() => setSousEcran({ type: 'seance', id: s.id })} chevron>
      <div className="flex items-baseline gap-3">
        <span className="w-9 shrink-0 text-xs font-semibold text-accent uppercase">{prefixe}</span>
        <div className="min-w-0">
          <p className="truncate font-medium">{s.nom}</p>
          <p className="truncate text-xs text-discret">
            {s.exercices.length === 0
              ? 'Aucun exercice'
              : `${s.exercices.length} exercice${s.exercices.length > 1 ? 's' : ''} · ${resumeMuscles(s, exos)}`}
          </p>
        </div>
      </div>
    </Ligne>
  )

  const sansJour = seances.filter((s) => !s.jourSemaine)

  return (
    <div className="pb-6">
      <Entete
        titre={programme.nom}
        action={
          <button onClick={() => setSousEcran({ type: 'liste' })} className="mb-1.5 shrink-0 text-sm text-accent">
            Programmes
          </button>
        }
      />

      {jourFixe ? (
        <Section titre="Semaine">
          {JOURS.flatMap((j) => {
            const duJour = seances.filter((s) => s.jourSemaine === j)
            if (duJour.length === 0)
              return [
                <div key={j} className="flex min-h-11 items-center gap-3 px-4 py-2 text-discret/60">
                  <span className="w-9 text-xs font-semibold uppercase">{NOM_JOUR_COURT[j]}</span>
                  <span className="text-sm">Repos</span>
                </div>,
              ]
            return duJour.map((s) => ligneSeance(s, NOM_JOUR_COURT[j]))
          })}
        </Section>
      ) : (
        <Section titre="Séances (dans l'ordre)">{seances.map((s, i) => ligneSeance(s, String(i + 1)))}</Section>
      )}

      {jourFixe && sansJour.length > 0 && (
        <Section titre="Sans jour attribué">{sansJour.map((s) => ligneSeance(s, '—'))}</Section>
      )}

      <div className="mt-3">
        <Bouton variante="secondaire" onClick={ajouterSeance}>
          + Ajouter une séance
        </Bouton>
      </div>

      <JaugeEquilibre
        programme={programme}
        exercices={exercices}
        mode={reglages.modePlanning}
        onAjouter={(id, alerte) => ajouterSuggestion(id, alerte.muscle)}
      />

      <Section titre="Avec Claude" pied="Claude te renvoie un programme à recoller ici ; l'app le vérifie avant de l'utiliser.">
        <Ligne onClick={() => setSousEcran({ type: 'claude' })} chevron>
          Créer / adapter avec Claude
        </Ligne>
        <Ligne onClick={() => setSousEcran({ type: 'importer' })} chevron>
          Importer la réponse de Claude
        </Ligne>
      </Section>

      <Toast message={toast.message} />
    </div>
  )
}
