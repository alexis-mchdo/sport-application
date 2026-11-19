import { describe, expect, it } from 'vitest'
import { BIBLIOTHEQUE } from '../data/bibliotheque'
import { MODELES, creerProgrammeDepuisModele } from '../data/modeles'
import type { Profil, Programme } from '../types'
import {
  SCHEMA_BILAN,
  appliquerPropositionsIA,
  codesSeances,
  contexteBilan,
  contexteCreation,
  exercicesAutorises,
  verifierAnalyse,
  verifierProgrammeIA,
  zoneTouchee,
} from './ia'
import { PROFIL_VIDE } from './profil'

const exos = new Map(BIBLIOTHEQUE.map((e) => [e.id, e]))

// Upper / Lower 4 jours, avec 80 kg au développé couché de Upper A (S1)
function programme(): Programme {
  const p = creerProgrammeDepuisModele(MODELES.find((m) => m.id === 'upper-lower-4')!)
  p.seances[0].exercices[0].poidsKg = 80
  return p
}
const profil: Profil = { ...PROFIL_VIDE }
const blesseEpaule: Profil = {
  ...PROFIL_VIDE,
  blessures: [{ id: 'b', zone: 'epaule', cote: 'droite', gravite: 'douleur', active: true, note: '' }],
}

const analyser = (propositions: object[], p = programme(), pr = profil, conseils: unknown[] = []) =>
  verifierAnalyse({ propositions, conseils }, p, BIBLIOTHEQUE, pr)

describe('codes de séance', () => {
  it('numérote les séances S1, S2… dans l’ordre des jours', () => {
    expect([...codesSeances(programme()).entries()].map(([c, s]) => `${c} ${s.nom}`)).toEqual([
      'S1 Upper A',
      'S2 Lower A',
      'S3 Upper B',
      'S4 Lower B',
    ])
  })
})

describe('vérification du bilan IA', () => {
  it('accepte une hausse de charge raisonnable, arrondie au palier', () => {
    const a = analyser([{ type: 'charge', seance: 'S1', exercice: 'developpe-couche-barre', poidsKg: 83, raison: 'facile' }])
    expect(a.rejets).toEqual([])
    expect(a.propositions[0]).toMatchObject({ poidsKg: 82.5, description: 'Développé couché (barre) : 80 kg → 82,5 kg (Upper A)' })
  })

  it('refuse plus de +10 % de charge', () => {
    const a = analyser([{ type: 'charge', seance: 'S1', exercice: 'developpe-couche-barre', poidsKg: 95, raison: 'x' }])
    expect(a.propositions).toEqual([])
    expect(a.rejets[0]).toMatch(/trop important/)
  })

  it('refuse un exercice inventé ou une séance inconnue', () => {
    const a = analyser([
      { type: 'ajouter', seance: 'S1', exercice: 'super-curl-magique', raison: 'x' },
      { type: 'charge', seance: 'S9', exercice: 'developpe-couche-barre', poidsKg: 82.5, raison: 'x' },
    ])
    expect(a.propositions).toEqual([])
    expect(a.rejets).toHaveLength(2)
  })

  it('refuse un exercice de la liste « à éviter »', () => {
    const a = analyser(
      [{ type: 'ajouter', seance: 'S2', exercice: 'hack-squat', raison: 'x' }],
      programme(),
      { ...PROFIL_VIDE, exercicesAEviter: ['hack-squat'] },
    )
    expect(a.propositions).toEqual([])
  })

  it('avec une douleur à l’épaule : refuse de charger les épaules mais accepte de baisser ou remplacer', () => {
    const a = analyser(
      [
        { type: 'charge', seance: 'S1', exercice: 'developpe-epaules-halteres', series: 4, raison: 'x' },
        { type: 'ajouter', seance: 'S1', exercice: 'elevations-frontales', raison: 'x' },
        { type: 'charge', seance: 'S1', exercice: 'developpe-epaules-halteres', series: 2, raison: 'douleur' },
        { type: 'remplacer', seance: 'S3', exercice: 'elevations-laterales-poulie', nouvelExercice: 'elevations-laterales-machine', raison: 'douleur' },
      ],
      programme(),
      blesseEpaule,
    )
    expect(a.propositions.map((p) => p.type)).toEqual(['charge', 'remplacer'])
    expect(a.rejets.filter((r) => r.includes('douleur'))).toHaveLength(2)
  })

  it('refuse un remplacement qui ne travaille pas le même muscle', () => {
    const a = analyser([{ type: 'remplacer', seance: 'S1', exercice: 'curl-halteres', nouvelExercice: 'mollets-assis', raison: 'x' }])
    expect(a.propositions).toEqual([])
  })

  it('refuse de retirer un exercice si cela rend un muscle manquant', () => {
    // Les mollets ne sont travaillés que par 2 exercices dans Upper / Lower
    const a = analyser([
      { type: 'retirer', seance: 'S2', exercice: 'mollets-debout', raison: 'x' },
      { type: 'retirer', seance: 'S4', exercice: 'mollets-assis', raison: 'x' },
    ])
    expect(a.propositions).toHaveLength(1)
    expect(a.rejets[0]).toMatch(/manquant/)
  })

  it('limite les conseils à 3 et ignore les vides', () => {
    const a = analyser([], programme(), profil, ['a', '', 'b', 'c', 'd', 42])
    expect(a.conseils).toEqual(['a', 'b', 'c'])
  })

  it('résiste à une réponse mal formée', () => {
    expect(verifierAnalyse(null, programme(), BIBLIOTHEQUE, profil)).toEqual({ propositions: [], conseils: [], rejets: [] })
    expect(verifierAnalyse({ propositions: 'nope' }, programme(), BIBLIOTHEQUE, profil).propositions).toEqual([])
  })

  it('applique les propositions acceptées au programme sans modifier l’original', () => {
    const p = programme()
    const a = analyser(
      [
        { type: 'charge', seance: 'S1', exercice: 'developpe-couche-barre', poidsKg: 82.5, raison: 'x' },
        { type: 'remplacer', seance: 'S1', exercice: 'curl-halteres', nouvelExercice: 'curl-marteau', raison: 'x' },
        { type: 'ajouter', seance: 'S1', exercice: 'face-pull', series: 3, reps: 15, raison: 'x' },
      ],
      p,
    )
    const apres = appliquerPropositionsIA(p, a.propositions, exos)
    const upperA = apres.seances.find((s) => s.nom === 'Upper A')!
    expect(upperA.exercices[0].poidsKg).toBe(82.5)
    expect(upperA.exercices.map((e) => e.exerciceId)).toContain('curl-marteau')
    expect(upperA.exercices.at(-1)).toMatchObject({ exerciceId: 'face-pull', series: 3, reps: 15 })
    expect(p.seances[0].exercices[0].poidsKg).toBe(80)
  })
})

