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
  /** Poids prévu par le programme (pour repérer une baisse de charge en séance) */
  poidsPrevuKg: number
  /** Poids réellement utilisé */
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
  /** true tant que la séance n'est pas terminée (reprise possible après fermeture de l'app) */
  enCours?: boolean
  /** ISO 8601 de fin */
  fin?: string
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

// Profil — sert à cibler les conseils (et plus tard l'IA)

export type Sexe = 'homme' | 'femme' | 'autre'
export type Niveau = 'debutant' | 'intermediaire' | 'avance'
export type Objectif = 'muscle' | 'force' | 'seche' | 'recomposition' | 'forme' | 'sante'
export type Lieu = 'salle_complete' | 'salle_basique' | 'maison'
export type Niveau3 = 'faible' | 'moyen' | 'eleve'
export type ZoneCorps =
  | 'cou'
  | 'epaule'
  | 'coude'
  | 'poignet'
  | 'haut_du_dos'
  | 'bas_du_dos'
  | 'hanche'
  | 'genou'
  | 'cheville'
  | 'autre'
export type Cote = 'gauche' | 'droite' | 'les_deux'
export type Gravite = 'gene' | 'douleur' | 'blessure'

export interface Blessure {
  id: string
  zone: ZoneCorps
  cote: Cote
  gravite: Gravite
  /** true = actuelle ; false = ancienne (à surveiller) */
  active: boolean
  note: string
}

export interface Profil {
  sexe?: Sexe
  anneeNaissance?: number
  tailleCm?: number
  poidsKg?: number
  niveau?: Niveau
  anneesPratique?: number
  objectif?: Objectif
  musclesPrioritaires: Muscle[]
  seancesParSemaine?: number
  dureeSeanceMin?: number
  joursDisponibles: number[]
  lieu?: Lieu
  equipements: Equipement[]
  blessures: Blessure[]
  exercicesAEviter: string[]
  exercicesPreferes: string[]
  sommeilHeures?: number
  stress?: Niveau3
  activiteQuotidienne?: Niveau3
  /** Records actuels (charge max sur 1 à 5 reps), en kg — tractions : nombre de reps max */
  records: Partial<Record<'squat' | 'developpe_couche' | 'souleve_de_terre' | 'developpe_militaire' | 'tractions', number>>
  notes: string
}
