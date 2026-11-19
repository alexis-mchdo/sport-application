import type { ExoPrevu, Exercice, Muscle, Programme, Seance } from '../types'

/** Objectif par défaut quand on ajoute un exercice. Le poids est à régler ensuite. */
export function prescriptionParDefaut(e: Exercice): ExoPrevu {
  return e.type === 'poly'
    ? { exerciceId: e.id, series: 3, reps: 8, poidsKg: 0 }
    : { exerciceId: e.id, series: 3, reps: 12, poidsKg: 0 }
}

const REGIONS: Muscle[][] = [
  ['quadriceps', 'ischios', 'fessiers', 'mollets'],
  ['pectoraux', 'epaules_avant', 'epaules_laterales', 'triceps'],
  ['dos', 'trapezes', 'epaules_arriere', 'biceps', 'avant_bras'],
  ['abdos'],
]
const region = (m: Muscle) => REGIONS.find((r) => r.includes(m))!

/**
 * Séance la plus logique pour accueillir un exercice ciblant `muscle` :
 * celle qui travaille déjà la même région du corps, sinon la moins chargée.
 */
export function choisirSeancePour(programme: Programme, muscle: Muscle, exos: Map<string, Exercice>): Seance | null {
  if (programme.seances.length === 0) return null
  const r = region(muscle)
  const score = (s: Seance) =>
    s.exercices.reduce((total, { exerciceId }) => {
      const e = exos.get(exerciceId)
      if (!e) return total
      if (e.musclesPrincipaux.includes(muscle)) return total + 2
      if (e.musclesPrincipaux.some((m) => r.includes(m))) return total + 1
      return total
    }, 0)
  return [...programme.seances].sort((a, b) => score(b) - score(a) || a.exercices.length - b.exercices.length)[0]
}

/** Premier jour de la semaine sans séance (1 = lundi), ou undefined si tous sont pris. */
export function premierJourLibre(programme: Programme): number | undefined {
  const pris = new Set(programme.seances.map((s) => s.jourSemaine))
  return [1, 2, 3, 4, 5, 6, 7].find((j) => !pris.has(j))
}

export function nouvelleSeance(programme: Programme, avecJour: boolean): Seance {
  return {
    id: crypto.randomUUID(),
    nom: `Séance ${programme.seances.length + 1}`,
    ordre: Math.max(-1, ...programme.seances.map((s) => s.ordre)) + 1,
    jourSemaine: avecJour ? premierJourLibre(programme) : undefined,
    exercices: [],
  }
}

/** Séances triées pour l'affichage : par jour (mode jour fixe) ou par ordre. */
export function seancesTriees(programme: Programme, parJour: boolean): Seance[] {
  return [...programme.seances].sort((a, b) =>
    parJour ? (a.jourSemaine ?? 99) - (b.jourSemaine ?? 99) || a.ordre - b.ordre : a.ordre - b.ordre,
  )
}

/** Ex. « 4 × 8 · 80 kg » */
export function resumePrescription(p: ExoPrevu, e: Exercice | undefined) {
  const poids =
    p.poidsKg > 0 ? `${p.poidsKg.toLocaleString('fr-FR')} kg` : e?.equipement === 'poids_du_corps' ? 'poids du corps' : 'poids à régler'
  return `${p.series} × ${p.reps} · ${poids}`
}
