// Séance du jour et réalisation des séances — docs/CONCEPTION.md §4.1
import type { ExoPrevu, ExoRealise, ModePlanning, Programme, Seance, SeanceRealisee, Serie } from '../types'

/** 1 = lundi … 7 = dimanche */
export const jourIso = (d: Date) => ((d.getDay() + 6) % 7) + 1

/** Lundi 00:00 (heure locale) de la semaine de `d`. */
export function debutSemaine(d: Date): Date {
  const lundi = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  lundi.setDate(lundi.getDate() - (jourIso(d) - 1))
  return lundi
}

export const memeJour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export function dansLaSemaine(iso: string, reference: Date) {
  const d = new Date(iso)
  const debut = debutSemaine(reference)
  const fin = new Date(debut)
  fin.setDate(fin.getDate() + 7)
  return d >= debut && d < fin
}

export type Proposition =
  | { type: 'seance'; seance: Seance }
  | { type: 'repos' }
  | { type: 'semaineTerminee' }
  | { type: 'vide' }

/**
 * Séance proposée aujourd'hui.
 * - Jour fixe : la séance attribuée à ce jour (la première pas encore faite aujourd'hui), sinon repos.
 * - Ordre : la première séance du programme pas encore faite cette semaine.
 */
export function seanceDuJour(
  programme: Programme,
  mode: ModePlanning,
  maintenant: Date,
  terminees: SeanceRealisee[],
): Proposition {
  if (programme.seances.length === 0) return { type: 'vide' }

  if (mode === 'jourFixe') {
    const duJour = programme.seances
      .filter((s) => s.jourSemaine === jourIso(maintenant))
      .sort((a, b) => a.ordre - b.ordre)
    if (duJour.length === 0) return { type: 'repos' }
    const faitesAujourdhui = new Set(terminees.filter((t) => memeJour(new Date(t.date), maintenant)).map((t) => t.seanceId))
    return { type: 'seance', seance: duJour.find((s) => !faitesAujourdhui.has(s.id)) ?? duJour[0] }
  }

  const faitesSemaine = new Set(terminees.filter((t) => dansLaSemaine(t.date, maintenant)).map((t) => t.seanceId))
  const suivante = [...programme.seances].sort((a, b) => a.ordre - b.ordre).find((s) => !faitesSemaine.has(s.id))
  return suivante ? { type: 'seance', seance: suivante } : { type: 'semaineTerminee' }
}

export function seriesPrevues(p: ExoPrevu): Serie[] {
  return Array.from({ length: p.series }, () => ({
    repsPrevues: p.reps,
    poidsPrevuKg: p.poidsKg,
    poidsKg: p.poidsKg,
    repsFaites: p.reps,
    validee: false,
  }))
}

export function demarrerSeance(seance: Seance, maintenant: Date): SeanceRealisee {
  return {
    id: crypto.randomUUID(),
    date: maintenant.toISOString(),
    seanceId: seance.id,
    nom: seance.nom,
    enCours: true,
    exercices: seance.exercices.map((p) => ({ exerciceId: p.exerciceId, series: seriesPrevues(p) })),
  }
}

export type StatutSerie = 'aFaire' | 'reussie' | 'echec'

/** Échec = série faite avec moins de reps ou moins de poids que prévu. */
export function statutSerie(s: Serie): StatutSerie {
  if (!s.validee) return 'aFaire'
  return s.repsFaites < s.repsPrevues || s.poidsKg < s.poidsPrevuKg ? 'echec' : 'reussie'
}

/** Dernière réalisation terminée d'un exercice (hors séance `exclure`). */
export function derniereFois(exerciceId: string, historique: SeanceRealisee[], exclure?: string) {
  let meilleure: { date: string; exo: ExoRealise } | null = null
  for (const s of historique) {
    if (s.enCours || s.id === exclure) continue
    const exo = s.exercices.find((e) => e.exerciceId === exerciceId && e.series.some((x) => x.validee))
    if (exo && (!meilleure || s.date > meilleure.date)) meilleure = { date: s.date, exo }
  }
  return meilleure
}

/** Ex. « 8 · 8 · 6 × 80 kg » ou « 8 × 80 · 6 × 75 kg » si le poids a changé. */
export function formaterSeries(series: Serie[]) {
  const faites = series.filter((s) => s.validee)
  if (faites.length === 0) return 'aucune série'
  const kg = (n: number) => n.toLocaleString('fr-FR')
  if (faites.every((s) => s.poidsKg === faites[0].poidsKg))
    return `${faites.map((s) => s.repsFaites).join(' · ')} × ${kg(faites[0].poidsKg)} kg`
  return faites.map((s) => `${s.repsFaites} × ${kg(s.poidsKg)}`).join(' · ') + ' kg'
}

export interface Bilan {
  validees: number
  total: number
  /** kg × reps des séries validées */
  tonnage: number
  echecs: { exerciceId: string; serie: number; detail: string }[]
}

export function bilanSeance(s: SeanceRealisee): Bilan {
  const b: Bilan = { validees: 0, total: 0, tonnage: 0, echecs: [] }
  for (const e of s.exercices)
    e.series.forEach((x, i) => {
      b.total++
      if (!x.validee) return
      b.validees++
      b.tonnage += x.poidsKg * x.repsFaites
      if (statutSerie(x) === 'echec') {
        const parts = []
        if (x.repsFaites < x.repsPrevues) parts.push(`${x.repsFaites}/${x.repsPrevues} reps`)
        if (x.poidsKg < x.poidsPrevuKg) parts.push(`${x.poidsKg} kg au lieu de ${x.poidsPrevuKg}`)
        b.echecs.push({ exerciceId: e.exerciceId, serie: i + 1, detail: parts.join(', ') })
      }
    })
  return b
}
