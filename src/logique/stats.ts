// Statistiques — docs/CONCEPTION.md §4.3. Tout est calculé à partir des séances terminées.
import { MUSCLES } from '../data/muscles'
import type { Exercice, Muscle, SeanceRealisee, Serie } from '../types'
import type { Volume } from './equilibre'

const POIDS_SECONDAIRE = 0.5

const terminees = (seances: SeanceRealisee[]) => seances.filter((s) => !s.enCours)
const reussiesOuFaites = (series: Serie[]) => series.filter((s) => s.validee && s.repsFaites > 0)

/** 1RM estimé (formule d'Epley). Sans charge, pas de 1RM : null. */
export function unRM(poidsKg: number, reps: number): number | null {
  if (poidsKg <= 0 || reps <= 0) return null
  return reps === 1 ? poidsKg : poidsKg * (1 + reps / 30)
}

/**
 * Valeur de performance d'une série : 1RM estimé si l'exercice est chargé, sinon nombre de répétitions
 * (poids du corps). `unite` dit laquelle.
 */
function valeurSerie(s: Serie): { valeur: number; unite: 'kg' | 'reps' } {
  const rm = unRM(s.poidsKg, s.repsFaites)
  return rm === null ? { valeur: s.repsFaites, unite: 'reps' } : { valeur: rm, unite: 'kg' }
}

export interface PointProgression {
  date: string
  seanceId: string
  semaine?: number
  /** 1RM estimé (kg) ou reps max (poids du corps) */
  valeur: number
  meilleure: Serie
}

export interface Progression {
  unite: 'kg' | 'reps'
  points: PointProgression[]
}

/** Meilleure série de chaque séance pour un exercice, dans l'ordre chronologique. */
export function progressionExercice(exerciceId: string, seances: SeanceRealisee[]): Progression {
  const points: PointProgression[] = []
  let unite: 'kg' | 'reps' = 'reps'
  for (const s of terminees(seances)) {
    const faites = s.exercices.filter((e) => e.exerciceId === exerciceId).flatMap((e) => reussiesOuFaites(e.series))
    if (faites.length === 0) continue
    // Si au moins une série est chargée, on suit le 1RM ; sinon les reps
    const chargees = faites.filter((x) => x.poidsKg > 0)
    const candidates = chargees.length ? chargees : faites
    let meilleure = candidates[0]
    for (const x of candidates) if (valeurSerie(x).valeur > valeurSerie(meilleure).valeur) meilleure = x
    const v = valeurSerie(meilleure)
    if (v.unite === 'kg') unite = 'kg'
    points.push({ date: s.date, seanceId: s.id, semaine: s.semaine, valeur: v.valeur, meilleure })
  }
  points.sort((a, b) => a.date.localeCompare(b.date))
  // Un exercice passé au poids du corps puis chargé : on ne garde que les points dans l'unité principale
  return { unite, points: unite === 'kg' ? points.filter((p) => p.meilleure.poidsKg > 0) : points }
}

/** Exercices pratiqués, du plus fréquent au moins fréquent (nombre de séances). */
export function exercicesPratiques(seances: SeanceRealisee[]): string[] {
  const compte = new Map<string, number>()
  for (const s of terminees(seances)) {
    const ids = new Set(s.exercices.filter((e) => reussiesOuFaites(e.series).length).map((e) => e.exerciceId))
    for (const id of ids) compte.set(id, (compte.get(id) ?? 0) + 1)
  }
  return [...compte.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

export interface Record_ {
  exerciceId: string
  unite: 'kg' | 'reps'
  valeur: number
  serie: Serie
  date: string
  semaine?: number
}

/** Meilleure performance de chaque exercice, la plus récente en premier. */
export function records(seances: SeanceRealisee[]): Record_[] {
  return exercicesPratiques(seances)
    .map((id): Record_ | null => {
      const { unite, points } = progressionExercice(id, seances)
      if (points.length === 0) return null
      // En cas d'égalité, la première fois compte (c'est là que le record a été établi)
      let best = points[0]
      for (const p of points) if (p.valeur > best.valeur + 1e-9) best = p
      return { exerciceId: id, unite, valeur: best.valeur, serie: best.meilleure, date: best.date, semaine: best.semaine }
    })
    .filter((r): r is Record_ => r !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Séries réellement faites par muscle, pour chaque semaine d'entraînement demandée. */
export function volumeParSemaine(seances: SeanceRealisee[], exos: Map<string, Exercice>, semaines: number[]): Map<number, Volume> {
  const resultat = new Map<number, Volume>(
    semaines.map((n) => [n, Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Volume]),
  )
  for (const s of terminees(seances)) {
    const v = s.semaine !== undefined ? resultat.get(s.semaine) : undefined
    if (!v) continue
    for (const e of s.exercices) {
      const exo = exos.get(e.exerciceId)
      if (!exo) continue
      const n = reussiesOuFaites(e.series).length
      for (const m of exo.musclesPrincipaux) v[m as Muscle] += n
      for (const m of exo.musclesSecondaires) v[m as Muscle] += n * POIDS_SECONDAIRE
    }
  }
  return resultat
}

/** Nombre de séances terminées par semaine d'entraînement. */
export function seancesParSemaine(seances: SeanceRealisee[], semaines: number[]): Map<number, number> {
  const r = new Map(semaines.map((n) => [n, 0]))
  for (const s of terminees(seances)) if (s.semaine !== undefined && r.has(s.semaine)) r.set(s.semaine, r.get(s.semaine)! + 1)
  return r
}

/**
 * Semaines d'affilée avec au moins une séance, en remontant depuis la semaine en cours
 * (la semaine en cours ne casse pas la série tant qu'elle est vide).
 */
export function semainesDAffilee(seances: SeanceRealisee[], semaineCourante: number): number {
  const actives = new Set(terminees(seances).map((s) => s.semaine))
  let n = 0
  let k = actives.has(semaineCourante) ? semaineCourante : semaineCourante - 1
  while (k >= 1 && actives.has(k)) {
    n++
    k--
  }
  return n
}

/** Tonnage (kg × reps des séries validées) d'une liste de séances. */
export function tonnage(seances: SeanceRealisee[]): number {
  return terminees(seances).reduce(
    (t, s) => t + s.exercices.reduce((u, e) => u + reussiesOuFaites(e.series).reduce((w, x) => w + x.poidsKg * x.repsFaites, 0), 0),
    0,
  )
}

/** Dernières semaines d'entraînement (jusqu'à `nombre`), de la plus ancienne à la plus récente. */
export function dernieresSemaines(semaineCourante: number, nombre = 8): number[] {
  const debut = Math.max(1, semaineCourante - nombre + 1)
  return Array.from({ length: semaineCourante - debut + 1 }, (_, i) => debut + i)
}

/** Graduations « rondes » pour un axe (3 à 5 valeurs). */
export function graduations(min: number, max: number, cible = 4): number[] {
  if (max <= min) max = min + 1
  const brut = (max - min) / cible
  const puissance = 10 ** Math.floor(Math.log10(brut))
  const pas = [1, 2, 2.5, 5, 10].map((f) => f * puissance).find((p) => p >= brut) ?? 10 * puissance
  const debut = Math.floor(min / pas) * pas
  const fin = Math.ceil(max / pas) * pas
  const r: number[] = []
  for (let v = debut; v <= fin + 1e-9; v += pas) r.push(Math.round(v * 100) / 100)
  return r
}
