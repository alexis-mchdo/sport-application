import { db, ecrireReglage, migrerDonnees, synchroniserBibliotheque } from './db'
import type { BilanSemaine, Exercice, Programme, Reglage, SeanceRealisee } from './types'

export const VERSION_SAUVEGARDE = 1

export interface Sauvegarde {
  app: 'muscu'
  version: number
  exporteLe: string
  donnees: {
    /** Exercices perso uniquement (la bibliothèque fournie est dans le code) */
    exercices: Exercice[]
    programmes: Programme[]
    seancesRealisees: SeanceRealisee[]
    bilans: BilanSemaine[]
    reglages: Reglage[]
  }
}

const TABLES = ['exercices', 'programmes', 'seancesRealisees', 'bilans', 'reglages'] as const

/** Vérifie qu'un objet JSON est une sauvegarde lisible. Renvoie un message d'erreur ou null. */
export function verifierSauvegarde(json: unknown): string | null {
  if (typeof json !== 'object' || json === null) return "Ce fichier n'est pas une sauvegarde Muscu."
  const s = json as Partial<Sauvegarde>
  if (s.app !== 'muscu') return "Ce fichier n'est pas une sauvegarde Muscu."
  if (typeof s.version !== 'number' || s.version > VERSION_SAUVEGARDE)
    return "Cette sauvegarde vient d'une version plus récente de l'app."
  if (typeof s.donnees !== 'object' || s.donnees === null) return 'Sauvegarde incomplète.'
  for (const t of TABLES) {
    if (!Array.isArray(s.donnees[t])) return `Sauvegarde incomplète (${t}).`
  }
  return null
}

export async function creerSauvegarde(): Promise<Sauvegarde> {
  const [exercices, programmes, seancesRealisees, bilans, reglages] = await Promise.all([
    db.exercices.filter((e) => e.perso).toArray(),
    db.programmes.toArray(),
    db.seancesRealisees.toArray(),
    db.bilans.toArray(),
    db.reglages.toArray(),
  ])
  return {
    app: 'muscu',
    version: VERSION_SAUVEGARDE,
    exporteLe: new Date().toISOString(),
    donnees: { exercices, programmes, seancesRealisees, bilans, reglages },
  }
}

export function nomFichierSauvegarde(date = new Date()) {
  return `muscu-sauvegarde-${date.toISOString().slice(0, 10)}.json`
}

/**
 * Exporte via la feuille de partage iOS (« Enregistrer dans Fichiers » → iCloud Drive),
 * ou par téléchargement si le partage de fichiers n'est pas disponible.
 * Renvoie false si l'utilisateur a annulé.
 */
export async function exporter(): Promise<boolean> {
  const sauvegarde = await creerSauvegarde()
  const fichier = new File([JSON.stringify(sauvegarde, null, 2)], nomFichierSauvegarde(), {
    type: 'application/json',
  })

  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier] })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false
      throw e
    }
  } else {
    const url = URL.createObjectURL(fichier)
    const a = document.createElement('a')
    a.href = url
    a.download = fichier.name
    a.click()
    URL.revokeObjectURL(url)
  }

  await ecrireReglage('dernierExport', sauvegarde.exporteLe)
  return true
}

/** Remplace toutes les données par celles de la sauvegarde. */
export async function importer(sauvegarde: Sauvegarde) {
  const d = sauvegarde.donnees
  await db.transaction('rw', [db.exercices, db.programmes, db.seancesRealisees, db.bilans, db.reglages], async () => {
    await Promise.all(TABLES.map((t) => db[t].clear()))
    await db.exercices.bulkAdd(d.exercices)
    await db.programmes.bulkAdd(d.programmes)
    await db.seancesRealisees.bulkAdd(d.seancesRealisees)
    await db.bilans.bulkAdd(d.bilans)
    await db.reglages.bulkAdd(d.reglages)
  })
  await synchroniserBibliotheque()
  await migrerDonnees()
}

export async function lireFichierSauvegarde(fichier: File): Promise<Sauvegarde> {
  let json: unknown
  try {
    json = JSON.parse(await fichier.text())
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Muscu.")
  }
  const erreur = verifierSauvegarde(json)
  if (erreur) throw new Error(erreur)
  return json as Sauvegarde
}
