import type { Programme } from '../types'

// Modèles de programmes proposés à la création.
// Chaque exercice : [id bibliothèque, séries, répétitions]

type ExoModele = [string, number, number]
interface SeanceModele {
  nom: string
  exercices: ExoModele[]
}
export interface Modele {
  id: string
  nom: string
  jours: number
  description: string
  seances: SeanceModele[]
}

/** Jours attribués par défaut selon le nombre de séances (1 = lundi). */
export const JOURS_PAR_DEFAUT: Record<number, number[]> = {
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
}

const PUSH_A: SeanceModele = {
  nom: 'Push',
  exercices: [
    ['developpe-couche-barre', 4, 8],
    ['developpe-epaules-halteres', 3, 10],
    ['developpe-incline-halteres', 4, 10],
    ['elevations-laterales-halteres', 5, 12],
    ['ecarte-poulie', 3, 12],
    ['extension-triceps-corde', 3, 12],
    ['extension-nuque-haltere', 2, 12],
  ],
}
const PULL_A: SeanceModele = {
  nom: 'Pull',
  exercices: [
    ['tractions-pronation', 4, 8],
    ['rowing-barre', 4, 8],
    ['tirage-horizontal', 3, 10],
    ['face-pull', 3, 15],
    ['curl-barre-ez', 3, 10],
    ['curl-marteau', 3, 12],
  ],
}
const LEGS_A: SeanceModele = {
  nom: 'Legs',
  exercices: [
    ['squat', 4, 8],
    ['souleve-de-terre-roumain', 4, 8],
    ['presse-cuisses', 3, 10],
    ['extension-jambes', 3, 12],
    ['leg-curl-assis', 4, 12],
    ['mollets-debout', 5, 12],
    ['crunch-poulie', 4, 12],
  ],
}
const PUSH_B: SeanceModele = {
  nom: 'Push B',
  exercices: [
    ['developpe-incline-barre', 4, 8],
    ['developpe-pectoraux-machine', 3, 10],
    ['developpe-militaire', 3, 8],
    ['elevations-laterales-poulie', 4, 15],
    ['ecarte-poulie', 3, 12],
    ['extension-nuque-poulie', 3, 12],
  ],
}
const PULL_B: SeanceModele = {
  nom: 'Pull B',
  exercices: [
    ['rowing-haltere', 4, 10],
    ['tirage-vertical', 4, 10],
    ['rowing-machine', 3, 10],
    ['reverse-pec-deck', 3, 15],
    ['curl-incline', 3, 12],
    ['curl-poulie', 3, 12],
  ],
}
const LEGS_B: SeanceModele = {
  nom: 'Legs B',
  exercices: [
    ['hack-squat', 4, 10],
    ['souleve-de-terre-roumain-halteres', 3, 10],
    ['fentes-halteres', 3, 10],
    ['leg-curl-allonge', 3, 12],
    ['hip-thrust', 3, 10],
    ['mollets-assis', 4, 15],
    ['crunch', 3, 15],
  ],
}
const UPPER_A: SeanceModele = {
  nom: 'Upper A',
  exercices: [
    ['developpe-couche-barre', 4, 6],
    ['rowing-barre', 4, 8],
    ['developpe-epaules-halteres', 3, 10],
    ['tirage-vertical', 3, 10],
    ['elevations-laterales-halteres', 4, 15],
    ['curl-halteres', 3, 12],
    ['extension-triceps-corde', 3, 12],
  ],
}
const LOWER_A: SeanceModele = {
  nom: 'Lower A',
  exercices: [
    ['squat', 4, 6],
    ['souleve-de-terre-roumain', 4, 8],
    ['presse-cuisses', 3, 10],
    ['leg-curl-assis', 3, 12],
    ['mollets-debout', 4, 12],
    ['crunch-poulie', 3, 12],
  ],
}
const UPPER_B: SeanceModele = {
  nom: 'Upper B',
  exercices: [
    ['developpe-incline-halteres', 4, 10],
    ['tractions-pronation', 4, 8],
    ['tirage-horizontal', 3, 10],
    ['ecarte-poulie', 2, 12],
    ['elevations-laterales-poulie', 3, 15],
    ['face-pull', 3, 15],
    ['curl-marteau', 3, 12],
    ['barre-au-front', 3, 10],
  ],
}
const LOWER_B: SeanceModele = {
  nom: 'Lower B',
  exercices: [
    ['souleve-de-terre', 3, 5],
    ['fentes-bulgares', 3, 10],
    ['extension-jambes', 3, 12],
    ['leg-curl-allonge', 3, 12],
    ['hip-thrust', 3, 10],
    ['mollets-assis', 4, 15],
    ['releve-jambes-suspendu', 3, 12],
  ],
}

