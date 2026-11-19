// Progression de fin de semaine (sans IA) — docs/CONCEPTION.md §7
import type { ExoPrevu, Exercice, Programme, SeanceRealisee, Serie } from '../types'
import { statutSerie } from './seance'

export type TypeProposition = 'monter' | 'garder' | 'baisser' | 'pasFait'

export interface Proposition {
  seanceId: string
  seanceNom: string
  exerciceId: string
  type: TypeProposition
  avant: { poidsKg: number; reps: number }
  apres: { poidsKg: number; reps: number }
  raison: string
}

type Resultat = 'reussi' | 'echec' | 'incomplet' | 'pasFait'

/** Séries de cet exercice dans les séances réalisées correspondant à cette séance du programme. */
function seriesRealisees(seanceId: string, exerciceId: string, realisees: SeanceRealisee[]): Serie[][] {
  return realisees
    .filter((r) => r.seanceId === seanceId && !r.enCours)
    .map((r) => r.exercices.find((e) => e.exerciceId === exerciceId)?.series)
    .filter((s): s is Serie[] => !!s && s.some((x) => x.validee))
}

function resultat(p: ExoPrevu, realisations: Serie[][]): Resultat {
  if (realisations.length === 0) return 'pasFait'
  if (realisations.some((series) => series.some((s) => statutSerie(s) === 'echec'))) return 'echec'
  const toutesReussies = realisations.every((series) => series.filter((s) => statutSerie(s) === 'reussie').length >= p.series)
  return toutesReussies ? 'reussi' : 'incomplet'
}

/** Arrondi au palier de charge le plus proche (ex. 72 kg → 72,5 kg avec un palier de 2,5). */
const arrondirPalier = (kg: number, pas: number) => Math.max(0, Math.round(kg / pas) * pas)

export function proposerProgression(
  programme: Programme,
  exos: Map<string, Exercice>,
  cetteSemaine: SeanceRealisee[],
  semainePrecedente: SeanceRealisee[],
): Proposition[] {
  const propositions: Proposition[] = []
  for (const seance of programme.seances)
    for (const p of seance.exercices) {
      const e = exos.get(p.exerciceId)
      if (!e) continue
      const pas = e.incrementKg
      const realisations = seriesRealisees(seance.id, p.exerciceId, cetteSemaine)
      const r = resultat(p, realisations)
      const avant = { poidsKg: p.poidsKg, reps: p.reps }
      const base = { seanceId: seance.id, seanceNom: seance.nom, exerciceId: p.exerciceId, avant }

      if (r === 'pasFait') {
        propositions.push({ ...base, type: 'pasFait', apres: avant, raison: 'Pas fait cette semaine' })
        continue
      }

      if (r === 'reussi') {
        // Poids le plus lourd réussi en séance (si tu as déjà monté de toi-même)
        const maxReussi = Math.max(
          0,
          ...realisations.flat().filter((s) => statutSerie(s) === 'reussie').map((s) => s.poidsKg),
        )
        const apres =
          p.poidsKg > 0 || maxReussi > 0
            ? { poidsKg: Math.max(p.poidsKg + pas, maxReussi), reps: p.reps }
            : { poidsKg: 0, reps: p.reps + 1 }
        propositions.push({ ...base, type: 'monter', apres, raison: 'Toutes les séries réussies' })
        continue
      }

      if (r === 'echec' && resultat(p, seriesRealisees(seance.id, p.exerciceId, semainePrecedente)) === 'echec') {
        let apres
        if (p.poidsKg > 0) {
          let poids = arrondirPalier(p.poidsKg * 0.9, pas)
          if (poids >= p.poidsKg) poids = Math.max(0, p.poidsKg - pas)
          apres = { poidsKg: poids, reps: p.reps }
        } else apres = { poidsKg: 0, reps: Math.max(1, p.reps - 1) }
        propositions.push({ ...base, type: 'baisser', apres, raison: 'Séries ratées 2 semaines de suite' })
        continue
      }

      const nbEchecs = realisations.flat().filter((s) => statutSerie(s) === 'echec').length
      propositions.push({
        ...base,
        type: 'garder',
        apres: avant,
        raison: r === 'echec' ? `${nbEchecs} série${nbEchecs > 1 ? 's' : ''} ratée${nbEchecs > 1 ? 's' : ''} : on garde` : 'Séries pas toutes faites',
      })
    }
  return propositions
}
