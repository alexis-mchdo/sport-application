// Échanges avec Claude par copier-coller (sans API) — docs/CONCEPTION.md §8 :
// 1. l'app prépare un texte (bilan, création / adaptation du programme, question libre) ;
// 2. pour le programme, Claude répond avec un bloc JSON que l'utilisateur recolle dans l'app ;
// 3. l'app vérifie ce programme avant de l'utiliser (exercices connus et autorisés, valeurs plausibles).
import { JOURS_PAR_DEFAUT } from '../data/modeles'
import { NOM_JOUR } from '../data/jours'
import { NOM_MUSCLE } from '../data/muscles'
import type { Exercice, Profil, Programme, SeanceRealisee, Seance } from '../types'
import {
  catalogue,
  ciblesTexte,
  equilibreTexte,
  exercicesAutorises,
  historiqueTexte,
  musclesAMenager,
  programmeTexte,
  seriesParSeance,
} from './contexte'
import { indexer } from './equilibre'
import { profilEnTexte } from './profil'
import { prescriptionParDefaut } from './programme'
import type { Proposition } from './progression'

export type TypeDemande = 'bilan' | 'programme' | 'libre'
export type ModeProgramme = 'creer' | 'adapter'

export interface DonneesClaude {
  profil: Profil
  programme?: Programme
  exercices: Exercice[]
  /** Séances terminées des 4 dernières semaines */
  historique: SeanceRealisee[]
  numeroSemaine: number
  propositionsRegles: Proposition[]
}

export interface OptionsDemande {
  questionLibre?: string
  mode?: ModeProgramme
  nbSeances?: number
  /** Consignes libres pour le programme (ex. « mal au genou », « plus de bras ») */
  consignes?: string
}

const FIN = 'Réponds en français, de façon concise et concrète, en me tutoyant.'

function texteBilan(d: DonneesClaude, exos: Map<string, Exercice>): string {
  const q = `Fais le bilan de ma semaine d'entraînement n° ${d.numeroSemaine} : ce qui s'est bien passé, ce qui coince, et les ajustements concrets que tu ferais pour la semaine prochaine (charges, exercices, volume, récupération). Sois prudent avec mes douleurs éventuelles. Si tu proposes de modifier le programme, dis-le : je te demanderai ensuite le programme adapté.`
  const blocs = [`Je fais de la musculation et je suis mes séances avec une app perso. Voici mes données.\n\n${q}`, profilEnTexte(d.profil, exos)]
  if (d.programme) {
    blocs.push(`Mon programme actuel :\n${programmeTexte(d.programme, exos)}`)
    blocs.push(`Équilibre du programme (séries par semaine : 1 par muscle principal, ½ par muscle secondaire) :\n${equilibreTexte(d.programme, d.exercices)}`)
  }
  blocs.push(`Mes séances des 4 dernières semaines :\n${historiqueTexte(d.historique, exos) || 'Aucune séance.'}`)
  const regles = d.propositionsRegles
    .filter((p) => p.type === 'monter' || p.type === 'baisser')
    .map((p) => `- ${exos.get(p.exerciceId)?.nom} : ${p.avant.poidsKg} → ${p.apres.poidsKg} kg, ${p.avant.reps} → ${p.apres.reps} reps (${p.raison})`)
  if (regles.length) blocs.push(`Ce que mon app propose déjà pour la semaine prochaine :\n${regles.join('\n')}`)
  blocs.push(`Pour rappel, ma demande : ${q}\n${FIN}`)
  return blocs.join('\n\n')
}

function texteLibre(d: DonneesClaude, exos: Map<string, Exercice>, question: string): string {
  const q = question.trim() || '(écris ta question ici)'
  const blocs = [`Je fais de la musculation et je suis mes séances avec une app perso. Voici mes données.\n\n${q}`, profilEnTexte(d.profil, exos)]
  if (d.programme) blocs.push(`Mon programme actuel :\n${programmeTexte(d.programme, exos)}`)
  blocs.push(`Mes séances des 4 dernières semaines :\n${historiqueTexte(d.historique, exos) || 'Aucune séance.'}`)
  blocs.push(`Pour rappel, ma question : ${q}\n${FIN}`)
  return blocs.join('\n\n')
}

