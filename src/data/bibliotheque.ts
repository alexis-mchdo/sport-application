import type { Equipement, Exercice, Muscle, TypeExercice } from '../types'

// Bibliothèque fournie. Les identifiants sont stables : ne jamais les renommer
// (les programmes et l'historique y font référence).

const INCREMENT: Record<Equipement, number> = {
  barre: 2.5,
  halteres: 2,
  machine: 2.5,
  poulie: 2.5,
  poids_du_corps: 2.5,
  kettlebell: 4,
}

function exo(
  id: string,
  nom: string,
  type: TypeExercice,
  equipement: Equipement,
  musclesPrincipaux: Muscle[],
  musclesSecondaires: Muscle[] = [],
): Exercice {
  return { id, nom, type, equipement, musclesPrincipaux, musclesSecondaires, incrementKg: INCREMENT[equipement], perso: false }
}

export const BIBLIOTHEQUE: Exercice[] = [
  // Pectoraux
  exo('developpe-couche-barre', 'Développé couché (barre)', 'poly', 'barre', ['pectoraux'], ['triceps', 'epaules_avant']),
  exo('developpe-couche-halteres', 'Développé couché (haltères)', 'poly', 'halteres', ['pectoraux'], ['triceps', 'epaules_avant']),
  exo('developpe-incline-barre', 'Développé incliné (barre)', 'poly', 'barre', ['pectoraux'], ['epaules_avant', 'triceps']),
  exo('developpe-incline-halteres', 'Développé incliné (haltères)', 'poly', 'halteres', ['pectoraux'], ['epaules_avant', 'triceps']),
  exo('developpe-decline-barre', 'Développé décliné (barre)', 'poly', 'barre', ['pectoraux'], ['triceps']),
  exo('developpe-pectoraux-machine', 'Développé pectoraux (machine)', 'poly', 'machine', ['pectoraux'], ['triceps', 'epaules_avant']),
  exo('dips-pectoraux', 'Dips (buste penché)', 'poly', 'poids_du_corps', ['pectoraux', 'triceps'], ['epaules_avant']),
  exo('pompes', 'Pompes', 'poly', 'poids_du_corps', ['pectoraux'], ['triceps', 'epaules_avant']),
  exo('ecarte-halteres', 'Écarté couché (haltères)', 'isolation', 'halteres', ['pectoraux'], ['epaules_avant']),
  exo('ecarte-poulie', 'Écarté vis-à-vis (poulie)', 'isolation', 'poulie', ['pectoraux'], ['epaules_avant']),
  exo('pec-deck', 'Pec deck (machine)', 'isolation', 'machine', ['pectoraux']),

  // Dos
  exo('tractions-pronation', 'Tractions (pronation)', 'poly', 'poids_du_corps', ['dos'], ['biceps', 'trapezes', 'avant_bras']),
  exo('tractions-supination', 'Tractions (supination)', 'poly', 'poids_du_corps', ['dos', 'biceps'], ['avant_bras']),
  exo('tirage-vertical', 'Tirage vertical (poulie)', 'poly', 'poulie', ['dos'], ['biceps', 'trapezes']),
  exo('tirage-vertical-serre', 'Tirage vertical prise serrée', 'poly', 'poulie', ['dos'], ['biceps']),
  exo('rowing-barre', 'Rowing barre', 'poly', 'barre', ['dos', 'trapezes'], ['biceps', 'epaules_arriere']),
  exo('rowing-haltere', 'Rowing haltère (un bras)', 'poly', 'halteres', ['dos'], ['trapezes', 'biceps', 'epaules_arriere']),
  exo('tirage-horizontal', 'Tirage horizontal (poulie)', 'poly', 'poulie', ['dos', 'trapezes'], ['biceps', 'epaules_arriere']),
  exo('rowing-t-bar', 'Rowing T-bar', 'poly', 'barre', ['dos', 'trapezes'], ['biceps', 'epaules_arriere']),
  exo('rowing-machine', 'Rowing (machine)', 'poly', 'machine', ['dos', 'trapezes'], ['biceps', 'epaules_arriere']),
  exo('pullover-poulie', 'Pull-over (poulie)', 'isolation', 'poulie', ['dos']),
  exo('souleve-de-terre', 'Soulevé de terre', 'poly', 'barre', ['fessiers', 'ischios'], ['dos', 'trapezes', 'quadriceps', 'avant_bras']),
  exo('shrugs-halteres', 'Shrugs (haltères)', 'isolation', 'halteres', ['trapezes'], ['avant_bras']),
  exo('shrugs-barre', 'Shrugs (barre)', 'isolation', 'barre', ['trapezes'], ['avant_bras']),

  // Épaules
  exo('developpe-militaire', 'Développé militaire (barre)', 'poly', 'barre', ['epaules_avant'], ['epaules_laterales', 'triceps']),
  exo('developpe-epaules-halteres', 'Développé épaules (haltères)', 'poly', 'halteres', ['epaules_avant'], ['epaules_laterales', 'triceps']),
  exo('developpe-epaules-machine', 'Développé épaules (machine)', 'poly', 'machine', ['epaules_avant'], ['epaules_laterales', 'triceps']),
  exo('developpe-arnold', 'Développé Arnold', 'poly', 'halteres', ['epaules_avant'], ['epaules_laterales', 'triceps']),
  exo('elevations-laterales-halteres', 'Élévations latérales (haltères)', 'isolation', 'halteres', ['epaules_laterales']),
  exo('elevations-laterales-poulie', 'Élévations latérales (poulie)', 'isolation', 'poulie', ['epaules_laterales']),
  exo('elevations-laterales-machine', 'Élévations latérales (machine)', 'isolation', 'machine', ['epaules_laterales']),
  exo('elevations-frontales', 'Élévations frontales (haltères)', 'isolation', 'halteres', ['epaules_avant']),
  exo('tirage-menton', 'Tirage menton', 'poly', 'barre', ['epaules_laterales', 'trapezes'], ['biceps']),
  exo('oiseau-halteres', 'Oiseau (haltères)', 'isolation', 'halteres', ['epaules_arriere'], ['trapezes']),
  exo('reverse-pec-deck', 'Pec deck inversé (machine)', 'isolation', 'machine', ['epaules_arriere'], ['trapezes']),
  exo('face-pull', 'Face pull (poulie)', 'isolation', 'poulie', ['epaules_arriere'], ['trapezes']),

  // Biceps
  exo('curl-barre', 'Curl barre', 'isolation', 'barre', ['biceps'], ['avant_bras']),
  exo('curl-barre-ez', 'Curl barre EZ', 'isolation', 'barre', ['biceps'], ['avant_bras']),
  exo('curl-halteres', 'Curl haltères', 'isolation', 'halteres', ['biceps'], ['avant_bras']),
  exo('curl-marteau', 'Curl marteau', 'isolation', 'halteres', ['biceps'], ['avant_bras']),
  exo('curl-incline', 'Curl incliné (haltères)', 'isolation', 'halteres', ['biceps']),
  exo('curl-pupitre', 'Curl pupitre', 'isolation', 'machine', ['biceps']),
  exo('curl-poulie', 'Curl (poulie)', 'isolation', 'poulie', ['biceps']),
  exo('curl-concentre', 'Curl concentré', 'isolation', 'halteres', ['biceps']),

  // Triceps
  exo('developpe-couche-serre', 'Développé couché prise serrée', 'poly', 'barre', ['triceps'], ['pectoraux', 'epaules_avant']),
  exo('dips-triceps', 'Dips (buste droit)', 'poly', 'poids_du_corps', ['triceps'], ['pectoraux', 'epaules_avant']),
  exo('dips-banc', 'Dips entre deux bancs', 'poly', 'poids_du_corps', ['triceps'], ['epaules_avant']),
  exo('barre-au-front', 'Barre au front', 'isolation', 'barre', ['triceps']),
  exo('extension-triceps-poulie', 'Extension triceps (poulie, barre)', 'isolation', 'poulie', ['triceps']),
  exo('extension-triceps-corde', 'Extension triceps (poulie, corde)', 'isolation', 'poulie', ['triceps']),
  exo('extension-nuque-haltere', 'Extension nuque (haltère)', 'isolation', 'halteres', ['triceps']),
  exo('extension-nuque-poulie', 'Extension nuque (poulie)', 'isolation', 'poulie', ['triceps']),
  exo('kickback-triceps', 'Kickback triceps (haltère)', 'isolation', 'halteres', ['triceps']),

  // Avant-bras
  exo('curl-poignets', 'Curl poignets', 'isolation', 'barre', ['avant_bras']),
  exo('curl-inverse', 'Curl inversé', 'isolation', 'barre', ['avant_bras'], ['biceps']),
  exo('marche-fermier', 'Marche du fermier', 'poly', 'halteres', ['avant_bras', 'trapezes'], ['abdos']),

  // Abdominaux
  exo('crunch', 'Crunch', 'isolation', 'poids_du_corps', ['abdos']),
  exo('crunch-poulie', 'Crunch à la poulie', 'isolation', 'poulie', ['abdos']),
  exo('crunch-machine', 'Crunch (machine)', 'isolation', 'machine', ['abdos']),
  exo('releve-jambes-suspendu', 'Relevé de jambes suspendu', 'isolation', 'poids_du_corps', ['abdos'], ['avant_bras']),
  exo('roue-abdominale', 'Roue abdominale', 'isolation', 'poids_du_corps', ['abdos']),
  exo('gainage', 'Gainage planche (reps = secondes)', 'isolation', 'poids_du_corps', ['abdos']),
  exo('rotation-russe', 'Rotations russes', 'isolation', 'poids_du_corps', ['abdos']),

  // Quadriceps
  exo('squat', 'Squat (barre)', 'poly', 'barre', ['quadriceps', 'fessiers'], ['abdos']),
  exo('squat-avant', 'Squat avant (front squat)', 'poly', 'barre', ['quadriceps'], ['fessiers', 'abdos']),
  exo('squat-guide', 'Squat à la machine guidée', 'poly', 'machine', ['quadriceps'], ['fessiers']),
  exo('goblet-squat', 'Goblet squat', 'poly', 'kettlebell', ['quadriceps'], ['fessiers', 'abdos']),
  exo('presse-cuisses', 'Presse à cuisses', 'poly', 'machine', ['quadriceps'], ['fessiers']),
  exo('hack-squat', 'Hack squat', 'poly', 'machine', ['quadriceps'], ['fessiers']),
  exo('fentes-halteres', 'Fentes (haltères)', 'poly', 'halteres', ['quadriceps', 'fessiers'], ['ischios']),
  exo('fentes-bulgares', 'Fentes bulgares', 'poly', 'halteres', ['quadriceps', 'fessiers']),
  exo('extension-jambes', 'Leg extension', 'isolation', 'machine', ['quadriceps']),

  // Ischio-jambiers & fessiers
  exo('souleve-de-terre-roumain', 'Soulevé de terre roumain (barre)', 'poly', 'barre', ['ischios', 'fessiers'], ['avant_bras']),
  exo('souleve-de-terre-roumain-halteres', 'Soulevé de terre roumain (haltères)', 'poly', 'halteres', ['ischios', 'fessiers'], ['avant_bras']),
  exo('good-morning', 'Good morning', 'poly', 'barre', ['ischios'], ['fessiers']),
  exo('leg-curl-allonge', 'Leg curl allongé', 'isolation', 'machine', ['ischios']),
  exo('leg-curl-assis', 'Leg curl assis', 'isolation', 'machine', ['ischios']),
  exo('hip-thrust', 'Hip thrust (barre)', 'poly', 'barre', ['fessiers'], ['ischios']),
  exo('hip-thrust-machine', 'Hip thrust (machine)', 'poly', 'machine', ['fessiers'], ['ischios']),
  exo('pont-fessier', 'Pont fessier', 'isolation', 'poids_du_corps', ['fessiers'], ['ischios']),
  exo('abduction-machine', 'Abduction (machine)', 'isolation', 'machine', ['fessiers']),
  exo('kickback-fessiers', 'Kickback fessiers (poulie)', 'isolation', 'poulie', ['fessiers'], ['ischios']),
  exo('kettlebell-swing', 'Kettlebell swing', 'poly', 'kettlebell', ['fessiers', 'ischios'], ['abdos']),

  // Mollets
  exo('mollets-debout', 'Mollets debout (machine)', 'isolation', 'machine', ['mollets']),
  exo('mollets-assis', 'Mollets assis (machine)', 'isolation', 'machine', ['mollets']),
  exo('mollets-presse', 'Mollets à la presse', 'isolation', 'machine', ['mollets']),
  exo('mollets-halteres', 'Mollets debout (haltères)', 'isolation', 'halteres', ['mollets']),
  exo('mollets-unilateral', 'Mollets sur une jambe (marche)', 'isolation', 'poids_du_corps', ['mollets']),
]
