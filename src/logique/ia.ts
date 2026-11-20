// IA (Gemini) : ce qu'on lui envoie, le format de réponse imposé, et les vérifications de l'app.
// L'IA ne discute pas : elle renvoie des propositions structurées que l'app vérifie,
// puis que l'utilisateur accepte ou refuse. Voir docs/CONCEPTION.md §11.
import { JOURS_PAR_DEFAUT } from '../data/modeles'
import { NOM_JOUR } from '../data/jours'
import { MUSCLES, NOM_EQUIPEMENT, NOM_MUSCLE } from '../data/muscles'
import { RESSENTIS } from '../data/ressentis'
import type { Blessure, Exercice, Muscle, Profil, Programme, SeanceRealisee, Seance, ZoneCorps } from '../types'
import { CIBLES, alertes, formaterSeries as formaterVolume, indexer, statut, volumeHebdo } from './equilibre'
import { NOM_ZONE, profilEnTexte } from './profil'
import { prescriptionParDefaut, seancesTriees } from './programme'
import type { Proposition as PropositionRegle } from './progression'
import { bilanSeance, formaterSeries } from './seance'

export const MODELE_IA_DEFAUT = 'gemini-flash-latest'

const MAX_PROPOSITIONS = 6
const MAX_CONSEILS = 3
const MAX_HAUSSE_CHARGE = 0.1

// ---------------------------------------------------------------------------
// Sécurité : muscles sollicités par une zone douloureuse
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Contexte envoyé à l'IA
// ---------------------------------------------------------------------------

/** Exercices que l'IA a le droit de proposer : ni « à éviter », ni hors du matériel disponible. */
export function exercicesAutorises(exercices: Exercice[], profil: Profil): Exercice[] {
  return exercices.filter(
    (e) =>
      !profil.exercicesAEviter.includes(e.id) &&
      (profil.equipements.length === 0 || e.equipement === 'poids_du_corps' || profil.equipements.includes(e.equipement)),
  )
}

function catalogue(exercices: Exercice[]): string {
  return exercices
    .map(
      (e) =>
        `${e.id} | ${e.nom} | ${e.musclesPrincipaux.map((m) => NOM_MUSCLE[m]).join(', ')}` +
        `${e.musclesSecondaires.length ? ` (+ ${e.musclesSecondaires.map((m) => NOM_MUSCLE[m]).join(', ')})` : ''}` +
        ` | ${NOM_EQUIPEMENT[e.equipement]} | palier ${e.incrementKg} kg`,
    )
    .join('\n')
}

const ciblesTexte = () =>
  MUSCLES.map((m) => `${NOM_MUSCLE[m]} ${CIBLES[m].min}–${CIBLES[m].max}`).join(' ; ')

/** Codes courts S1, S2… pour désigner les séances (plus fiable que des identifiants longs). */
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

const REGLES_COMMUNES = `Règles impératives :
- Utilise UNIQUEMENT des identifiants d'exercices présents dans le catalogue fourni, recopiés exactement.
- Respecte les blessures : si une zone est douloureuse (blessure actuelle), n'augmente jamais la charge ni le volume d'un exercice qui la sollicite ; propose plutôt de baisser, de remplacer par une variante moins contraignante ou de retirer.
- Pas de diagnostic médical. Si une douleur revient plusieurs semaines, conseille de consulter un professionnel de santé.
- N'invente aucune donnée : base-toi seulement sur le profil, le programme et l'historique fournis.
- Écris en français, de façon directe et concise, et tutoie l'utilisateur.`

export const INSTRUCTIONS_BILAN = `Tu es un coach de musculation prudent et rigoureux. Tu analyses la semaine d'entraînement d'un pratiquant et tu proposes des ajustements de son programme pour la semaine suivante.
Tu ne discutes pas : tu réponds uniquement avec le JSON demandé.

${REGLES_COMMUNES}
- Jamais plus de +10 % de charge sur un exercice d'une semaine à l'autre ; au plus ±3 répétitions et ±1 série.
- Ne répète pas les changements de charge déjà proposés par l'app (liste « Propositions de l'app ») : complète-les (remplacement d'exercice, ajout pour un muscle trop bas, adaptation à une douleur, volume trop élevé, stagnation…).
- Ne repropose pas un changement que l'utilisateur a refusé récemment.
- Moins mais mieux : au plus ${MAX_PROPOSITIONS} propositions, seulement si elles sont vraiment utiles. Si la semaine s'est bien passée, renvoie une liste vide.
- Chaque proposition a une raison courte (une phrase) qui cite le fait observé.
- « conseils » : au plus ${MAX_CONSEILS} conseils courts (2 phrases maximum chacun), concrets et liés aux données (ressentis, douleurs, échecs, régularité, récupération). Pas de banalités.

Types de propositions :
- "charge" : modifier séries / reps / poids d'un exercice existant (donne seulement les champs qui changent).
- "remplacer" : remplacer "exercice" par "nouvelExercice" dans la même séance (même muscle principal).
- "ajouter" : ajouter "exercice" à une séance (avec séries, reps, poids).
- "retirer" : retirer "exercice" d'une séance.
"seance" est le code de la séance (S1, S2…).`

