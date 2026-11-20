// Description texte des données de l'app (profil, programme, historique, catalogue),
// utilisée dans les textes à envoyer à Claude. Voir docs/CONCEPTION.md §8.
import { NOM_JOUR } from '../data/jours'
import { MUSCLES, NOM_EQUIPEMENT, NOM_MUSCLE } from '../data/muscles'
import { RESSENTIS } from '../data/ressentis'
import type { Blessure, Exercice, Muscle, Profil, Programme, SeanceRealisee, Seance, ZoneCorps } from '../types'
import { CIBLES, alertes, formaterSeries as formaterVolume, indexer, statut, volumeHebdo } from './equilibre'
import { NOM_ZONE } from './profil'
import { seancesTriees } from './programme'
import { bilanSeance, formaterSeries } from './seance'

/** Muscles principaux à ne pas charger davantage quand une zone fait mal. */
export const MUSCLES_ZONE: Record<ZoneCorps, Muscle[]> = {
  cou: ['trapezes'],
  epaule: ['epaules_avant', 'epaules_laterales', 'epaules_arriere'],
  coude: ['biceps', 'triceps'],
  poignet: ['avant_bras'],
  haut_du_dos: ['trapezes', 'dos'],
  bas_du_dos: ['ischios', 'fessiers'],
  hanche: ['fessiers'],
  genou: ['quadriceps'],
  cheville: ['mollets'],
  autre: [],
}

/** Blessures qui interdisent d'augmenter la charge (gêne légère exclue). */
const blessuresBloquantes = (p: Profil): Blessure[] => p.blessures.filter((b) => b.active && b.gravite !== 'gene')

/** Muscles liés à une zone douloureuse (à ne pas charger). */
export const musclesAMenager = (p: Profil): Muscle[] => [...new Set(blessuresBloquantes(p).flatMap((b) => MUSCLES_ZONE[b.zone]))]

/** Zone douloureuse que l'exercice sollicite en muscle principal, s'il y en a une. */
export function zoneTouchee(e: Exercice, profil: Profil): ZoneCorps | undefined {
  return blessuresBloquantes(profil).find((b) => e.musclesPrincipaux.some((m) => MUSCLES_ZONE[b.zone].includes(m)))?.zone
}

/** Exercices autorisés : ni « à éviter », ni hors du matériel disponible. */
export function exercicesAutorises(exercices: Exercice[], profil: Profil): Exercice[] {
  return exercices.filter(
    (e) =>
      !profil.exercicesAEviter.includes(e.id) &&
      (profil.equipements.length === 0 || e.equipement === 'poids_du_corps' || profil.equipements.includes(e.equipement)),
  )
}

/** Une ligne par exercice : id | nom | muscles | équipement | palier. */
export function catalogue(exercices: Exercice[]): string {
  return exercices
    .map(
      (e) =>
        `${e.id} | ${e.nom} | ${e.musclesPrincipaux.map((m) => NOM_MUSCLE[m]).join(', ')}` +
        `${e.musclesSecondaires.length ? ` (+ ${e.musclesSecondaires.map((m) => NOM_MUSCLE[m]).join(', ')})` : ''}` +
        ` | ${NOM_EQUIPEMENT[e.equipement]} | palier ${e.incrementKg} kg`,
    )
    .join('\n')
}

export const ciblesTexte = () => MUSCLES.map((m) => `${NOM_MUSCLE[m]} ${CIBLES[m].min}–${CIBLES[m].max}`).join(' ; ')

/** Codes courts S1, S2… pour désigner les séances, dans l'ordre des jours. */
export function codesSeances(programme: Programme): Map<string, Seance> {
  return new Map(seancesTriees(programme, true).map((s, i) => [`S${i + 1}`, s]))
}

const kg = (n: number) => `${n.toLocaleString('fr-FR')} kg`

export function programmeTexte(programme: Programme, exos: Map<string, Exercice>): string {
  return [...codesSeances(programme)]
    .map(([code, s]) => {
      const jour = s.jourSemaine ? ` (${NOM_JOUR[s.jourSemaine].toLowerCase()})` : ''
      const lignes = s.exercices.map(
        (p) => `  - ${p.exerciceId} « ${exos.get(p.exerciceId)?.nom ?? '?'} » : ${p.series} × ${p.reps} à ${p.poidsKg > 0 ? kg(p.poidsKg) : 'poids libre'}`,
      )
      return `${code} ${s.nom}${jour}\n${lignes.join('\n') || '  (vide)'}`
    })
    .join('\n')
}

export function historiqueTexte(seances: SeanceRealisee[], exos: Map<string, Exercice>): string {
  const parSemaine = new Map<number, SeanceRealisee[]>()
  for (const s of seances) parSemaine.set(s.semaine ?? 0, [...(parSemaine.get(s.semaine ?? 0) ?? []), s])
  return [...parSemaine]
    .sort((a, b) => a[0] - b[0])
    .map(([n, liste]) => {
      const blocs = liste
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => {
          const b = bilanSeance(s)
          const entete = [
            `${s.nom} — ${new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
            `${b.validees}/${b.total} séries validées`,
            s.ressenti ? `ressenti : ${RESSENTIS[s.ressenti - 1][2]}` : '',
            s.douleurs?.length ? `douleurs : ${s.douleurs.map((z) => NOM_ZONE[z]).join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' · ')
          const exosTexte = s.exercices.map((e) => `    ${exos.get(e.exerciceId)?.nom ?? e.exerciceId} : ${formaterSeries(e.series)}`)
          const echecs = b.echecs.map((e) => `    ⚠ ${exos.get(e.exerciceId)?.nom} série ${e.serie} : ${e.detail}`)
          const note = s.note ? [`    Note : ${s.note}`] : []
          return [`  ${entete}`, ...exosTexte, ...echecs, ...note].join('\n')
        })
      return `Semaine ${n}\n${blocs.join('\n')}`
    })
    .join('\n\n')
}

export function equilibreTexte(programme: Programme, exercices: Exercice[]): string {
  const vol = volumeHebdo(programme, indexer(exercices))
  const parMuscle = MUSCLES.map((m) => `${NOM_MUSCLE[m]} ${formaterVolume(vol[m])} (${statut(m, vol[m])})`).join(' ; ')
  const liste = alertes(programme, exercices, 'jourFixe').map((a) => `- ${a.message}`)
  return `Séries par semaine : ${parMuscle}\n${liste.length ? `Alertes :\n${liste.join('\n')}` : 'Aucune alerte.'}`
}

/** Séries par séance selon la durée disponible. */
export function seriesParSeance(dureeMin: number | undefined): number {
  if (!dureeMin) return 20
  return Math.round(8 + dureeMin * 0.2)
}
