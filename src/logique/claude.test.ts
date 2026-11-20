import { describe, expect, it } from 'vitest'
import { BIBLIOTHEQUE } from '../data/bibliotheque'
import { MODELES, creerProgrammeDepuisModele } from '../data/modeles'
import type { Profil } from '../types'
import { extraireJson, lireReponseProgramme, texteClaude, verifierProgramme, type DonneesClaude } from './claude'
import { codesSeances, exercicesAutorises, zoneTouchee } from './contexte'
import { PROFIL_VIDE } from './profil'
import { conserverIdsSeances } from './programme'

const exos = new Map(BIBLIOTHEQUE.map((e) => [e.id, e]))
const blesseEpaule: Profil = {
  ...PROFIL_VIDE,
  blessures: [{ id: 'b', zone: 'epaule', cote: 'droite', gravite: 'douleur', active: true, note: '' }],
}
const donnees = (): DonneesClaude => ({
  profil: { ...PROFIL_VIDE, objectif: 'force', joursDisponibles: [1, 3, 5] },
  programme: creerProgrammeDepuisModele(MODELES.find((m) => m.id === 'ppl-3')!),
  exercices: BIBLIOTHEQUE,
  historique: [],
  numeroSemaine: 4,
  propositionsRegles: [],
})

describe('textes pour Claude', () => {
  it('bilan : la demande, le profil, le programme et l’historique', () => {
    const t = texteClaude('bilan', donnees())
    expect(t).toMatch(/^Je fais de la musculation/)
    expect(t).toContain("Fais le bilan de ma semaine d'entraînement n° 4")
    expect(t).toContain('Objectif principal : Force')
    expect(t).toContain('S1 Push (lundi)')
    expect(t).toContain('Mes séances des 4 dernières semaines')
  })

  it('question libre recopiée en tête et en fin', () => {
    const t = texteClaude('libre', donnees(), { questionLibre: 'Comment progresser aux tractions ?' })
    expect(t.match(/Comment progresser aux tractions \?/g)).toHaveLength(2)
  })

  it('programme à créer : contraintes, catalogue et format JSON imposé', () => {
    const t = texteClaude('programme', donnees(), { mode: 'creer', nbSeances: 3, consignes: 'plus de bras' })
    expect(t).toContain('Crée-moi un programme')
    expect(t).toContain('Mes consignes : plus de bras')
    expect(t).toContain('3 séances par semaine')
    expect(t).toContain('Jours disponibles : lundi, mercredi, vendredi')
    expect(t).toContain('developpe-couche-barre | Développé couché (barre)')
    expect(t).toContain('```json')
    expect(t).not.toContain('Mon programme actuel')
  })

  it('programme à adapter : inclut le programme actuel et demande de garder les noms', () => {
    const t = texteClaude('programme', donnees(), { mode: 'adapter' })
    expect(t).toContain('Adapte mon programme')
    expect(t).toContain('Mon programme actuel')
    expect(t).toContain('mêmes noms pour les séances')
  })
})