const EXEMPLE_JSON = `{
  "nom": "Haut / Bas",
  "explication": "2 à 4 phrases qui justifient les grands choix.",
  "seances": [
    {
      "nom": "Haut A",
      "jour": 1,
      "exercices": [
        { "exercice": "developpe-couche-barre", "series": 4, "reps": 8, "poidsKg": 80 },
        { "exercice": "tractions-pronation", "series": 4, "reps": 8, "poidsKg": 0 }
      ]
    }
  ]
}`

function texteProgramme(d: DonneesClaude, exos: Map<string, Exercice>, o: OptionsDemande): string {
  const adapter = o.mode === 'adapter' && !!d.programme
  const nb = o.nbSeances ?? d.profil.seancesParSemaine ?? d.programme?.seances.length ?? 4
  const jours = d.profil.joursDisponibles.length ? d.profil.joursDisponibles.map((j) => NOM_JOUR[j].toLowerCase()).join(', ') : 'non précisés'
  // Le catalogue : exercices autorisés + ceux déjà au programme (pour que Claude puisse les garder)
  const ids = new Set(exercicesAutorises(d.exercices, d.profil).map((e) => e.id))
  const dejaAuProgramme = d.programme?.seances.flatMap((s) => s.exercices.map((e) => e.exerciceId)) ?? []
  const autorises = d.exercices.filter((e) => ids.has(e.id) || (adapter && dejaAuProgramme.includes(e.id) && !d.profil.exercicesAEviter.includes(e.id)))

  const demande = adapter
    ? `Adapte mon programme de musculation actuel pour la suite, à partir de mon profil et de mes dernières séances.`
    : `Crée-moi un programme de musculation hebdomadaire à partir de mon profil.`
  const consignes = o.consignes?.trim() ? `\n\nMes consignes : ${o.consignes.trim()}` : ''

  const blocs = [
    `Je fais de la musculation et je suis mes séances avec une app perso. ${demande}${consignes}\n\nTa réponse sera importée automatiquement dans mon app : respecte exactement le format demandé à la fin.`,
    profilEnTexte(d.profil, exos),
  ]
  if (adapter && d.programme) {
    blocs.push(`Mon programme actuel :\n${programmeTexte(d.programme, exos)}`)
    blocs.push(`Équilibre du programme actuel :\n${equilibreTexte(d.programme, d.exercices)}`)
    blocs.push(`Mes séances des 4 dernières semaines :\n${historiqueTexte(d.historique, exos) || 'Aucune séance.'}`)
  }
  blocs.push(
    [
      'Contraintes :',
      `- ${nb} séances par semaine, chacune sur un jour différent (jour : 1 = lundi … 7 = dimanche). Jours disponibles : ${jours}. Évite de travailler le même muscle deux jours de suite.`,
      `- Environ ${seriesParSeance(d.profil.dureeSeanceMin)} séries par séance.`,
      `- Séries par semaine et par muscle à viser (1 par muscle principal, ½ par muscle secondaire) : ${ciblesTexte()}. Chaque muscle doit atteindre son minimum, sauf les muscles à ménager : ${musclesAMenager(d.profil).map((m) => NOM_MUSCLE[m]).join(', ') || 'aucun'}.`,
      '- Blessure ou douleur actuelle : jamais d’augmentation de charge ni de volume sur un exercice qui sollicite la zone ; préfère une variante moins contraignante. Pas de diagnostic médical.',
      '- Polyarticulaires en début de séance, isolation ensuite. Noms de séances courts (20 caractères max).',
      adapter
        ? '- Garde ce qui marche : mêmes noms pour les séances que tu conserves (pour garder mon historique), charges actuelles reprises telles quelles sauf raison précise (échecs, douleur, progression).'
        : '- Poids de départ : environ 70 % du record pour 8 répétitions quand je l’ai indiqué ; sinon 0 (je le réglerai).',
      '- N’utilise QUE des exercices du catalogue ci-dessous, avec leur identifiant exact (1re colonne).',
    ].join('\n'),
  )
  blocs.push(`Catalogue des exercices (id | nom | muscles principaux (+ secondaires) | équipement | palier) :\n${catalogue(autorises)}`)
  blocs.push(
    [
      'Format de réponse (obligatoire) : quelques lignes d’explication si tu veux, puis UN SEUL bloc de code ```json contenant le programme COMPLET, exactement sous cette forme :',
      '```json',
      EXEMPLE_JSON,
      '```',
      '« poidsKg » en kg (0 = poids du corps ou à régler), arrondi au palier de l’exercice. « series » de 1 à 6, « reps » de 1 à 30.',
      FIN,
    ].join('\n'),
  )
  return blocs.join('\n\n')
}

