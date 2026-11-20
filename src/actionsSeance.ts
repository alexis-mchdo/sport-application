import { db, lireReglages } from './db'
import { demarrerSeance } from './logique/seance'
import type { DecisionProgression, Programme, Seance, SeanceRealisee } from './types'

/** Démarre une séance (ou renvoie celle déjà en cours : une seule à la fois). */
export async function commencerSeance(seance: Seance): Promise<string> {
  const enCours = await db.seancesRealisees.filter((s) => !!s.enCours).first()
  if (enCours) return enCours.id
  const { semaine } = await lireReglages()
  const nouvelle = demarrerSeance(seance, new Date(), semaine.numero)
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

/**
 * Clôture la semaine d'entraînement : applique au programme les changements de charge acceptés,
 * enregistre le bilan, puis ouvre la semaine suivante (vide). L'historique est conservé.
 */
export async function cloturerSemaine(programme: Programme, decisions: DecisionProgression[]) {
  await db.transaction('rw', [db.programmes, db.bilans, db.reglages, db.seancesRealisees], async () => {
    const { semaine } = await lireReglages()
    const p = await db.programmes.get(programme.id)
    if (p) {
      for (const d of decisions) {
        const exo = p.seances.find((s) => s.id === d.seanceId)?.exercices.find((e) => e.exerciceId === d.exerciceId)
        if (exo) Object.assign(exo, { poidsKg: d.nouveauPoids, reps: d.nouveauReps })
      }
      await db.programmes.put(p)
    }
    const maintenant = new Date().toISOString()
    await db.bilans.put({ semaine: String(semaine.numero), debut: semaine.debut, fin: maintenant, decisions })
    await db.reglages.put({ cle: 'semaine', valeur: { numero: semaine.numero + 1, debut: maintenant } })
    // Une séance encore en cours passe dans la nouvelle semaine
    await db.seancesRealisees.filter((s) => !!s.enCours).modify((s) => {
      s.semaine = semaine.numero + 1
    })
  })
}
