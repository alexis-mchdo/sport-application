// Profil : informations pour cibler les conseils, et plus tard l'IA (création et ajustement du programme).
import { NOM_EQUIPEMENT, NOM_MUSCLE } from '../data/muscles'
import { NOM_JOUR } from '../data/jours'
import type { Cote, Exercice, Gravite, Lieu, Niveau, Niveau3, Objectif, Profil, Sexe, ZoneCorps } from '../types'

export const PROFIL_VIDE: Profil = {
  musclesPrioritaires: [],
  joursDisponibles: [],
  equipements: [],
  blessures: [],
  exercicesAEviter: [],
  exercicesPreferes: [],
  records: {},
  notes: '',
}

export const NOM_SEXE: Record<Sexe, string> = { homme: 'Homme', femme: 'Femme', autre: 'Autre' }
export const NOM_NIVEAU: Record<Niveau, string> = {
  debutant: 'Débutant (< 1 an)',
  intermediaire: 'Intermédiaire (1–3 ans)',
  avance: 'Avancé (3 ans +)',
}
export const NOM_OBJECTIF: Record<Objectif, string> = {
  muscle: 'Prise de muscle',
  force: 'Force',
  seche: 'Sèche (perte de gras)',
  recomposition: 'Recomposition',
  forme: 'Forme générale',
  sante: 'Santé / bien-être',
}
export const NOM_LIEU: Record<Lieu, string> = {
  salle_complete: 'Salle complète',
  salle_basique: 'Salle basique',
  maison: 'Maison',
}
export const NOM_STRESS: Record<Niveau3, string> = { faible: 'Faible', moyen: 'Moyen', eleve: 'Élevé' }
export const NOM_ACTIVITE: Record<Niveau3, string> = { faible: 'Sédentaire', moyen: 'Active', eleve: 'Très active' }
export const NOM_ZONE: Record<ZoneCorps, string> = {
  cou: 'Cou',
  epaule: 'Épaule',
  coude: 'Coude',
  poignet: 'Poignet',
  haut_du_dos: 'Haut du dos',
  bas_du_dos: 'Bas du dos',
  hanche: 'Hanche',
  genou: 'Genou',
  cheville: 'Cheville',
  autre: 'Autre',
}
export const NOM_COTE: Record<Cote, string> = { gauche: 'Gauche', droite: 'Droite', les_deux: 'Les deux' }
export const NOM_GRAVITE: Record<Gravite, string> = { gene: 'Gêne', douleur: 'Douleur', blessure: 'Blessure' }

export const RECORDS = [
  { cle: 'squat', nom: 'Squat', unite: 'kg' },
  { cle: 'developpe_couche', nom: 'Développé couché', unite: 'kg' },
  { cle: 'souleve_de_terre', nom: 'Soulevé de terre', unite: 'kg' },
  { cle: 'developpe_militaire', nom: 'Développé militaire', unite: 'kg' },
  { cle: 'tractions', nom: 'Tractions (max)', unite: 'reps' },
] as const

/** Part des informations essentielles renseignées, en %. */
export function completion(p: Profil): number {
  const essentiels = [
    p.sexe,
    p.anneeNaissance,
    p.tailleCm,
    p.poidsKg,
    p.niveau,
    p.objectif,
    p.seancesParSemaine,
    p.dureeSeanceMin,
    p.joursDisponibles.length > 0 || undefined,
    p.lieu,
    p.equipements.length > 0 || undefined,
    p.sommeilHeures,
    p.stress,
    p.activiteQuotidienne,
  ]
  return Math.round((essentiels.filter((x) => x !== undefined).length / essentiels.length) * 100)
}

/**
 * Résumé texte du profil, tel qu'il sera envoyé à l'IA.
 * Les champs vides sont omis.
 */
export function profilEnTexte(p: Profil, exos: Map<string, Exercice>, annee = new Date().getFullYear()): string {
  const lignes: string[] = []
  const ajouter = (libelle: string, valeur: unknown) => {
    if (valeur !== undefined && valeur !== '' && !(Array.isArray(valeur) && valeur.length === 0))
      lignes.push(`- ${libelle} : ${Array.isArray(valeur) ? valeur.join(', ') : valeur}`)
  }
  const nomExo = (id: string) => exos.get(id)?.nom ?? id

  ajouter('Sexe', p.sexe && NOM_SEXE[p.sexe])
  ajouter('Âge', p.anneeNaissance && `${annee - p.anneeNaissance} ans`)
  ajouter('Taille', p.tailleCm && `${p.tailleCm} cm`)
  ajouter('Poids', p.poidsKg && `${p.poidsKg} kg`)
  ajouter('Niveau', p.niveau && NOM_NIVEAU[p.niveau])
  ajouter('Années de pratique', p.anneesPratique)
  ajouter('Objectif principal', p.objectif && NOM_OBJECTIF[p.objectif])
  ajouter('Muscles prioritaires', p.musclesPrioritaires.map((m) => NOM_MUSCLE[m]))
  ajouter('Séances par semaine', p.seancesParSemaine)
  ajouter('Durée par séance', p.dureeSeanceMin && `${p.dureeSeanceMin} min`)
  ajouter('Jours disponibles', p.joursDisponibles.map((j) => NOM_JOUR[j]))
  ajouter('Lieu', p.lieu && NOM_LIEU[p.lieu])
  ajouter('Équipement disponible', p.equipements.map((e) => NOM_EQUIPEMENT[e]))
  for (const b of p.blessures)
    ajouter(
      b.active ? 'Blessure / douleur actuelle' : 'Ancienne blessure',
      `${NOM_ZONE[b.zone]} (${NOM_COTE[b.cote].toLowerCase()}), ${NOM_GRAVITE[b.gravite].toLowerCase()}${b.note ? ` — ${b.note}` : ''}`,
    )
  ajouter('Exercices à éviter', p.exercicesAEviter.map(nomExo))
  ajouter('Exercices préférés', p.exercicesPreferes.map(nomExo))
  ajouter('Sommeil', p.sommeilHeures && `${p.sommeilHeures} h par nuit`)
  ajouter('Stress', p.stress && NOM_STRESS[p.stress])
  ajouter('Activité quotidienne', p.activiteQuotidienne && NOM_ACTIVITE[p.activiteQuotidienne])
  for (const r of RECORDS) ajouter(`Record ${r.nom}`, p.records[r.cle] && `${p.records[r.cle]} ${r.unite}`)
  ajouter('Notes', p.notes.trim())

  return lignes.length ? `Profil :\n${lignes.join('\n')}` : 'Profil : non renseigné.'
}