export const INSTRUCTIONS_CREATION = `Tu es un coach de musculation prudent et rigoureux. Tu crées le premier programme hebdomadaire d'un pratiquant à partir de son profil.
Tu ne discutes pas : tu réponds uniquement avec le JSON demandé.

${REGLES_COMMUNES}
- Exactement le nombre de séances demandé, chacune sur un jour différent (1 = lundi … 7 = dimanche), en privilégiant les jours disponibles et en évitant de travailler le même muscle deux jours de suite.
- Respecte la durée de séance : environ le nombre de séries indiqué par séance.
- CHAQUE muscle doit atteindre au moins le minimum de sa fourchette de séries par semaine (1 série par muscle principal, ½ par muscle secondaire), y compris les petits muscles (mollets, abdominaux, avant-bras, épaules latérales et arrière). Seule exception : les muscles « à ménager » à cause d'une douleur, que tu peux laisser plus bas (dis-le dans l'explication). Donne plus de volume aux muscles prioritaires.
- Avant de répondre, compte les séries par muscle sur la semaine et corrige le programme si un muscle est sous son minimum.
- Noms de séances courts (20 caractères maximum), par exemple « Haut A », « Jambes », « Full Body 1 ».
- Exercices polyarticulaires en début de séance, isolation ensuite.
- Poids de départ : environ 70 % du record pour 8 répétitions sur les mouvements correspondants ; mets 0 quand tu ne peux pas l'estimer (l'utilisateur le réglera). Arrondis au palier de l'exercice.
- Débutant : programme simple, peu d'exercices, mouvements faciles à apprendre.
- "explication" : 2 à 4 phrases qui justifient les grands choix du programme.`

export interface DonneesBilan {
  profil: Profil
  programme: Programme
  exercices: Exercice[]
  /** Séances terminées des 4 dernières semaines (semaine en cours incluse) */
  historique: SeanceRealisee[]
  numeroSemaine: number
  propositionsRegles: PropositionRegle[]
  refusRecents: string[]
}

export function contexteBilan(d: DonneesBilan): string {
  const exos = indexer(d.exercices)
  const autorises = exercicesAutorises(d.exercices, d.profil)
  const regles = d.propositionsRegles
    .filter((p) => p.type !== 'pasFait')
    .map((p) => {
      const nom = exos.get(p.exerciceId)?.nom
      const chiffre =
        p.avant.poidsKg !== p.apres.poidsKg
          ? `${kg(p.avant.poidsKg)} → ${kg(p.apres.poidsKg)}`
          : p.avant.reps !== p.apres.reps
            ? `${p.avant.reps} → ${p.apres.reps} reps`
            : 'inchangé'
      return `- ${nom} (${p.seanceNom}) : ${p.type} ${chiffre} — ${p.raison}`
    })
  return [
    profilEnTexte(d.profil, exos),
    `\nSemaine d'entraînement en cours : ${d.numeroSemaine}`,
    `\nProgramme actuel :\n${programmeTexte(d.programme, exos)}`,
    `\nÉquilibre du programme :\n${equilibreTexte(d.programme, d.exercices)}`,
    `\nHistorique (4 dernières semaines) :\n${historiqueTexte(d.historique, exos) || 'Aucune séance.'}`,
    `\nPropositions de l'app (déjà faites, ne pas répéter) :\n${regles.join('\n') || 'Aucune.'}`,
    `\nChangements refusés récemment par l'utilisateur :\n${d.refusRecents.map((r) => `- ${r}`).join('\n') || 'Aucun.'}`,
    `\nCatalogue des exercices autorisés (id | nom | muscles principaux (+ secondaires) | équipement | palier) :\n${catalogue(autorises)}`,
  ].join('\n')
}

