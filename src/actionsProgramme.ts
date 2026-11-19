import { db } from './db'
import type { Programme, Seance } from './types'

/** Modifie un programme en place (dans une transaction). */
export async function modifierProgramme(id: string, modifier: (p: Programme) => void) {
  await db.transaction('rw', db.programmes, async () => {
    const p = await db.programmes.get(id)
    if (!p) return
    modifier(p)
    await db.programmes.put(p)
  })
}

export async function modifierSeance(programmeId: string, seanceId: string, modifier: (s: Seance) => void) {
  await modifierProgramme(programmeId, (p) => {
    const s = p.seances.find((x) => x.id === seanceId)
    if (s) modifier(s)
  })
}

/** Un seul programme actif à la fois. */
export async function activerProgramme(id: string) {
  await db.transaction('rw', db.programmes, async () => {
    const tous = await db.programmes.toArray()
    await db.programmes.bulkPut(tous.map((p) => ({ ...p, actif: p.id === id })))
  })
}

export async function ajouterProgramme(programme: Programme) {
  await db.programmes.add({ ...programme, actif: false })
  await activerProgramme(programme.id)
}

export async function supprimerProgramme(id: string) {
  await db.transaction('rw', db.programmes, async () => {
    const etaitActif = (await db.programmes.get(id))?.actif
    await db.programmes.delete(id)
    if (etaitActif) {
      const restant = await db.programmes.toCollection().first()
      if (restant) await db.programmes.put({ ...restant, actif: true })
    }
  })
}
