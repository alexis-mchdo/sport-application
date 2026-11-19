import { describe, expect, it } from 'vitest'
import { BIBLIOTHEQUE } from '../data/bibliotheque'
import { MODELES, creerProgrammeDepuisModele } from '../data/modeles'
import { MUSCLES } from '../data/muscles'
import type { Programme, Seance } from '../types'
import { alertes, indexer, pousseeTirage, statut, suggererExercices, volumeHebdo } from './equilibre'
import { choisirSeancePour } from './programme'

const exos = indexer(BIBLIOTHEQUE)

function seance(nom: string, jour: number | undefined, exercices: [string, number][]): Seance {
  return {
    id: nom,
    nom,
    ordre: jour ?? 0,
    jourSemaine: jour,
    exercices: exercices.map(([exerciceId, series]) => ({ exerciceId, series, reps: 8, poidsKg: 0 })),
  }
}
const programme = (...seances: Seance[]): Programme => ({ id: 'p', nom: 'p', joursParSemaine: 3, actif: true, seances })

describe('volume hebdomadaire', () => {
  it('compte 1 par série pour un muscle principal et 0,5 pour un secondaire', () => {
    const v = volumeHebdo(programme(seance('A', 1, [['developpe-couche-barre', 4]])), exos)
    expect(v.pectoraux).toBe(4)
    expect(v.triceps).toBe(2)
    expect(v.epaules_avant).toBe(2)
    expect(v.dos).toBe(0)
  })

  it('additionne toutes les séances', () => {
    const v = volumeHebdo(
      programme(seance('A', 1, [['squat', 4]]), seance('B', 3, [['presse-cuisses', 3]])),
      exos,
    )
    expect(v.quadriceps).toBe(7)
  })
})

describe('statut', () => {
  it('classe selon la fourchette', () => {
    expect(statut('quadriceps', 4)).toBe('manquant')
    expect(statut('quadriceps', 8)).toBe('bas')
    expect(statut('quadriceps', 12)).toBe('ok')
    expect(statut('quadriceps', 24)).toBe('eleve')
  })
})

describe('alertes', () => {
  it("ne dit rien pour un programme sans exercice", () => {
    expect(alertes(programme(seance('A', 1, [])), BIBLIOTHEQUE, 'jourFixe')).toEqual([])
  })

  it('signale un muscle absent et propose des exercices qui le ciblent', () => {
    const p = programme(seance('Push', 1, [['developpe-couche-barre', 4]]))
    const a = alertes(p, BIBLIOTHEQUE, 'jourFixe').find((x) => x.id === 'manquant-quadriceps')!
    expect(a.niveau).toBe('rouge')
    expect(a.suggestions.length).toBe(2)
    for (const id of a.suggestions) expect(exos.get(id)!.musclesPrincipaux).toContain('quadriceps')
  })

  it('met les rouges avant les autres', () => {
    // 10 séries de poussée, 0 de tirage → déséquilibre (orange) + muscles manquants (rouge)
    const p = programme(seance('Push', 1, [['developpe-couche-barre', 10]]))
    const niveaux = alertes(p, BIBLIOTHEQUE, 'jourFixe').map((a) => a.niveau)
    expect(niveaux.indexOf('rouge')).toBe(0)
    expect(niveaux.lastIndexOf('rouge')).toBeLessThan(niveaux.findIndex((n) => n !== 'rouge'))
  })

  it('signale un déséquilibre poussée / tirage', () => {
    const p = programme(seance('A', 1, [['developpe-couche-barre', 10], ['developpe-militaire', 8], ['rowing-barre', 4]]))
    expect(pousseeTirage(p, exos)).toEqual({ poussee: 18, tirage: 4 })
    expect(alertes(p, BIBLIOTHEQUE, 'jourFixe').some((a) => a.id === 'poussee-tirage')).toBe(true)
  })

  it('signale un muscle travaillé deux jours de suite (mode jour fixe, y compris dimanche → lundi)', () => {
    const p = programme(seance('A', 7, [['developpe-couche-barre', 4]]), seance('B', 1, [['developpe-incline-halteres', 3]]))
    const a = alertes(p, BIBLIOTHEQUE, 'jourFixe').find((x) => x.niveau === 'info')!
    expect(a.message).toMatch(/Pectoraux.*dimanche et lundi/)
  })

  it("n'alerte pas pour deux jours non consécutifs", () => {
    const p = programme(seance('A', 1, [['developpe-couche-barre', 4]]), seance('B', 3, [['developpe-incline-halteres', 3]]))
    expect(alertes(p, BIBLIOTHEQUE, 'jourFixe').some((x) => x.niveau === 'info')).toBe(false)
  })
})

describe('suggestions', () => {
  it("n'en propose pas qui soient déjà dans le programme", () => {
    const s = suggererExercices('quadriceps', BIBLIOTHEQUE, new Set(['squat']))
    expect(s).not.toContain('squat')
  })

  it('préfère les exercices d’isolation pour les petits muscles', () => {
    const [premier] = suggererExercices('epaules_laterales', BIBLIOTHEQUE, new Set())
    expect(exos.get(premier)!.type).toBe('isolation')
  })
})

describe('choisirSeancePour', () => {
  it('ajoute un exercice de jambes à la séance de jambes', () => {
    const p = programme(
      seance('Push', 1, [['developpe-couche-barre', 4]]),
      seance('Legs', 3, [['squat', 4]]),
      seance('Pull', 5, [['rowing-barre', 4]]),
    )
    expect(choisirSeancePour(p, 'ischios', exos)!.nom).toBe('Legs')
    expect(choisirSeancePour(p, 'epaules_arriere', exos)!.nom).toBe('Pull')
  })
})

describe('modèles de programmes', () => {
  for (const modele of MODELES) {
    const p = creerProgrammeDepuisModele(modele)

    it(`${modele.id} : utilise uniquement des exercices de la bibliothèque`, () => {
      for (const s of p.seances) for (const e of s.exercices) expect(exos.has(e.exerciceId), e.exerciceId).toBe(true)
    })

    it(`${modele.id} : a autant de séances que de jours, chacune à un jour différent`, () => {
      expect(p.seances.length).toBe(modele.jours)
      expect(new Set(p.seances.map((s) => s.jourSemaine)).size).toBe(modele.jours)
    })

    it(`${modele.id} : aucun muscle manquant ni déséquilibre`, () => {
      const v = volumeHebdo(p, exos)
      const manquants = MUSCLES.filter((m) => statut(m, v[m]) === 'manquant')
      expect(manquants).toEqual([])
      const a = alertes(p, BIBLIOTHEQUE, 'jourFixe').filter((x) => x.niveau === 'rouge' || x.id === 'poussee-tirage')
      expect(a.map((x) => x.message)).toEqual([])
    })

    if (modele.jours >= 4)
      it(`${modele.id} : aucune alerte du tout`, () => {
        expect(alertes(p, BIBLIOTHEQUE, 'jourFixe').map((x) => x.message)).toEqual([])
      })
  }
})
