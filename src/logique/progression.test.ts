import { describe, expect, it } from 'vitest'
import { BIBLIOTHEQUE } from '../data/bibliotheque'
import type { Programme, SeanceRealisee, Serie } from '../types'
import { proposerProgression } from './progression'

const exos = new Map(BIBLIOTHEQUE.map((e) => [e.id, e]))

// Push : développé couché 3 × 8 à 80 kg (incrément barre 2,5) ; pompes 3 × 12 au poids du corps
const programme: Programme = {
  id: 'p',
  nom: 'p',
  joursParSemaine: 1,
  actif: true,
  seances: [
    {
      id: 'push',
      nom: 'Push',
      ordre: 0,
      exercices: [
        { exerciceId: 'developpe-couche-barre', series: 3, reps: 8, poidsKg: 80 },
        { exerciceId: 'pompes', series: 3, reps: 12, poidsKg: 0 },
      ],
    },
  ],
}

const serie = (repsFaites: number, poidsKg = 80, validee = true, repsPrevues = 8, poidsPrevuKg = 80): Serie => ({
  repsPrevues,
  poidsPrevuKg,
  poidsKg,
  repsFaites,
  validee,
})
const realisee = (series: Serie[], pompes?: Serie[]): SeanceRealisee => ({
  id: crypto.randomUUID(),
  date: '2026-11-16T18:00:00.000Z',
  seanceId: 'push',
  nom: 'Push',
  exercices: [
    { exerciceId: 'developpe-couche-barre', series },
    ...(pompes ? [{ exerciceId: 'pompes', series: pompes }] : []),
  ],
})
const pourDC = (cette: SeanceRealisee[], precedente: SeanceRealisee[] = []) =>
  proposerProgression(programme, exos, cette, precedente).find((p) => p.exerciceId === 'developpe-couche-barre')!

describe('progression de fin de semaine', () => {
  it('toutes les séries réussies → +2,5 kg', () => {
    const p = pourDC([realisee([serie(8), serie(8), serie(8)])])
    expect(p.type).toBe('monter')
    expect(p.apres).toEqual({ poidsKg: 82.5, reps: 8 })
  })

  it('si tu as déjà monté en séance avec succès, propose ce poids', () => {
    const p = pourDC([realisee([serie(8), serie(8, 85), serie(8, 85)])])
    expect(p.apres.poidsKg).toBe(85)
  })

  it('séries ratées cette semaine seulement → on garde', () => {
    const p = pourDC([realisee([serie(8), serie(6), serie(5)])])
    expect(p.type).toBe('garder')
    expect(p.apres.poidsKg).toBe(80)
    expect(p.raison).toMatch(/2 séries ratées/)
  })

  it('baisse de poids en séance = échec', () => {
    expect(pourDC([realisee([serie(8), serie(8, 72.5), serie(8, 72.5)])]).type).toBe('garder')
  })

  it('ratée 2 semaines de suite → −10 % arrondi au palier', () => {
    const p = pourDC([realisee([serie(8), serie(6), serie(6)])], [realisee([serie(8), serie(7), serie(6)])])
    expect(p.type).toBe('baisser')
    expect(p.apres.poidsKg).toBe(72.5)
  })

  it('séries non terminées sans échec → on garde', () => {
    expect(pourDC([realisee([serie(8), serie(8), serie(8, 80, false)])]).type).toBe('garder')
  })

  it('pas fait cette semaine', () => {
    expect(pourDC([]).type).toBe('pasFait')
  })

  it('poids du corps réussi → +1 répétition', () => {
    const pompes = [serie(12, 0, true, 12, 0), serie(12, 0, true, 12, 0), serie(12, 0, true, 12, 0)]
    const p = proposerProgression(programme, exos, [realisee([serie(8)], pompes)], []).find((x) => x.exerciceId === 'pompes')!
    expect(p.type).toBe('monter')
    expect(p.apres).toEqual({ poidsKg: 0, reps: 13 })
  })

  it('ignore une séance encore en cours', () => {
    expect(pourDC([{ ...realisee([serie(8), serie(8), serie(8)]), enCours: true }]).type).toBe('pasFait')
  })
})