describe('vérification du programme IA', () => {
  it('garde les exercices valides, écarte les inconnus et complète les jours', () => {
    const r = verifierProgrammeIA(
      {
        nom: 'Mon PPL',
        explication: 'Simple.',
        seances: [
          { nom: 'Push', jour: 1, exercices: [{ exercice: 'developpe-couche-barre', series: 4, reps: 8, poidsKg: 61 }, { exercice: 'inconnu', series: 3, reps: 8, poidsKg: 0 }] },
          { nom: 'Pull', jour: 1, exercices: [{ exercice: 'rowing-barre', series: 4, reps: 8, poidsKg: 50 }] },
          { nom: 'Vide', jour: 5, exercices: [] },
        ],
      },
      BIBLIOTHEQUE,
      { ...PROFIL_VIDE, joursDisponibles: [1, 3, 5] },
      3,
    )
    expect(r.programme.seances.map((s) => [s.nom, s.jourSemaine])).toEqual([
      ['Push', 1],
      ['Pull', 3],
    ])
    expect(r.programme.seances[0].exercices).toEqual([{ exerciceId: 'developpe-couche-barre', series: 4, reps: 8, poidsKg: 60 }])
    expect(r.rejets).toHaveLength(2)
  })

  it('lève une erreur si rien n’est utilisable', () => {
    expect(() => verifierProgrammeIA({ seances: [] }, BIBLIOTHEQUE, profil, 3)).toThrow(/pas proposé/)
  })
})

describe('contexte envoyé à l’IA', () => {
  it('exclut les exercices à éviter et ceux sans le matériel', () => {
    const p: Profil = { ...PROFIL_VIDE, equipements: ['halteres'], exercicesAEviter: ['curl-halteres'] }
    const ids = exercicesAutorises(BIBLIOTHEQUE, p).map((e) => e.id)
    expect(ids).toContain('curl-marteau')
    expect(ids).toContain('pompes') // poids du corps toujours autorisé
    expect(ids).not.toContain('curl-halteres')
    expect(ids).not.toContain('squat')
  })

  it('contient le profil, le programme codé et le catalogue', () => {
    const t = contexteBilan({
      profil: blesseEpaule,
      programme: programme(),
      exercices: BIBLIOTHEQUE,
      historique: [],
      numeroSemaine: 3,
      propositionsRegles: [],
      refusRecents: ['Retirer Squat (barre) (Lower A)'],
    })
    expect(t).toContain('Blessure / douleur actuelle : Épaule')
    expect(t).toContain('S1 Upper A (lundi)')
    expect(t).toContain('developpe-couche-barre « Développé couché (barre) » : 4 × 6 à 80 kg')
    expect(t).toContain('Retirer Squat (barre)')
    expect(t).toContain('hack-squat | Hack squat')
    expect(contexteCreation(PROFIL_VIDE, BIBLIOTHEQUE, 4)).toContain('4 séances par semaine')
  })

  it('le schéma de réponse impose propositions et conseils', () => {
    expect(SCHEMA_BILAN.required).toEqual(['propositions', 'conseils'])
  })

  it('repère la zone douloureuse sollicitée par un exercice', () => {
    expect(zoneTouchee(exos.get('developpe-militaire')!, blesseEpaule)).toBe('epaule')
    expect(zoneTouchee(exos.get('squat')!, blesseEpaule)).toBeUndefined()
  })
})
