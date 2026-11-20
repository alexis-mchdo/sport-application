import Dexie, { type EntityTable } from 'dexie'
import { BIBLIOTHEQUE } from './data/bibliotheque'
import { PROFIL_VIDE } from './logique/profil'
import type { BilanSemaine, Exercice, ModePlanning, Profil, Programme, Reglage, SeanceRealisee } from './types'

// Base locale (IndexedDB) — tout reste sur l'iPhone.
export const db = new Dexie('muscu') as Dexie & {
  exercices: EntityTable<Exercice, 'id'>
  programmes: EntityTable<Programme, 'id'>
  seancesRealisees: EntityTable<SeanceRealisee, 'id'>
  bilans: EntityTable<BilanSemaine, 'semaine'>
  reglages: EntityTable<Reglage, 'cle'>
}

// Les booléens ne sont pas indexables en IndexedDB : on filtre en mémoire.
db.version(1).stores({
  exercices: 'id, nom',
  programmes: 'id',
  seancesRealisees: 'id, date, seanceId',
  bilans: 'semaine',
  reglages: 'cle',
})

/** Ajoute / met à jour les exercices fournis (sans toucher aux exercices perso). */
export async function synchroniserBibliotheque() {
  await db.exercices.bulkPut(BIBLIOTHEQUE)
}

/**
 * Met les données au format actuel : crée la semaine d'entraînement si besoin
 * et rattache à la semaine en cours les séances qui n'ont pas de numéro de semaine.
 */
export async function migrerDonnees() {
  await db.transaction('rw', [db.reglages, db.seancesRealisees], async () => {
    let semaine = (await db.reglages.get('semaine'))?.valeur as SemaineCourante | undefined
    if (!semaine) {
      const premiere = await db.seancesRealisees.orderBy('date').first()
      semaine = { numero: 1, debut: premiere?.date ?? new Date().toISOString() }
      await db.reglages.put({ cle: 'semaine', valeur: semaine })
    }
    // Restes de l'intégration Gemini (retirée) : clé API et analyses
    await db.reglages.bulkDelete(['cleIA', 'modeleIA', 'reflexionIA', 'analyseIA'])
    const numero = semaine.numero
    await db.seancesRealisees.filter((s) => s.semaine === undefined).modify((s) => {
      s.semaine = numero
    })
  })
}

export async function initialiserBase() {
  await synchroniserBibliotheque()
  await migrerDonnees()
  // Demande à Safari de ne pas effacer les données automatiquement.
  await navigator.storage?.persist?.().catch(() => false)
}

// Réglages typés
export interface SemaineCourante {
  numero: number
  /** ISO 8601 */
  debut: string
}

export interface Reglages {
  modePlanning: ModePlanning
  /** Semaine d'entraînement en cours (créée au premier lancement) */
  semaine: SemaineCourante
  /** ISO 8601 du dernier export, null si jamais exporté */
  dernierExport: string | null
}

export const REGLAGES_DEFAUT: Reglages = {
  modePlanning: 'jourFixe',
  semaine: { numero: 1, debut: new Date(0).toISOString() },
  dernierExport: null,
}

export async function lireReglages(): Promise<Reglages> {
  const lignes = await db.reglages.toArray()
  const lus = Object.fromEntries(lignes.map((r) => [r.cle, r.valeur]))
  return { ...REGLAGES_DEFAUT, ...lus }
}

export async function ecrireReglage<K extends keyof Reglages>(cle: K, valeur: Reglages[K]) {
  await db.reglages.put({ cle, valeur })
}

// Profil : stocké comme un réglage (donc inclus dans l'export)
export async function lireProfil(): Promise<Profil> {
  const ligne = await db.reglages.get('profil')
  return { ...PROFIL_VIDE, ...(ligne?.valeur as Partial<Profil> | undefined) }
}

export async function modifierProfil(modifier: (p: Profil) => void) {
  await db.transaction('rw', db.reglages, async () => {
    const p = await lireProfil()
    modifier(p)
    await db.reglages.put({ cle: 'profil', valeur: p })
  })
}