/** Construit le texte à coller dans Claude. */
export function texteClaude(type: TypeDemande, d: DonneesClaude, o: OptionsDemande = {}): string {
  const exos = indexer(d.exercices)
  if (type === 'bilan') return texteBilan(d, exos)
  if (type === 'programme') return texteProgramme(d, exos, o)
  return texteLibre(d, exos, o.questionLibre ?? '')
}

// ---------------------------------------------------------------------------
// Lecture et vérification du programme renvoyé par Claude
// ---------------------------------------------------------------------------

/** Extrait l'objet JSON d'une réponse (bloc ```json, sinon du premier « { » au dernier « } »). */
export function extraireJson(reponse: string): unknown {
  const blocs = [...reponse.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1])
  const debut = reponse.indexOf('{')
  const fin = reponse.lastIndexOf('}')
  const candidats = [...blocs.reverse(), ...(debut >= 0 && fin > debut ? [reponse.slice(debut, fin + 1)] : [])]
  for (const c of candidats) {
    try {
      return JSON.parse(c.trim())
    } catch {
      // essai suivant
    }
  }
  throw new Error("Aucun programme lisible dans ce texte. Copie bien toute la réponse de Claude (ou le bloc de code « json »).")
}

export interface ProgrammeImporte {
  programme: Programme
  explication: string
  /** Éléments écartés par l'app, avec la raison */
  rejets: string[]
}

const entier = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : undefined)
const nombre = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const texte = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const arrondirPalier = (poids: number, pas: number) => Math.max(0, Math.round(poids / pas) * pas)

/** Vérifie et nettoie un programme reçu. Lève une erreur s'il est inutilisable. */
export function verifierProgramme(json: unknown, exercices: Exercice[], profil: Profil, programmeActuel?: Programme): ProgrammeImporte {
  const exos = indexer(exercices)
  const autorises = new Set(exercicesAutorises(exercices, profil).map((e) => e.id))
  // Un exercice déjà au programme reste accepté (sauf s'il est « à éviter »)
  for (const s of programmeActuel?.seances ?? [])
    for (const e of s.exercices) if (!profil.exercicesAEviter.includes(e.exerciceId)) autorises.add(e.exerciceId)
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

  if (seances.length === 0) throw new Error("Ce programme ne contient aucune séance utilisable.")

  // Jours manquants ou en double : on complète avec les jours disponibles puis les jours par défaut
  const candidats = [...profil.joursDisponibles, ...(JOURS_PAR_DEFAUT[seances.length] ?? []), 1, 2, 3, 4, 5, 6, 7]
  for (const s of seances)
    if (!s.jourSemaine) {
      s.jourSemaine = candidats.find((j) => !joursPris.has(j))
      if (s.jourSemaine) joursPris.add(s.jourSemaine)
    }

  return {
    programme: {
      id: crypto.randomUUID(),
      nom: texte(brut.nom).slice(0, 40) || 'Programme Claude',
      joursParSemaine: seances.length,
      actif: true,
      seances: seances.sort((a, b) => (a.jourSemaine ?? 9) - (b.jourSemaine ?? 9)).map((s, i) => ({ ...s, ordre: i })),
    },
    explication: texte(brut.explication).slice(0, 800),
    rejets,
  }
}

/** Lit la réponse collée : extraction du JSON puis vérification. */
export function lireReponseProgramme(reponse: string, exercices: Exercice[], profil: Profil, programmeActuel?: Programme): ProgrammeImporte {
  return verifierProgramme(extraireJson(reponse), exercices, profil, programmeActuel)
}
