// Scénarios de test de l'IA avec la VRAIE API Gemini (pas lancés par `npm test` sans clé).
// Lancement :  GEMINI_API_KEY=ta_cle npm run eval:ia
// Rapport écrit dans scripts/eval-ia-rapport.md (ignoré par git).
import { appendFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BIBLIOTHEQUE } from '../src/data/bibliotheque'
import { NOM_MUSCLE } from '../src/data/muscles'
import { MODELES, creerProgrammeDepuisModele } from '../src/data/modeles'
import { appelerGemini } from '../src/ia/gemini'
import { alertes, indexer } from '../src/logique/equilibre'
import {
  INSTRUCTIONS_BILAN,
  INSTRUCTIONS_CREATION,
  MODELE_IA_DEFAUT,
  SCHEMA_BILAN,
  SCHEMA_PROGRAMME,
  contexteBilan,
  contexteCreation,
  musclesAMenager,
  verifierAnalyse,
  verifierProgrammeIA,
} from '../src/logique/ia'
import { PROFIL_VIDE } from '../src/logique/profil'
import { proposerProgression } from '../src/logique/progression'
import { resumePrescription } from '../src/logique/programme'
import { demarrerSeance } from '../src/logique/seance'
import type { Profil, Programme, SeanceRealisee } from '../src/types'

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const CLE = env.GEMINI_API_KEY
const MODELE = env.GEMINI_MODELE ?? MODELE_IA_DEFAUT
const RAPPORT = 'scripts/eval-ia-rapport.md'
const exos = indexer(BIBLIOTHEQUE)
const ecrire = (t: string) => appendFileSync(RAPPORT, `${t}\n`)

/** Appelle l'IA ; en cas d'erreur, l'écrit dans le rapport (avec la durée) avant de la relancer. */
async function appelerOuNoter(nom: string, appel: () => Promise<unknown>): Promise<{ brut: unknown; secondes: number }> {
  const debut = Date.now()
  try {
    const brut = await appel()
    return { brut, secondes: Math.round((Date.now() - debut) / 1000) }
  } catch (e) {
    ecrire(`\n## ${nom}\n❌ **Erreur après ${Math.round((Date.now() - debut) / 1000)} s** : ${(e as Error).message}`)
    throw e
  }
}

// ---------- Données de test ----------

const intermediaire: Profil = {
  ...PROFIL_VIDE,
  sexe: 'homme',
  anneeNaissance: 1996,
  tailleCm: 180,
  poidsKg: 78,
  niveau: 'intermediaire',
  anneesPratique: 2,
  objectif: 'muscle',
  musclesPrioritaires: ['dos', 'epaules_laterales'],
  seancesParSemaine: 4,
  dureeSeanceMin: 75,
  joursDisponibles: [1, 2, 4, 5],
  lieu: 'salle_complete',
  equipements: ['barre', 'halteres', 'machine', 'poulie', 'poids_du_corps'],
  sommeilHeures: 7,
  stress: 'moyen',
  activiteQuotidienne: 'moyen',
  records: { squat: 120, developpe_couche: 90, souleve_de_terre: 140, developpe_militaire: 55, tractions: 10 },
}

function programmeAvecPoids(): Programme {
  const p = creerProgrammeDepuisModele(MODELES.find((m) => m.id === 'upper-lower-4')!)
  const poids: Record<string, number> = {
    'developpe-couche-barre': 80,
    'rowing-barre': 70,
    'developpe-epaules-halteres': 22,
    'tirage-vertical': 60,
    'elevations-laterales-halteres': 10,
    'curl-halteres': 14,
    'extension-triceps-corde': 25,
    squat: 100,
    'souleve-de-terre-roumain': 90,
    'presse-cuisses': 160,
    'leg-curl-assis': 45,
    'mollets-debout': 80,
    'developpe-incline-halteres': 28,
    'souleve-de-terre': 130,
    'hip-thrust': 100,
  }
  for (const s of p.seances) for (const e of s.exercices) e.poidsKg = poids[e.exerciceId] ?? e.poidsKg
  return p
}