export const MODELES: Modele[] = [
  {
    id: 'full-body-3',
    nom: 'Full Body',
    jours: 3,
    description: 'Tout le corps à chaque séance. Idéal pour 3 séances par semaine.',
    seances: [
      {
        nom: 'Full Body A',
        exercices: [
          ['squat', 4, 8],
          ['developpe-couche-barre', 4, 8],
          ['rowing-barre', 3, 8],
          ['leg-curl-assis', 3, 12],
          ['elevations-laterales-halteres', 4, 15],
          ['curl-halteres', 2, 12],
          ['extension-triceps-corde', 2, 12],
          ['releve-jambes-suspendu', 2, 12],
        ],
      },
      {
        nom: 'Full Body B',
        exercices: [
          ['souleve-de-terre-roumain', 3, 8],
          ['developpe-militaire', 3, 8],
          ['tractions-pronation', 4, 8],
          ['presse-cuisses', 3, 10],
          ['face-pull', 3, 15],
          ['mollets-debout', 3, 12],
          ['crunch-poulie', 3, 12],
        ],
      },
      {
        nom: 'Full Body C',
        exercices: [
          ['fentes-bulgares', 3, 10],
          ['developpe-incline-halteres', 4, 10],
          ['tirage-horizontal', 3, 10],
          ['hip-thrust', 3, 10],
          ['leg-curl-allonge', 3, 12],
          ['elevations-laterales-poulie', 4, 15],
          ['curl-marteau', 2, 12],
          ['extension-nuque-haltere', 2, 12],
          ['mollets-assis', 3, 15],
        ],
      },
    ],
  },
  {
    id: 'ppl-3',
    nom: 'Push / Pull / Legs',
    jours: 3,
    description: 'Poussée, tirage, jambes : chaque muscle une fois par semaine, séances plus longues.',
    seances: [PUSH_A, PULL_A, LEGS_A],
  },
  {
    id: 'upper-lower-4',
    nom: 'Upper / Lower',
    jours: 4,
    description: 'Haut du corps / bas du corps, deux fois chacun. Très équilibré.',
    seances: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
  },
  {
    id: 'ppl-ul-5',
    nom: 'PPL + Upper / Lower',
    jours: 5,
    description: 'Push, Pull, Legs puis Upper et Lower : chaque muscle deux fois par semaine.',
    seances: [PUSH_A, PULL_A, LEGS_A, UPPER_B, LOWER_B],
  },
  {
    id: 'ppl-6',
    nom: 'Push / Pull / Legs ×2',
    jours: 6,
    description: 'Deux cycles PPL avec des exercices différents. Volume élevé.',
    seances: [
      { ...PUSH_A, nom: 'Push A' },
      { ...PULL_A, nom: 'Pull A' },
      { ...LEGS_A, nom: 'Legs A' },
      PUSH_B,
      PULL_B,
      LEGS_B,
    ],
  },
]

export function creerProgrammeDepuisModele(modele: Modele): Programme {
  const jours = JOURS_PAR_DEFAUT[modele.jours]
  return {
    id: crypto.randomUUID(),
    nom: modele.nom,
    joursParSemaine: modele.jours,
    actif: true,
    seances: modele.seances.map((s, i) => ({
      id: crypto.randomUUID(),
      nom: s.nom,
      ordre: i,
      jourSemaine: jours[i],
      exercices: s.exercices.map(([exerciceId, series, reps]) => ({ exerciceId, series, reps, poidsKg: 0 })),
    })),
  }
}

export function creerProgrammeVide(jours: number): Programme {
  return { id: crypto.randomUUID(), nom: 'Mon programme', joursParSemaine: jours, actif: true, seances: [] }
}
