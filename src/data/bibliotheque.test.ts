import { describe, expect, it } from 'vitest'
import { BIBLIOTHEQUE } from './bibliotheque'
import { MUSCLES } from './muscles'

describe('bibliothèque', () => {
  it('a des identifiants uniques', () => {
    const ids = BIBLIOTHEQUE.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("couvre chaque muscle en tant que muscle principal d'au moins 2 exercices", () => {
    for (const m of MUSCLES) {
      const n = BIBLIOTHEQUE.filter((e) => e.musclesPrincipaux.includes(m)).length
      expect(n, m).toBeGreaterThanOrEqual(2)
    }
  })

  it("n'a pas de muscle à la fois principal et secondaire", () => {
    for (const e of BIBLIOTHEQUE) {
      const doublons = e.musclesSecondaires.filter((m) => e.musclesPrincipaux.includes(m))
      expect(doublons, e.id).toEqual([])
    }
  })
})