/** Semaine réalisée : `echec(exerciceId)` renvoie les reps faites par série (sinon tout réussi). */
function semaine(
  p: Programme,
  numero: number,
  options: { ressenti: number; douleurs?: SeanceRealisee['douleurs']; echec?: (id: string) => number[] | undefined; note?: string },
): SeanceRealisee[] {
  return p.seances.map((s, i) => {
    const r = demarrerSeance(s, new Date(2026, 10, 2 + 7 * (numero - 1) + i), numero)
    r.enCours = false
    r.ressenti = options.ressenti
    r.douleurs = options.douleurs
    r.note = i === 0 ? options.note : undefined
    for (const e of r.exercices) {
      const reps = options.echec?.(e.exerciceId)
      e.series.forEach((x, j) => {
        x.validee = true
        if (reps) x.repsFaites = reps[j] ?? x.repsPrevues
      })
    }
    return r
  })
}

// ---------- Exécution ----------

async function bilan(nom: string, profil: Profil, p: Programme, historique: SeanceRealisee[], numero: number) {
  const cette = historique.filter((s) => s.semaine === numero)
  const avant = historique.filter((s) => s.semaine === numero - 1)
  const contexte = contexteBilan({
    profil,
    programme: p,
    exercices: BIBLIOTHEQUE,
    historique,
    numeroSemaine: numero,
    propositionsRegles: proposerProgression(p, exos, cette, avant),
    refusRecents: [],
  })
  const { brut, secondes } = await appelerOuNoter(nom, () =>
    appelerGemini({ cle: CLE!, modele: MODELE, instructions: INSTRUCTIONS_BILAN, contexte, schema: SCHEMA_BILAN }),
  )
  const a = verifierAnalyse(brut, p, BIBLIOTHEQUE, profil)
  ecrire(`\n## ${nom}\n_${secondes} s · contexte ${contexte.length} caractères_\n`)
  ecrire(`**Conseils**\n${a.conseils.map((c) => `- ${c}`).join('\n') || '- (aucun)'}`)
  ecrire(`\n**Propositions retenues**\n${a.propositions.map((x) => `- ${x.description} — ${x.raison}`).join('\n') || '- (aucune)'}`)
  ecrire(`\n**Écartées par l'app**\n${a.rejets.map((r) => `- ${r}`).join('\n') || '- (aucune)'}`)
  return a
}

async function creation(nom: string, profil: Profil, nb: number) {
  const { brut, secondes } = await appelerOuNoter(nom, () =>
    appelerGemini({
      cle: CLE!,
      modele: MODELE,
      instructions: INSTRUCTIONS_CREATION,
      contexte: contexteCreation(profil, BIBLIOTHEQUE, nb),
      schema: SCHEMA_PROGRAMME,
    }),
  )
  const r = verifierProgrammeIA(brut, BIBLIOTHEQUE, profil, nb)
  const al = alertes(r.programme, BIBLIOTHEQUE, 'jourFixe')
  ecrire(`\n## ${nom}\n_${secondes} s_\n`)
  ecrire(`**${r.programme.nom}** — ${r.explication}\n`)
  for (const s of r.programme.seances) {
    ecrire(`- **${s.nom}** (jour ${s.jourSemaine})`)
    for (const e of s.exercices) ecrire(`  - ${exos.get(e.exerciceId)?.nom} : ${resumePrescription(e, exos.get(e.exerciceId))}`)
  }
  ecrire(`\n**Alertes d'équilibre**\n${al.map((x) => `- ${x.niveau} : ${x.message}`).join('\n') || '- aucune'}`)
  ecrire(`\n**Écartés par l'app**\n${r.rejets.map((x) => `- ${x}`).join('\n') || '- (aucun)'}`)
  return { ...r, alertes: al }
}