/** Séries par séance selon la durée disponible. */
export function seriesParSeance(dureeMin: number | undefined): number {
  if (!dureeMin) return 20
  return Math.round(8 + dureeMin * 0.2)
}

export function contexteCreation(profil: Profil, exercices: Exercice[], nbSeances: number): string {
  const exos = indexer(exercices)
  const jours = profil.joursDisponibles.length ? profil.joursDisponibles.map((j) => `${j} (${NOM_JOUR[j]})`).join(', ') : 'non précisés'
  return [
    profilEnTexte(profil, exos),
    `\nÀ créer : ${nbSeances} séances par semaine, environ ${seriesParSeance(profil.dureeSeanceMin)} séries par séance.`,
    `Jours disponibles : ${jours}.`,
    `\nFourchettes de séries par semaine et par muscle : ${ciblesTexte()}.`,
    `Muscles à ménager (douleur) : ${musclesAMenager(profil).map((m) => NOM_MUSCLE[m]).join(', ') || 'aucun'}.`,
    `\nCatalogue des exercices autorisés (id | nom | muscles principaux (+ secondaires) | équipement | palier) :\n${catalogue(exercicesAutorises(exercices, profil))}`,
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Formats de réponse imposés (JSON Schema)
// ---------------------------------------------------------------------------

export const SCHEMA_BILAN = {
  type: 'object',
  properties: {
    propositions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['charge', 'remplacer', 'ajouter', 'retirer'] },
          seance: { type: 'string', description: 'Code de la séance : S1, S2…' },
          exercice: { type: 'string', description: "Identifiant exact de l'exercice concerné (ou ajouté)" },
          nouvelExercice: { type: 'string', description: 'Pour « remplacer » seulement : identifiant du nouvel exercice' },
          series: { type: 'integer' },
          reps: { type: 'integer' },
          poidsKg: { type: 'number' },
          raison: { type: 'string' },
        },
        required: ['type', 'seance', 'exercice', 'raison'],
      },
    },
    conseils: { type: 'array', items: { type: 'string' } },
  },
  required: ['propositions', 'conseils'],
}

export const SCHEMA_PROGRAMME = {
  type: 'object',
  properties: {
    nom: { type: 'string' },
    explication: { type: 'string' },
    seances: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nom: { type: 'string' },
          jour: { type: 'integer', description: '1 = lundi … 7 = dimanche' },
          exercices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                exercice: { type: 'string', description: "Identifiant exact de l'exercice" },
                series: { type: 'integer' },
                reps: { type: 'integer' },
                poidsKg: { type: 'number' },
              },
              required: ['exercice', 'series', 'reps', 'poidsKg'],
            },
          },
        },
        required: ['nom', 'jour', 'exercices'],
      },
    },
  },
  required: ['nom', 'explication', 'seances'],
}

// ---------------------------------------------------------------------------
// Vérification des réponses
// ---------------------------------------------------------------------------

export type TypePropositionIA = 'charge' | 'remplacer' | 'ajouter' | 'retirer'

export interface PropositionIA {
  id: string
  type: TypePropositionIA
  seanceId: string
  seanceNom: string
  exerciceId: string
  nouvelExerciceId?: string
  series?: number
  reps?: number
  poidsKg?: number
  raison: string
  /** Résumé lisible construit par l'app (ex. « Développé couché : 80 → 82,5 kg ») */
  description: string
}

export interface AnalyseIA {
  propositions: PropositionIA[]
  conseils: string[]
  /** Propositions écartées par l'app, avec la raison */
  rejets: string[]
}

const entier = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : undefined)
const nombre = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const texte = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const arrondirPalier = (poids: number, pas: number) => Math.max(0, Math.round(poids / pas) * pas)

function nbManquants(programme: Programme, exos: Map<string, Exercice>) {
  const vol = volumeHebdo(programme, exos)
  return MUSCLES.filter((m) => statut(m, vol[m]) === 'manquant').length
}

/**
 * Une proposition IA acceptée remplace la proposition de charge de l'app sur le même exercice
 * seulement si elle touche aussi au poids ou aux reps (ou remplace / retire l'exercice).
 * Sinon les deux s'additionnent : par ex. règle −10 % + IA 4 → 3 séries.
 */
