import { describe, expect, it } from 'vitest'
import type { Programme, Seance, SeanceRealisee, Serie } from '../types'
import { bilanSeance, debutSemaine, demarrerSeance, derniereFois, formaterSeries, jourIso, seanceDuJour, statutSerie } from './seance'

// Jeudi 19 novembre 2026, 18h
const jeudi = new Date(2026, 10, 19, 18, 0)

const seance = (id: string, ordre: number, jour?: number): Seance => ({
  id,
  nom: id,
  ordre,
  jourSemaine: jour,
  exercices: [{ exerciceId: 'squat', series: 3, reps: 8, poidsKg: 100 }],
})
const programme: Programme = {
  id: 'p',
  nom: 'p',
  joursParSemaine: 3,
  actif: true,
  seances: [seance('Push', 0, 1), seance('Pull', 1, 4), seance('Legs', 2, 5)],
}
const faite = (seanceId: string, date: Date): SeanceRealisee => ({ id: `${seanceId}-${date.toISOString()}`, date: date.toISOString(), seanceId, nom: seanceId, exercices: [] })

describe('dates', () => {
  it('jour ISO et début de semaine (lundi)', () => {
    expect(jourIso(jeudi)).toBe(4)
    expect(jourIso(new Date(2026, 10, 22))).toBe(7) // dimanche
    expect(debutSemaine(jeudi)).toEqual(new Date(2026, 10, 16))
    expect(debutSemaine(new Date(2026, 10, 22, 23))).toEqual(new Date(2026, 10, 16))
  })
})

describe('seanceDuJour', () => {
  it('jour fixe : la séance du jour', () => {
    const p = seanceDuJour(programme, 'jourFixe', jeudi, [])
    expect(p.type === 'seance' && p.seance.id).toBe('Pull')
  })

  it('jour fixe : repos un jour sans séance', () => {
    expect(seanceDuJour(programme, 'jourFixe', new Date(2026, 10, 18), []).type).toBe('repos')
  })

  it('ordre : la première séance pas encore faite dans la semaine en cours', () => {
    const p = seanceDuJour(programme, 'ordre', jeudi, [faite('Push', new Date(2026, 10, 16))])
    expect(p.type === 'seance' && p.seance.id).toBe('Pull')
  })

  it('ordre : semaine terminée quand tout est fait', () => {
    const toutes = ['Push', 'Pull', 'Legs'].map((s) => faite(s, new Date(2026, 10, 17)))
    expect(seanceDuJour(programme, 'ordre', jeudi, toutes).type).toBe('semaineTerminee')
  })
})

describe('séance réalisée', () => {
  it('démarre avec les séries pré-remplies et non validées', () => {
    const s = demarrerSeance(programme.seances[0], jeudi, 3)
    expect(s.enCours).toBe(true)
    expect(s.semaine).toBe(3)
    expect(s.exercices[0].series).toHaveLength(3)
    expect(s.exercices[0].series[0]).toEqual({ repsPrevues: 8, poidsPrevuKg: 100, poidsKg: 100, repsFaites: 8, validee: false })
  })

  it('statut : échec si moins de reps ou moins de poids', () => {
    const base: Serie = { repsPrevues: 8, poidsPrevuKg: 100, poidsKg: 100, repsFaites: 8, validee: true }
    expect(statutSerie({ ...base, validee: false })).toBe('aFaire')
    expect(statutSerie(base)).toBe('reussie')
    expect(statutSerie({ ...base, repsFaites: 6 })).toBe('echec')
    expect(statutSerie({ ...base, poidsKg: 90 })).toBe('echec')
    expect(statutSerie({ ...base, poidsKg: 105 })).toBe('reussie')
  })

  it('bilan : compte les séries, le tonnage et les échecs', () => {
    const s: SeanceRealisee = {
      ...faite('Legs', jeudi),
      exercices: [
        {
          exerciceId: 'squat',
          series: [
            { repsPrevues: 8, poidsPrevuKg: 100, poidsKg: 100, repsFaites: 8, validee: true },
            { repsPrevues: 8, poidsPrevuKg: 100, poidsKg: 90, repsFaites: 6, validee: true },
            { repsPrevues: 8, poidsPrevuKg: 100, poidsKg: 100, repsFaites: 8, validee: false },
          ],
        },
      ],
    }
    const b = bilanSeance(s)
    expect(b).toMatchObject({ validees: 2, total: 3, tonnage: 800 + 540 })
    expect(b.echecs).toEqual([{ exerciceId: 'squat', serie: 2, detail: '6/8 reps, 90 kg au lieu de 100' }])
  })

  it('formate les séries faites', () => {
    const s = (repsFaites: number, poidsKg: number, validee = true): Serie => ({ repsPrevues: 8, poidsPrevuKg: 80, poidsKg, repsFaites, validee })
    expect(formaterSeries([s(8, 80), s(8, 80), s(6, 80)])).toBe('8 · 8 · 6 × 80 kg')
    expect(formaterSeries([s(8, 80), s(6, 72.5)])).toBe('8 × 80 · 6 × 72,5 kg')
    expect(formaterSeries([s(8, 80, false)])).toBe('aucune série')
    expect(formaterSeries([s(12, 0), s(10, 0)])).toBe('12 · 10 reps')
  })

  it('dernière fois : la plus récente séance terminée contenant l’exercice', () => {
    const vieille = { ...faite('A', new Date(2026, 10, 2)), exercices: [{ exerciceId: 'squat', series: [{ repsPrevues: 8, poidsPrevuKg: 90, poidsKg: 90, repsFaites: 8, validee: true }] }] }
    const recente = { ...faite('B', new Date(2026, 10, 12)), exercices: [{ exerciceId: 'squat', series: [{ repsPrevues: 8, poidsPrevuKg: 95, poidsKg: 95, repsFaites: 8, validee: true }] }] }
    const enCours = { ...faite('C', jeudi), enCours: true, exercices: recente.exercices }
    expect(derniereFois('squat', [vieille, recente, enCours])?.date).toBe(recente.date)
    expect(derniereFois('pompes', [vieille])).toBeNull()
  })
})
