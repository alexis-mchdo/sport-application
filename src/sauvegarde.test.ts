import { describe, expect, it } from 'vitest'
import { verifierSauvegarde } from './sauvegarde'

const valide = {
  app: 'muscu',
  version: 1,
  exporteLe: '2026-11-19T10:00:00.000Z',
  donnees: { exercices: [], programmes: [], seancesRealisees: [], bilans: [], reglages: [] },
}

describe('verifierSauvegarde', () => {
  it('accepte une sauvegarde valide', () => {
    expect(verifierSauvegarde(valide)).toBeNull()
  })

  it("refuse un fichier d'une autre app", () => {
    expect(verifierSauvegarde({ ...valide, app: 'autre' })).toMatch(/pas une sauvegarde/)
    expect(verifierSauvegarde(null)).toMatch(/pas une sauvegarde/)
  })

  it("refuse une version plus récente que l'app", () => {
    expect(verifierSauvegarde({ ...valide, version: 99 })).toMatch(/plus récente/)
  })

  it('refuse une sauvegarde incomplète', () => {
    const { programmes: _, ...sansProgrammes } = valide.donnees
    expect(verifierSauvegarde({ ...valide, donnees: sansProgrammes })).toMatch(/programmes/)
  })
})