export function iaRemplaceRegle(seanceId: string, exerciceId: string, accepteesIA: PropositionIA[]): boolean {
  return accepteesIA.some(
    (p) => p.seanceId === seanceId && p.exerciceId === exerciceId && (p.type !== 'charge' || p.poidsKg !== undefined || p.reps !== undefined),
  )
}

/** Applique des propositions validées à une copie du programme. */
export function appliquerPropositionsIA(programme: Programme, propositions: PropositionIA[], exos: Map<string, Exercice>): Programme {
  const p: Programme = structuredClone(programme)
  for (const prop of propositions) {
    const s = p.seances.find((x) => x.id === prop.seanceId)
    if (!s) continue
    const i = s.exercices.findIndex((e) => e.exerciceId === prop.exerciceId)
    if (prop.type === 'charge' && i >= 0) {
      const e = s.exercices[i]
      s.exercices[i] = { ...e, series: prop.series ?? e.series, reps: prop.reps ?? e.reps, poidsKg: prop.poidsKg ?? e.poidsKg }
    } else if (prop.type === 'remplacer' && i >= 0 && prop.nouvelExerciceId) {
      const e = s.exercices[i]
      s.exercices[i] = {
        exerciceId: prop.nouvelExerciceId,
        series: prop.series ?? e.series,
        reps: prop.reps ?? e.reps,
        poidsKg: prop.poidsKg ?? 0,
      }
    } else if (prop.type === 'ajouter' && i < 0) {
      const defaut = prescriptionParDefaut(exos.get(prop.exerciceId)!)
      s.exercices.push({ ...defaut, series: prop.series ?? defaut.series, reps: prop.reps ?? defaut.reps, poidsKg: prop.poidsKg ?? 0 })
    } else if (prop.type === 'retirer' && i >= 0) {
      s.exercices.splice(i, 1)
    }
  }
  return p
}

/**
 * Vérifie la réponse de l'IA pour le bilan. Toute proposition qui ne respecte pas les règles est écartée
 * (exercice inconnu ou à éviter, hausse trop forte, zone douloureuse, muscle qui deviendrait manquant…).
 */
