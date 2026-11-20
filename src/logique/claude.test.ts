import { describe, expect, it } from 'vitest'
import { BIBLIOTHEQUE } from '../data/bibliotheque'
import { MODELES, creerProgrammeDepuisModele } from '../data/modeles'
import { texteClaude, type DonneesClaude } from './claude'
import { PROFIL_VIDE } from './profil'

const donnees: DonneesClaude = {
  profil: { ...PROFIL_VIDE, objectif: 'force' },
  programme: creerProgrammeDepuisModele(MODELES.find((m) => m.id === 'ppl-3')!),
  exercices: BIBLIOTHEQUE,
  historique: [],
  numeroSemaine: 4,
  propositionsRegles: [],
}

describe('texte pour Claude', () => {
  it('bilan : la question, le profil, le programme et l’historique', () => {
    const t = texteClaude('bilan', donnees)
    expect(t).toMatch(/^Je fais de la musculation/)
    expect(t).toContain("Analyse ma semaine d'entraînement n° 4")
    expect(t).toContain('Objectif principal : Force')
    expect(t).toContain('S1 Push (lundi)')
    expect(t).toContain('Mes séances des 4 dernières semaines')
    expect(t).toContain('Réponds en français')
  })

  it('question libre recopiée en tête et en fin', () => {
    const t = texteClaude('libre', donnees, 'Comment progresser aux tractions ?')
    expect(t.match(/Comment progresser aux tractions \?/g)).toHaveLength(2)
  })

  it('n’inclut pas le catalogue d’exercices (texte court)', () => {
    expect(texteClaude('programme', donnees)).not.toContain('Catalogue')
  })
})
