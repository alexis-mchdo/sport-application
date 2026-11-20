import { db, lireProfil, lireReglages } from './db'
import { appelerGemini, ErreurIA } from './ia/gemini'
import {
  INSTRUCTIONS_BILAN,
  INSTRUCTIONS_CREATION,
  SCHEMA_BILAN,
  SCHEMA_PROGRAMME,
  contexteBilan,
  contexteCreation,
  verifierAnalyse,
  verifierProgrammeIA,
  type AnalyseIA,
  type ProgrammeIA,
} from './logique/ia'
import { proposerProgression } from './logique/progression'

/** Analyse IA de la semaine en cours, gardée tant que la semaine n'est pas clôturée. */
export interface AnalyseSemaine {
  semaine: number
  /** ISO 8601 */
  date: string
  analyse: AnalyseIA
  /** Identifiants des propositions acceptées (les autres sont refusées) */
  acceptees: string[]
}

const CLE_ANALYSE = 'analyseIA'

export async function lireAnalyseSemaine(): Promise<AnalyseSemaine | null> {
  const [ligne, reglages] = await Promise.all([db.reglages.get(CLE_ANALYSE), lireReglages()])
  const a = ligne?.valeur as AnalyseSemaine | undefined
  return a && a.semaine === reglages.semaine.numero ? a : null
}

async function parametresIA() {
  const r = await lireReglages()
  if (!r.cleIA) throw new ErreurIA("Ajoute d'abord ta clé IA dans Réglages → IA.")
  return { cle: r.cleIA, modele: r.modeleIA, reflexion: r.reflexionIA === 'rapide' ? ('LOW' as const) : undefined, reglages: r }
}

export async function analyserSemaine(): Promise<void> {
  const { cle, modele, reflexion, reglages } = await parametresIA()
  const numero = reglages.semaine.numero
  const [profil, programmes, exercices, realisees, bilans] = await Promise.all([
    lireProfil(),
    db.programmes.toArray(),
    db.exercices.toArray(),
    db.seancesRealisees.toArray(),
    db.bilans.toArray(),
  ])
  const programme = programmes.find((p) => p.actif)
  if (!programme) throw new ErreurIA('Aucun programme actif.')
  const terminees = realisees.filter((s) => !s.enCours)
  const exos = new Map(exercices.map((e) => [e.id, e]))
  const propositionsRegles = proposerProgression(
    programme,
    exos,
    terminees.filter((s) => s.semaine === numero),
    terminees.filter((s) => s.semaine === numero - 1),
  )
  const refusRecents = bilans
    .filter((b) => Number(b.semaine) >= numero - 3)
    .flatMap((b) => b.ia?.refusees ?? [])

  const reponse = await appelerGemini({
    cle,
    modele,
    reflexion,
    instructions: INSTRUCTIONS_BILAN,
    contexte: contexteBilan({
      profil,
      programme,
      exercices,
      historique: terminees.filter((s) => (s.semaine ?? 0) > numero - 4),
      numeroSemaine: numero,
      propositionsRegles,
      refusRecents,
    }),
    schema: SCHEMA_BILAN,
  })
  const analyse = verifierAnalyse(reponse, programme, exercices, profil)
  const valeur: AnalyseSemaine = { semaine: numero, date: new Date().toISOString(), analyse, acceptees: [] }
  await db.reglages.put({ cle: CLE_ANALYSE, valeur })
}

export async function choisirPropositionIA(id: string, accepte: boolean) {
  await db.transaction('rw', db.reglages, async () => {
    const ligne = await db.reglages.get(CLE_ANALYSE)
    const a = ligne?.valeur as AnalyseSemaine | undefined
    if (!a) return
    a.acceptees = accepte ? [...new Set([...a.acceptees, id])] : a.acceptees.filter((x) => x !== id)
    await db.reglages.put({ cle: CLE_ANALYSE, valeur: a })
  })
}

export async function effacerAnalyseSemaine() {
  await db.reglages.delete(CLE_ANALYSE)
}

export async function creerProgrammeAvecIA(nbSeances: number): Promise<ProgrammeIA> {
  const { cle, modele, reflexion } = await parametresIA()
  const [profil, exercices] = await Promise.all([lireProfil(), db.exercices.toArray()])
  const reponse = await appelerGemini({
    cle,
    modele,
    reflexion,
    instructions: INSTRUCTIONS_CREATION,
    contexte: contexteCreation(profil, exercices, nbSeances),
    schema: SCHEMA_PROGRAMME,
  })
  return verifierProgrammeIA(reponse, exercices, profil, nbSeances)
}
