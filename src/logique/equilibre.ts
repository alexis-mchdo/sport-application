// Algorithme d'équilibre du programme (sans IA) — docs/CONCEPTION.md §6
import { NOM_JOUR } from '../data/jours'
import { MUSCLES, NOM_MUSCLE } from '../data/muscles'
import type { Exercice, ModePlanning, Muscle, Programme, Seance } from '../types'

export type Statut = 'manquant' | 'bas' | 'ok' | 'eleve'

/** Fourchette repère de séries par semaine (prise de muscle). */
export const CIBLES: Record<Muscle, { min: number; max: number }> = {
  pectoraux: { min: 10, max: 20 },
  dos: { min: 10, max: 20 },
  trapezes: { min: 6, max: 20 },
  epaules_avant: { min: 6, max: 20 },
  epaules_laterales: { min: 8, max: 20 },
  epaules_arriere: { min: 6, max: 20 },
  biceps: { min: 8, max: 20 },
  triceps: { min: 8, max: 20 },
  avant_bras: { min: 4, max: 16 },
  abdos: { min: 6, max: 16 },
  quadriceps: { min: 10, max: 20 },
  ischios: { min: 10, max: 20 },
  fessiers: { min: 8, max: 20 },
  mollets: { min: 6, max: 16 },
}

const POIDS_SECONDAIRE = 0.5
/** Sous cette fraction de la cible minimale, le muscle est « manquant » (rouge). */
const SEUIL_MANQUANT = 0.6

export type Volume = Record<Muscle, number>
export type IndexExercices = Map<string, Exercice>

export const indexer = (exercices: Exercice[]): IndexExercices => new Map(exercices.map((e) => [e.id, e]))

function volumeVide(): Volume {
  return Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Volume
}

export function volumeSeance(seance: Seance, exos: IndexExercices): Volume {
  const v = volumeVide()
  for (const { exerciceId, series } of seance.exercices) {
    const e = exos.get(exerciceId)
    if (!e) continue
    for (const m of e.musclesPrincipaux) v[m] += series
    for (const m of e.musclesSecondaires) v[m] += series * POIDS_SECONDAIRE
  }
  return v
}

export function volumeHebdo(programme: Programme, exos: IndexExercices): Volume {
  const total = volumeVide()
  for (const s of programme.seances) {
    const v = volumeSeance(s, exos)
    for (const m of MUSCLES) total[m] += v[m]
  }
  return total
}

export function statut(muscle: Muscle, series: number): Statut {
  const { min, max } = CIBLES[muscle]
  if (series < min * SEUIL_MANQUANT) return 'manquant'
  if (series < min) return 'bas'
  if (series > max) return 'eleve'
  return 'ok'
}

export const formaterSeries = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))

const MUSCLES_PETITS: Muscle[] = ['epaules_laterales', 'epaules_arriere', 'biceps', 'triceps', 'avant_bras', 'abdos', 'mollets']

/** Meilleurs exercices pour cibler un muscle, en évitant ceux déjà dans le programme. */
export function suggererExercices(muscle: Muscle, exercices: Exercice[], dejaUtilises: Set<string>, nombre = 2): string[] {
  const preferIsolation = MUSCLES_PETITS.includes(muscle)
  return exercices
    .filter((e) => e.musclesPrincipaux.includes(muscle) && !dejaUtilises.has(e.id))
    .map((e, rang) => {
      let score = 0
      if (e.musclesPrincipaux[0] === muscle) score += 2
      if ((e.type === 'isolation') === preferIsolation) score += 1
      return { id: e.id, score, rang }
    })
    .sort((a, b) => b.score - a.score || a.rang - b.rang)
    .slice(0, nombre)
    .map((s) => s.id)
}

export interface Alerte {
  id: string
  niveau: 'rouge' | 'orange' | 'info'
  message: string
  /** Exercices proposés à l'ajout */
  suggestions: string[]
  /** Muscle visé par les suggestions (pour choisir la séance où les ajouter) */
  muscle?: Muscle
}

const POUSSEE: Muscle[] = ['pectoraux', 'epaules_avant', 'triceps']
const TIRAGE: Muscle[] = ['dos', 'trapezes', 'epaules_arriere', 'biceps']
/** Muscles ignorés pour l'alerte « deux jours d'affilée » (récupèrent vite). */
const RECUPERATION_RAPIDE: Muscle[] = ['abdos', 'avant_bras', 'mollets']

/** Séries de poussée et de tirage, selon le premier muscle principal de chaque exercice. */
export function pousseeTirage(programme: Programme, exos: IndexExercices) {
  let poussee = 0
  let tirage = 0
  for (const s of programme.seances)
    for (const { exerciceId, series } of s.exercices) {
      const m = exos.get(exerciceId)?.musclesPrincipaux[0]
      if (!m) continue
      if (POUSSEE.includes(m)) poussee += series
      else if (TIRAGE.includes(m)) tirage += series
    }
  return { poussee, tirage }
}

