// Modèle de données — voir docs/CONCEPTION.md §5

export type Muscle =
  | 'pectoraux'
  | 'dos'
  | 'trapezes'
  | 'epaules_avant'
  | 'epaules_laterales'
  | 'epaules_arriere'
  | 'biceps'
  | 'triceps'
  | 'avant_bras'
  | 'abdos'
  | 'quadriceps'
  | 'ischios'
  | 'fessiers'
  | 'mollets'

export type TypeExercice = 'poly' | 'isolation'

export type Equipement = 'barre' | 'halteres' | 'machine' | 'poulie' | 'poids_du_corps' | 'kettlebell'

export interface Exercice {
  id: string
  nom: string
  musclesPrincipaux: Muscle[]
  musclesSecondaires: Muscle[]
  type: TypeExercice
  equipement: Equipement
  incrementKg: number
  /** true = créé par l'utilisateur (modifiable, exporté) ; false = bibliothèque fournie */
  perso: boolean
}

export interface ExoPrevu {
  exerciceId: string
  series: number
  reps: number
  poidsKg: number
}

export interface Seance {
  id: string
  nom: string
  ordre: number
  /** 1 = lundi … 7 = dimanche */
  jourSemaine?: number
  exercices: ExoPrevu[]
}

export interface Programme {
  id: string
  nom: string
  joursParSemaine: number
  actif: boolean
  seances: Seance[]
}

export interface Serie {
  repsPrevues: number
  poidsKg: number
  repsFaites: number
  validee: boolean
}

export interface ExoRealise {
  exerciceId: string
  series: Serie[]
}

export interface SeanceRealisee {
  id: string
  /** ISO 8601 */
  date: string
  seanceId?: string
  nom: string
  exercices: ExoRealise[]
  note?: string
}

export interface DecisionProgression {
  exerciceId: string
  ancienPoids: number
  nouveauPoids: number
}

export interface BilanSemaine {
  /** ex. 2026-W47 */
  semaine: string
  decisions: DecisionProgression[]
}

export type ModePlanning = 'jourFixe' | 'ordre'

export interface Reglage {
  cle: string
  valeur: unknown
}
