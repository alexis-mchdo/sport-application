import { db } from './db'
import { demarrerSeance } from './logique/seance'
import type { Seance, SeanceRealisee } from './types'

/** Démarre une séance (ou renvoie celle déjà en cours : une seule à la fois). */
export async function commencerSeance(seance: Seance): Promise<string> {
  const enCours = await db.seancesRealisees.filter((s) => !!s.enCours).first()
  if (enCours) return enCours.id
  const nouvelle = demarrerSeance(seance, new Date())
  await db.seancesRealisees.add(nouvelle)
  return nouvelle.id
}

/** Chaque tap est enregistré immédiatement : rien n'est perdu si iOS ferme l'app. */
export async function modifierRealisee(id: string, modifier: (s: SeanceRealisee) => void) {
  await db.transaction('rw', db.seancesRealisees, async () => {
    const s = await db.seancesRealisees.get(id)
    if (!s) return
    modifier(s)
    await db.seancesRealisees.put(s)
  })
}

export async function terminerSeance(id: string) {
  await modifierRealisee(id, (s) => {
    s.enCours = false
    s.fin = new Date().toISOString()
  })
}

export async function supprimerRealisee(id: string) {
  await db.seancesRealisees.delete(id)
}