export function verifierAnalyse(json: unknown, programme: Programme, exercices: Exercice[], profil: Profil): AnalyseIA {
  const exos = indexer(exercices)
  const autorises = new Set(exercicesAutorises(exercices, profil).map((e) => e.id))
  const codes = codesSeances(programme)
  const brut = (json ?? {}) as { propositions?: unknown; conseils?: unknown }
  const resultat: AnalyseIA = { propositions: [], conseils: [], rejets: [] }
  let courant = programme

  const items = Array.isArray(brut.propositions) ? brut.propositions.slice(0, MAX_PROPOSITIONS * 2) : []
  for (const [index, item] of items.entries()) {
    if (resultat.propositions.length >= MAX_PROPOSITIONS) break
    const o = (item ?? {}) as Record<string, unknown>
    const type = o.type as TypePropositionIA
    const seance = codes.get(texte(o.seance).toUpperCase())
    const exerciceId = texte(o.exercice)
    const exo = exos.get(exerciceId)
    const raison = texte(o.raison).slice(0, 240)
    const rejeter = (motif: string) => resultat.rejets.push(`${exo?.nom ?? (exerciceId || '?')} : ${motif}`)

    if (!['charge', 'remplacer', 'ajouter', 'retirer'].includes(type)) {
      rejeter('type de proposition inconnu')
      continue
    }
    if (!seance) {
      rejeter('séance inconnue')
      continue
    }
    if (!exo) {
      rejeter("exercice absent de la bibliothèque")
      continue
    }
    const prevu = seance.exercices.find((e) => e.exerciceId === exerciceId)
    const zone = zoneTouchee(exo, profil)
    let proposition: PropositionIA | null = null
    const base = { id: `ia-${index}`, type, seanceId: seance.id, seanceNom: seance.nom, exerciceId, raison }

    if (type === 'charge') {
      if (!prevu) {
        rejeter("pas dans cette séance")
        continue
      }
      const series = entier(o.series)
      const reps = entier(o.reps)
      const poidsBrut = nombre(o.poidsKg)
      const poids = poidsBrut === undefined ? undefined : arrondirPalier(poidsBrut, exo.incrementKg)
      const n = { series: series ?? prevu.series, reps: reps ?? prevu.reps, poids: poids ?? prevu.poidsKg }
      if (n.series < 1 || n.series > 8 || Math.abs(n.series - prevu.series) > 1) {
        rejeter('changement de séries trop important')
        continue
      }
      if (n.reps < 1 || n.reps > 30 || Math.abs(n.reps - prevu.reps) > 3) {
        rejeter('changement de répétitions trop important')
        continue
      }
      if (prevu.poidsKg > 0 && (n.poids > prevu.poidsKg * (1 + MAX_HAUSSE_CHARGE) + 1e-9 || n.poids < prevu.poidsKg * 0.6)) {
        rejeter('changement de charge trop important')
        continue
      }
      if (prevu.poidsKg === 0 && n.poids > 300) {
        rejeter('charge irréaliste')
        continue
      }
      const hausse = n.series > prevu.series || n.reps > prevu.reps || n.poids > prevu.poidsKg
      if (hausse && zone) {
        rejeter(`hausse refusée à cause de la douleur (${NOM_ZONE[zone].toLowerCase()})`)
        continue
      }
      if (n.series === prevu.series && n.reps === prevu.reps && n.poids === prevu.poidsKg) {
        rejeter('aucun changement')
        continue
      }
      const parts = []
      if (n.series !== prevu.series) parts.push(`${prevu.series} → ${n.series} séries`)
      if (n.reps !== prevu.reps) parts.push(`${prevu.reps} → ${n.reps} reps`)
      if (n.poids !== prevu.poidsKg) parts.push(`${kg(prevu.poidsKg)} → ${kg(n.poids)}`)
      proposition = {
        ...base,
        series: n.series !== prevu.series ? n.series : undefined,
        reps: n.reps !== prevu.reps ? n.reps : undefined,
        poidsKg: n.poids !== prevu.poidsKg ? n.poids : undefined,
        description: `${exo.nom} : ${parts.join(', ')}`,
      }
    } else if (type === 'remplacer') {
      const nouvel = exos.get(texte(o.nouvelExercice))
      if (!prevu) {
        rejeter('pas dans cette séance')
        continue
      }
      if (!nouvel || !autorises.has(nouvel.id)) {
        rejeter('remplaçant inconnu, à éviter ou sans le matériel')
        continue
      }
      if (seance.exercices.some((e) => e.exerciceId === nouvel.id)) {
        rejeter('remplaçant déjà dans la séance')
        continue
      }
      if (!nouvel.musclesPrincipaux.some((m) => exo.musclesPrincipaux.includes(m))) {
        rejeter("le remplaçant ne travaille pas le même muscle")
        continue
      }
      const poids = nombre(o.poidsKg)
      proposition = {
        ...base,
        nouvelExerciceId: nouvel.id,
        series: entier(o.series) && entier(o.series)! >= 1 && entier(o.series)! <= 8 ? entier(o.series) : undefined,
        reps: entier(o.reps) && entier(o.reps)! >= 1 && entier(o.reps)! <= 30 ? entier(o.reps) : undefined,
        poidsKg: poids !== undefined && poids <= 300 ? arrondirPalier(poids, nouvel.incrementKg) : undefined,
        description: `${exo.nom} → ${nouvel.nom}`,
      }
    } else if (type === 'ajouter') {
      if (prevu) {
        rejeter('déjà dans la séance')
        continue
      }
      if (!autorises.has(exo.id)) {
        rejeter('exercice à éviter ou sans le matériel')
        continue
      }
      if (zone) {
        rejeter(`ajout refusé à cause de la douleur (${NOM_ZONE[zone].toLowerCase()})`)
        continue
      }
      const series = entier(o.series)
      const reps = entier(o.reps)
      const poids = nombre(o.poidsKg)
      const defaut = prescriptionParDefaut(exo)
      const s = series && series >= 1 && series <= 6 ? series : defaut.series
      const r = reps && reps >= 1 && reps <= 30 ? reps : defaut.reps
      const pkg = poids !== undefined && poids >= 0 && poids <= 300 ? arrondirPalier(poids, exo.incrementKg) : 0
      proposition = {
        ...base,
        series: s,
        reps: r,
        poidsKg: pkg,
        description: `Ajouter ${exo.nom} (${s} × ${r}${pkg > 0 ? ` à ${kg(pkg)}` : ''})`,
      }
    } else {
      if (!prevu) {
        rejeter('pas dans cette séance')
        continue
      }
      proposition = { ...base, description: `Retirer ${exo.nom}` }
    }

    // Ne jamais rendre un muscle « manquant » qui ne l'était pas
    const apres = appliquerPropositionsIA(courant, [proposition], exos)
    if (nbManquants(apres, exos) > nbManquants(courant, exos)) {
      rejeter('rendrait un muscle manquant dans la semaine')
      continue
    }
    courant = apres
    resultat.propositions.push({ ...proposition, description: `${proposition.description} (${seance.nom})` })
  }

  resultat.conseils = (Array.isArray(brut.conseils) ? brut.conseils : [])
    .map(texte)
    .filter((c) => c.length > 0)
    .slice(0, MAX_CONSEILS)
    .map((c) => (c.length > 320 ? `${c.slice(0, 317)}…` : c))
  return resultat
}

