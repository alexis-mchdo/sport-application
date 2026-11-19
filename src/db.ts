import Dexie, { type EntityTable } from 'dexie'
import { BIBLIOTHEQUE } from './data/bibliotheque'
import type { BilanSemaine, Exercice, ModePlanning, Programme, Reglage, SeanceRealisee } from './types'

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

export async function initialiserBase() {
  await synchroniserBibliotheque()
  // Demande à Safari de ne pas effacer les données automatiquement.
  await navigator.storage?.persist?.().catch(() => false)
}

// Réglages typés
export interface Reglages {
  modePlanning: ModePlanning
  /** ISO 8601 du dernier export, null si jamais exporté */
  dernierExport: string | null
}

export const REGLAGES_DEFAUT: Reglages = {
  modePlanning: 'jourFixe',
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