describe('lecture de la réponse de Claude', () => {
  const json = { nom: 'Test', explication: 'x', seances: [{ nom: 'A', jour: 1, exercices: [{ exercice: 'squat', series: 4, reps: 6, poidsKg: 101 }] }] }

  it('trouve le bloc json dans un message complet', () => {
    const message = `Voici ton programme.\n\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\`\n\nBon entraînement !`
    expect(extraireJson(message)).toEqual(json)
  })

  it('accepte aussi le JSON seul, collé sans bloc de code', () => {
    expect(extraireJson(JSON.stringify(json))).toEqual(json)
  })

  it('refuse un texte sans programme', () => {
    expect(() => extraireJson('Bonjour !')).toThrow(/Aucun programme lisible/)
  })

  it('vérifie le programme : arrondi au palier, exercices inconnus écartés, jours complétés', () => {
    const r = lireReponseProgramme(
      JSON.stringify({
        nom: 'Mon PPL',
        seances: [
          { nom: 'Push', jour: 1, exercices: [{ exercice: 'developpe-couche-barre', series: 4, reps: 8, poidsKg: 61 }, { exercice: 'inconnu', series: 3, reps: 8, poidsKg: 0 }] },
          { nom: 'Pull', jour: 1, exercices: [{ exercice: 'rowing-barre', series: 4, reps: 8, poidsKg: 50 }] },
          { nom: 'Vide', jour: 5, exercices: [] },
        ],
      }),
      BIBLIOTHEQUE,
      { ...PROFIL_VIDE, joursDisponibles: [1, 3, 5] },
    )
    expect(r.programme.seances.map((s) => [s.nom, s.jourSemaine])).toEqual([
      ['Push', 1],
      ['Pull', 3],
    ])
    expect(r.programme.seances[0].exercices).toEqual([{ exerciceId: 'developpe-couche-barre', series: 4, reps: 8, poidsKg: 60 }])
    expect(r.rejets).toHaveLength(2)
  })

  it('refuse un exercice de la liste « à éviter »', () => {
    expect(() =>
      verifierProgramme(
        { seances: [{ nom: 'A', jour: 1, exercices: [{ exercice: 'hack-squat', series: 3, reps: 8, poidsKg: 0 }] }] },
        BIBLIOTHEQUE,
        { ...PROFIL_VIDE, exercicesAEviter: ['hack-squat'] },
      ),
    ).toThrow(/aucune séance utilisable/)
  })
})

describe('remplacement du programme', () => {
  it('garde l’identifiant des séances qui portent le même nom (historique conservé)', () => {
    const ancien = creerProgrammeDepuisModele(MODELES.find((m) => m.id === 'ppl-3')!)
    const nouveau = verifierProgramme(
      {
        nom: 'PPL v2',
        seances: [
          { nom: 'push', jour: 1, exercices: [{ exercice: 'pompes', series: 3, reps: 10, poidsKg: 0 }] },
          { nom: 'Jambes', jour: 3, exercices: [{ exercice: 'squat', series: 3, reps: 8, poidsKg: 0 }] },
        ],
      },
      BIBLIOTHEQUE,
      PROFIL_VIDE,
    ).programme
    const r = conserverIdsSeances(ancien, nouveau)
    expect(r.id).toBe(ancien.id)
    expect(r.nom).toBe('PPL v2')
    expect(r.seances[0].id).toBe(ancien.seances.find((s) => s.nom === 'Push')!.id)
    expect(ancien.seances.map((s) => s.id)).not.toContain(r.seances[1].id)
  })
})

describe('contexte', () => {
  it('codes de séance dans l’ordre des jours', () => {
    const p = creerProgrammeDepuisModele(MODELES.find((m) => m.id === 'upper-lower-4')!)
    expect([...codesSeances(p).entries()].map(([c, s]) => `${c} ${s.nom}`)).toEqual(['S1 Upper A', 'S2 Lower A', 'S3 Upper B', 'S4 Lower B'])
  })

  it('exercices autorisés : sans les « à éviter » ni ceux hors matériel (poids du corps toujours permis)', () => {
    const ids = exercicesAutorises(BIBLIOTHEQUE, { ...PROFIL_VIDE, equipements: ['halteres'], exercicesAEviter: ['curl-halteres'] }).map((e) => e.id)
    expect(ids).toContain('curl-marteau')
    expect(ids).toContain('pompes')
    expect(ids).not.toContain('curl-halteres')
    expect(ids).not.toContain('squat')
  })

  it('zone douloureuse sollicitée par un exercice', () => {
    expect(zoneTouchee(exos.get('developpe-militaire')!, blesseEpaule)).toBe('epaule')
    expect(zoneTouchee(exos.get('squat')!, blesseEpaule)).toBeUndefined()
  })
})
