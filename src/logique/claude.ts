// « Demander à Claude » : texte prêt à coller dans l'app Claude (second avis, sans API). Voir docs/CONCEPTION.md §8.
import type { Exercice, Profil, Programme, SeanceRealisee } from '../types'
import { equilibreTexte, historiqueTexte, programmeTexte } from './ia'
import { profilEnTexte } from './profil'
import type { Proposition } from './progression'

export type TypeDemande = 'bilan' | 'programme' | 'libre'

export const LIBELLE_DEMANDE: Record<TypeDemande, string> = {
  bilan: 'Bilan de ma semaine',
  programme: 'Analyse de mon programme',
  libre: 'Question libre',
}

export interface DonneesClaude {
  profil: Profil
  programme?: Programme
  exercices: Exercice[]
  /** Séances terminées des 4 dernières semaines */
  historique: SeanceRealisee[]
  numeroSemaine: number
  propositionsRegles: Proposition[]
}

function question(type: TypeDemande, numero: number, libre: string): string {
  if (type === 'bilan')
    return `Analyse ma semaine d'entraînement n° ${numero} : ce qui s'est bien passé, ce qui coince, et les ajustements concrets que tu ferais pour la semaine prochaine (charges, exercices, volume, récupération). Sois prudent avec mes douleurs éventuelles.`
  if (type === 'programme')
    return "Analyse mon programme actuel : équilibre entre les muscles, volume, choix des exercices et organisation de la semaine. Propose des améliorations concrètes en tenant compte de mon profil."
  return libre.trim() || '(écris ta question ici)'
}

/** Construit le texte complet : question en tête et en fin, données au milieu. */
export function texteClaude(type: TypeDemande, d: DonneesClaude, questionLibre = ''): string {
  const exos = new Map(d.exercices.map((e) => [e.id, e]))
  const q = question(type, d.numeroSemaine, questionLibre)
  const blocs = [
    `Je fais de la musculation et je suis mes séances avec une app perso. Voici mes données.\n\n${q}`,
    profilEnTexte(d.profil, exos),
  ]
  if (d.programme) {
    blocs.push(`Mon programme actuel :\n${programmeTexte(d.programme, exos)}`)
    blocs.push(`Équilibre du programme (séries par semaine : 1 par muscle principal, ½ par muscle secondaire) :\n${equilibreTexte(d.programme, d.exercices)}`)
  }
  if (type !== 'programme' || d.historique.length)
    blocs.push(`Mes séances des 4 dernières semaines :\n${historiqueTexte(d.historique, exos) || 'Aucune séance.'}`)
  if (type === 'bilan') {
    const regles = d.propositionsRegles
      .filter((p) => p.type === 'monter' || p.type === 'baisser')
      .map((p) => `- ${exos.get(p.exerciceId)?.nom} : ${p.avant.poidsKg} → ${p.apres.poidsKg} kg, ${p.avant.reps} → ${p.apres.reps} reps (${p.raison})`)
    if (regles.length) blocs.push(`Ce que mon app propose déjà pour la semaine prochaine :\n${regles.join('\n')}`)
  }
  blocs.push(`Pour rappel, ma demande : ${q}\nRéponds en français, de façon concise et concrète, en me tutoyant.`)
  return blocs.join('\n\n')
}
