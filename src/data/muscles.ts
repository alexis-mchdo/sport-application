import type { Equipement, Muscle } from '../types'

export const MUSCLES: Muscle[] = [
  'pectoraux',
  'dos',
  'trapezes',
  'epaules_avant',
  'epaules_laterales',
  'epaules_arriere',
  'biceps',
  'triceps',
  'avant_bras',
  'abdos',
  'quadriceps',
  'ischios',
  'fessiers',
  'mollets',
]

export const NOM_MUSCLE: Record<Muscle, string> = {
  pectoraux: 'Pectoraux',
  dos: 'Dos (largeur)',
  trapezes: 'Haut du dos / trapèzes',
  epaules_avant: 'Épaules avant',
  epaules_laterales: 'Épaules latérales',
  epaules_arriere: 'Épaules arrière',
  biceps: 'Biceps',
  triceps: 'Triceps',
  avant_bras: 'Avant-bras',
  abdos: 'Abdominaux',
  quadriceps: 'Quadriceps',
  ischios: 'Ischio-jambiers',
  fessiers: 'Fessiers',
  mollets: 'Mollets',
}

/** Libellés courts pour les puces de filtre */
export const NOM_COURT_MUSCLE: Record<Muscle, string> = {
  pectoraux: 'Pecs',
  dos: 'Dos',
  trapezes: 'Trapèzes',
  epaules_avant: 'Épaules av.',
  epaules_laterales: 'Épaules lat.',
  epaules_arriere: 'Épaules arr.',
  biceps: 'Biceps',
  triceps: 'Triceps',
  avant_bras: 'Avant-bras',
  abdos: 'Abdos',
  quadriceps: 'Quadri',
  ischios: 'Ischios',
  fessiers: 'Fessiers',
  mollets: 'Mollets',
}

export const EQUIPEMENTS: Equipement[] = ['barre', 'halteres', 'machine', 'poulie', 'poids_du_corps', 'kettlebell']

export const NOM_EQUIPEMENT: Record<Equipement, string> = {
  barre: 'Barre',
  halteres: 'Haltères',
  machine: 'Machine',
  poulie: 'Poulie',
  poids_du_corps: 'Poids du corps',
  kettlebell: 'Kettlebell',
}