describe.skipIf(!CLE)(`Scénarios IA réels (${MODELE})`, { timeout: 300_000 }, () => {
  it('prépare le rapport', () => {
    writeFileSync(RAPPORT, `# Rapport de test de l'IA\n\nModèle : \`${MODELE}\` · ${new Date().toLocaleString('fr-FR')}\n`)
  })

  it('1. Création : intermédiaire, salle complète, 4 séances', async () => {
    const r = await creation('1. Création — intermédiaire, salle complète, 4 séances', intermediaire, 4)
    expect(r.programme.seances).toHaveLength(4)
    expect(r.alertes.filter((a) => a.niveau === 'rouge')).toHaveLength(0)
  })

  it('2. Création : débutant à la maison, haltères seulement, douleur à l’épaule', async () => {
    const profil: Profil = {
      ...PROFIL_VIDE,
      sexe: 'femme',
      anneeNaissance: 1990,
      niveau: 'debutant',
      objectif: 'forme',
      seancesParSemaine: 3,
      dureeSeanceMin: 45,
      joursDisponibles: [1, 3, 6],
      lieu: 'maison',
      equipements: ['halteres', 'poids_du_corps'],
      blessures: [{ id: 'b', zone: 'epaule', cote: 'droite', gravite: 'douleur', active: true, note: 'quand je lève le bras' }],
      exercicesAEviter: ['developpe-epaules-halteres'],
    }
    const r = await creation('2. Création — débutante, maison, haltères, douleur épaule', profil, 3)
    // Muscles rouges acceptables seulement s'ils sont « à ménager » (épaules)
    const aMenager = musclesAMenager(profil).map((m) => NOM_MUSCLE[m])
    const rougesInjustifies = r.alertes.filter((a) => a.niveau === 'rouge' && !aMenager.some((n) => a.message.startsWith(n)))
    expect(rougesInjustifies.map((a) => a.message)).toEqual([])
    const tous = r.programme.seances.flatMap((s) => s.exercices.map((e) => exos.get(e.exerciceId)!))
    expect(tous.every((e) => e.equipement === 'halteres' || e.equipement === 'poids_du_corps')).toBe(true)
    expect(tous.some((e) => e.id === 'developpe-epaules-halteres')).toBe(false)
  })

  it('3. Bilan : semaine facile, tout réussi, ressenti au top', async () => {
    const p = programmeAvecPoids()
    const a = await bilan('3. Bilan — tout réussi, ressenti au top', intermediaire, p, [...semaine(p, 1, { ressenti: 4 }), ...semaine(p, 2, { ressenti: 5 })], 2)
    expect(a.propositions.length).toBeLessThanOrEqual(6)
  })

  it('4. Bilan : douleur à l’épaule signalée', async () => {
    const p = programmeAvecPoids()
    const profil: Profil = {
      ...intermediaire,
      blessures: [{ id: 'b', zone: 'epaule', cote: 'gauche', gravite: 'douleur', active: true, note: 'au développé' }],
    }
    const a = await bilan(
      '4. Bilan — douleur épaule',
      profil,
      p,
      semaine(p, 3, {
        ressenti: 2,
        douleurs: ['epaule'],
        echec: (id) => (id === 'developpe-epaules-halteres' ? [10, 7, 5] : undefined),
        note: "Mal à l'épaule gauche au développé",
      }),
      3,
    )
    // Garde-fou de l'app : aucune hausse sur un exercice d'épaule ne doit passer
    const epaules = a.propositions.filter((x) => exos.get(x.exerciceId)?.musclesPrincipaux.some((m) => m.startsWith('epaules')))
    expect(epaules.filter((x) => x.type === 'ajouter')).toHaveLength(0)
  })

  it('5. Bilan : stagnation au développé couché, sommeil court', async () => {
    const p = programmeAvecPoids()
    const profil: Profil = { ...intermediaire, sommeilHeures: 5, stress: 'eleve' }
    const echec = (id: string) => (id === 'developpe-couche-barre' ? [6, 5, 5, 4] : undefined)
    await bilan(
      '5. Bilan — stagnation DC, sommeil 5 h, stress élevé',
      profil,
      p,
      [...semaine(p, 4, { ressenti: 2, echec }), ...semaine(p, 5, { ressenti: 2, echec, note: 'Crevé cette semaine' })],
      5,
    )
  })
})
