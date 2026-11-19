import { describe, expect, it } from 'vitest'
import { joursDepuis, rappelSauvegardeNecessaire } from './rappel'

const maintenant = new Date('2026-11-19T12:00:00Z')

describe('rappel de sauvegarde', () => {
  it('compte les jours écoulés', () => {
    expect(joursDepuis('2026-11-19T08:00:00Z', maintenant)).toBe(0)
    expect(joursDepuis('2026-11-05T12:00:00Z', maintenant)).toBe(14)
  })

  it("ne rappelle rien tant qu'il n'y a aucune séance", () => {
    expect(rappelSauvegardeNecessaire(null, 0, maintenant)).toBe(false)
  })

  it('rappelle si jamais exporté ou si le dernier export a 14 jours ou plus', () => {
    expect(rappelSauvegardeNecessaire(null, 3, maintenant)).toBe(true)
    expect(rappelSauvegardeNecessaire('2026-11-05T12:00:00Z', 3, maintenant)).toBe(true)
    expect(rappelSauvegardeNecessaire('2026-11-10T12:00:00Z', 3, maintenant)).toBe(false)
  })
})
