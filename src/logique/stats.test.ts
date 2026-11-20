import { describe, expect, it } from 'vitest'
import { BIBLIOTHEQUE } from '../data/bibliotheque'
import type { SeanceRealisee, Serie } from '../types'
import {
  dernieresSemaines,
  exercicesPratiques,
  graduations,
  progressionExercice,
  records,
  seancesParSemaine,
  semainesDAffilee,
  tonnage,
  unRM,
  volumeParSemaine,
} from './stats'

const exos = new Map(BIBLIOTHEQUE.map((e) => [e.id, e]))
const serie = (repsFaites: number, poidsKg: number, validee = true): Serie => ({
  repsPrevues: 8,
  poidsPrevuKg: poidsKg,
  poidsKg,
  repsFaites,
  validee,
})
const seance = (date: string, semaine: number, exercices: [string, Serie[]][], enCours = false): SeanceRealisee => ({
  id: `${date}-${semaine}`,
  date,
  semaine,
  nom: 's',
  enCours,
  exercices: exercices.map(([exerciceId, series]) => ({ exerciceId, series })),
})

const historique = [
  seance('2026-11-02T18:00:00Z', 1, [
    ['developpe-couche-barre', [serie(8, 80), serie(8, 80), serie(6, 80)]],
    ['pompes', [serie(15, 0), serie(12, 0)]],
  ]),
  seance('2026-11-09T18:00:00Z', 2, [
    ['developpe-couche-barre', [serie(8, 82.5), serie(7, 82.5), serie(10, 70, false)]],
    ['pompes', [serie(18, 0)]],
  ]),
  seance('2026-11-16T18:00:00Z', 3, [['squat', [serie(5, 100)]]]),
  seance('2026-11-17T18:00:00Z', 3, [['developpe-couche-barre', [serie(8, 85)]]], true), // en cours : ignorée
]

describe('stats', () => {
  it('1RM estimé (Epley), sans 1RM au poids du corps', () => {
    expect(unRM(100, 1)).toBe(100)
    expect(unRM(80, 8)).toBeCloseTo(101.33, 2)
    expect(unRM(0, 10)).toBeNull()
  })

  it('progression : meilleure série validée de chaque séance terminée', () => {
    const p = progressionExercice('developpe-couche-barre', historique)
    expect(p.unite).toBe('kg')
    expect(p.points.map((x) => [x.meilleure.repsFaites, x.meilleure.poidsKg])).toEqual([
      [8, 80],
      [8, 82.5],
    ])
  })

  it('progression au poids du corps : en répétitions', () => {
    const p = progressionExercice('pompes', historique)
    expect(p.unite).toBe('reps')
    expect(p.points.map((x) => x.valeur)).toEqual([15, 18])
  })

  it('exercices les plus pratiqués d’abord', () => {
    expect(exercicesPratiques(historique)).toEqual(['developpe-couche-barre', 'pompes', 'squat'])
  })

  it('records : la meilleure performance, la plus récente en premier', () => {
    const r = records(historique)
    expect(r.map((x) => x.exerciceId)).toEqual(['squat', 'developpe-couche-barre', 'pompes'])
    expect(r[1].serie.poidsKg).toBe(82.5)
  })

  it('volume par muscle et par semaine (séries validées seulement)', () => {
    const v = volumeParSemaine(historique, exos, [1, 2, 3])
    expect(v.get(1)!.pectoraux).toBe(3 + 2) // 3 DC + 2 pompes
    expect(v.get(2)!.pectoraux).toBe(2 + 1) // la série non validée ne compte pas
    expect(v.get(2)!.triceps).toBe(1 + 0.5)
    expect(v.get(3)!.quadriceps).toBe(1)
  })

  it('séances par semaine et semaines d’affilée', () => {
    expect([...seancesParSemaine(historique, [1, 2, 3, 4]).values()]).toEqual([1, 1, 1, 0])
    expect(semainesDAffilee(historique, 3)).toBe(3)
    expect(semainesDAffilee(historique, 4)).toBe(3) // semaine 4 vide mais en cours : la série tient
    expect(semainesDAffilee(historique, 5)).toBe(0)
  })

  it('tonnage des séries validées', () => {
    expect(tonnage([historique[2]])).toBe(500)
  })

  it('dernières semaines et graduations rondes', () => {
    expect(dernieresSemaines(3)).toEqual([1, 2, 3])
    expect(dernieresSemaines(12)).toEqual([5, 6, 7, 8, 9, 10, 11, 12])
    expect(graduations(96, 113)).toEqual([95, 100, 105, 110, 115])
    expect(graduations(0, 4)).toEqual([0, 1, 2, 3, 4])
  })
})
