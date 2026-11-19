/** Nombre de jours entiers écoulés depuis une date ISO. */
export function joursDepuis(iso: string, maintenant = new Date()) {
  return Math.floor((maintenant.getTime() - new Date(iso).getTime()) / 86_400_000)
}

export const JOURS_AVANT_RAPPEL = 14

/** Faut-il rappeler d'exporter ? Seulement s'il y a des séances à protéger. */
export function rappelSauvegardeNecessaire(dernierExport: string | null, nbSeances: number, maintenant = new Date()) {
  if (nbSeances === 0) return false
  return !dernierExport || joursDepuis(dernierExport, maintenant) >= JOURS_AVANT_RAPPEL
}