export interface ProgrammeIA {
  programme: Programme
  explication: string
  rejets: string[]
}

/** Vérifie et nettoie un programme créé par l'IA. Lève une erreur s'il est inutilisable. */
export function verifierProgrammeIA(json: unknown, exercices: Exercice[], profil: Profil, nbSeances: number): ProgrammeIA {
  const exos = indexer(exercices)
  const autorises = new Set(exercicesAutorises(exercices, profil).map((e) => e.id))
  const brut = (json ?? {}) as { nom?: unknown; explication?: unknown; seances?: unknown }
  const rejets: string[] = []
  const joursPris = new Set<number>()
  const seances: Seance[] = []

  for (const item of Array.isArray(brut.seances) ? brut.seances.slice(0, 7) : []) {
    const o = (item ?? {}) as Record<string, unknown>
    const nom = texte(o.nom).slice(0, 40) || `Séance ${seances.length + 1}`
    const deja = new Set<string>()
    const exercicesSeance = []
    for (const x of Array.isArray(o.exercices) ? o.exercices : []) {
      const e = (x ?? {}) as Record<string, unknown>
      const exo = exos.get(texte(e.exercice))
      if (!exo || !autorises.has(exo.id)) {
        rejets.push(`${texte(e.exercice) || '?'} : exercice inconnu, à éviter ou sans le matériel`)
        continue
      }
      if (deja.has(exo.id)) continue
      deja.add(exo.id)
      const defaut = prescriptionParDefaut(exo)
      const series = entier(e.series)
      const reps = entier(e.reps)
      const poids = nombre(e.poidsKg)
      exercicesSeance.push({
        exerciceId: exo.id,
        series: series && series >= 1 && series <= 6 ? series : defaut.series,
        reps: reps && reps >= 1 && reps <= 30 ? reps : defaut.reps,
        poidsKg: poids !== undefined && poids >= 0 && poids <= 300 ? arrondirPalier(poids, exo.incrementKg) : 0,
      })
    }
    if (exercicesSeance.length === 0) {
      rejets.push(`${nom} : séance vide, ignorée`)
      continue
    }
    let jour = entier(o.jour)
    if (!jour || jour < 1 || jour > 7 || joursPris.has(jour)) jour = undefined
    if (jour) joursPris.add(jour)
    seances.push({ id: crypto.randomUUID(), nom, ordre: seances.length, jourSemaine: jour, exercices: exercicesSeance })
  }

  if (seances.length === 0) throw new Error("L'IA n'a pas proposé de programme utilisable. Réessaie.")

  // Jours manquants ou en double : on complète avec les jours disponibles puis les jours par défaut
  const candidats = [...profil.joursDisponibles, ...(JOURS_PAR_DEFAUT[nbSeances] ?? []), 1, 2, 3, 4, 5, 6, 7]
  for (const s of seances)
    if (!s.jourSemaine) {
      s.jourSemaine = candidats.find((j) => !joursPris.has(j))
      if (s.jourSemaine) joursPris.add(s.jourSemaine)
    }

  return {
    programme: {
      id: crypto.randomUUID(),
      nom: texte(brut.nom).slice(0, 40) || 'Programme IA',
      joursParSemaine: seances.length,
      actif: true,
      seances: seances.sort((a, b) => (a.jourSemaine ?? 9) - (b.jourSemaine ?? 9)).map((s, i) => ({ ...s, ordre: i })),
    },
    explication: texte(brut.explication).slice(0, 800),
    rejets,
  }
}