function seancesConsecutives(programme: Programme, mode: ModePlanning): [Seance, Seance, string][] {
  const paires: [Seance, Seance, string][] = []
  if (mode === 'jourFixe') {
    const parJour = new Map<number, Seance[]>()
    for (const s of programme.seances) if (s.jourSemaine) parJour.set(s.jourSemaine, [...(parJour.get(s.jourSemaine) ?? []), s])
    for (let j = 1; j <= 7; j++) {
      const suivant = j === 7 ? 1 : j + 1
      for (const a of parJour.get(j) ?? [])
        for (const b of parJour.get(suivant) ?? [])
          paires.push([a, b, `${NOM_JOUR[j].toLowerCase()} et ${NOM_JOUR[suivant].toLowerCase()}`])
    }
  } else {
    const tries = [...programme.seances].sort((a, b) => a.ordre - b.ordre)
    for (let i = 0; i + 1 < tries.length; i++) paires.push([tries[i], tries[i + 1], `${tries[i].nom} puis ${tries[i + 1].nom}`])
  }
  return paires
}

function seriesPrincipales(seance: Seance, exos: IndexExercices): Volume {
  const v = volumeVide()
  for (const { exerciceId, series } of seance.exercices) for (const m of exos.get(exerciceId)?.musclesPrincipaux ?? []) v[m] += series
  return v
}

const listeFr = (mots: string[]) => (mots.length < 2 ? mots.join('') : `${mots.slice(0, -1).join(', ')} et ${mots.at(-1)}`)

/** Toutes les alertes, de la plus importante à la moins importante. */
export function alertes(programme: Programme, exercices: Exercice[], mode: ModePlanning): Alerte[] {
  if (programme.seances.every((s) => s.exercices.length === 0)) return []
  const exos = indexer(exercices)
  const vol = volumeHebdo(programme, exos)
  const utilises = new Set(programme.seances.flatMap((s) => s.exercices.map((e) => e.exerciceId)))
  const rouges: Alerte[] = []
  const desequilibres: Alerte[] = []
  const bas: { alerte: Alerte; ecart: number }[] = []
  const infos: Alerte[] = []

  for (const m of MUSCLES) {
    const st = statut(m, vol[m])
    const { min } = CIBLES[m]
    if (st === 'manquant')
      rouges.push({
        id: `manquant-${m}`,
        niveau: 'rouge',
        message:
          vol[m] === 0
            ? `${NOM_MUSCLE[m]} absent de ta semaine (cible ${min}+ séries).`
            : `${NOM_MUSCLE[m]} : ${formaterSeries(vol[m])} séries par semaine (cible ${min}+).`,
        suggestions: suggererExercices(m, exercices, utilises),
        muscle: m,
      })
    else if (st === 'bas')
      bas.push({
        ecart: (min - vol[m]) / min,
        alerte: {
        id: `bas-${m}`,
        niveau: 'orange',
        message: `${NOM_MUSCLE[m]} un peu bas : ${formaterSeries(vol[m])} séries (cible ${min}+).`,
        suggestions: suggererExercices(m, exercices, utilises),
        muscle: m,
        },
      })
  }

  const { poussee, tirage } = pousseeTirage(programme, exos)
  const [fort, faible] = poussee >= tirage ? [poussee, tirage] : [tirage, poussee]
  if (fort >= 6 && fort > faible * 1.5) {
    const manqueTirage = poussee > tirage
    desequilibres.push({
      id: 'poussee-tirage',
      niveau: 'orange',
      message: `Déséquilibre : ${poussee} séries de poussée pour ${tirage} de tirage.`,
      suggestions: suggererExercices(manqueTirage ? 'dos' : 'pectoraux', exercices, utilises),
      muscle: manqueTirage ? 'dos' : 'pectoraux',
    })
  }

  if (statut('ischios', vol.ischios) !== 'manquant' && vol.quadriceps > vol.ischios * 2)
    desequilibres.push({
      id: 'quadri-ischios',
      niveau: 'orange',
      message: `Déséquilibre : ${formaterSeries(vol.quadriceps)} séries de quadriceps pour ${formaterSeries(vol.ischios)} d'ischio-jambiers.`,
      suggestions: suggererExercices('ischios', exercices, utilises),
      muscle: 'ischios',
    })

  for (const [a, b, quand] of seancesConsecutives(programme, mode)) {
    const va = seriesPrincipales(a, exos)
    const vb = seriesPrincipales(b, exos)
    const communs = MUSCLES.filter((m) => !RECUPERATION_RAPIDE.includes(m) && va[m] >= 3 && vb[m] >= 3)
    if (communs.length)
      infos.push({
        id: `consecutif-${a.id}-${b.id}`,
        niveau: 'info',
        message: `${listeFr(communs.map((m) => NOM_MUSCLE[m]))} travaillé${communs.length > 1 ? 's' : ''} ${mode === 'jourFixe' ? '' : 'dans '}${quand} : peu de récupération.`,
        suggestions: [],
      })
  }

  bas.sort((a, b) => b.ecart - a.ecart)
  return [...rouges, ...desequilibres, ...bas.map((b) => b.alerte), ...infos]
}
