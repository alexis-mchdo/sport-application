import { describe, expect, it } from 'vitest'
import { BIBLIOTHEQUE } from '../data/bibliotheque'
import type { Profil } from '../types'
import { PROFIL_VIDE, completion, profilEnTexte } from './profil'

const exos = new Map(BIBLIOTHEQUE.map((e) => [e.id, e]))

describe('profil', () => {
  it('un profil vide est complété à 0 %', () => {
    expect(completion(PROFIL_VIDE)).toBe(0)
    expect(profilEnTexte(PROFIL_VIDE, exos)).toBe('Profil : non renseigné.')
  })

  it('résume uniquement les champs remplis, en français lisible', () => {
    const p: Profil = {
      ...PROFIL_VIDE,
      sexe: 'homme',
      anneeNaissance: 1996,
      objectif: 'muscle',
      joursDisponibles: [1, 3, 5],
      blessures: [{ id: 'b', zone: 'epaule', cote: 'droite', gravite: 'douleur', active: true, note: 'au développé' }],
      exercicesAEviter: ['developpe-militaire'],
      records: { squat: 120 },
    }
    const texte = profilEnTexte(p, exos, 2026)
    expect(texte).toContain('- Âge : 30 ans')
    expect(texte).toContain('- Objectif principal : Prise de muscle')
    expect(texte).toContain('- Jours disponibles : Lundi, Mercredi, Vendredi')
    expect(texte).toContain('- Blessure / douleur actuelle : Épaule (droite), douleur — au développé')
    expect(texte).toContain('- Exercices à éviter : Développé militaire (barre)')
    expect(texte).toContain('- Record Squat : 120 kg')
    expect(texte).not.toContain('Taille')
  })

  it('calcule le pourcentage de complétion', () => {
    expect(completion({ ...PROFIL_VIDE, sexe: 'femme', poidsKg: 60, equipements: ['barre'] })).toBe(21)
  })
})
