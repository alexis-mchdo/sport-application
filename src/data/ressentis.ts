/** Ressenti global d'une séance : [valeur, emoji, libellé] */
export const RESSENTIS: [number, string, string][] = [
  [1, '😫', 'Épuisé'],
  [2, '😕', 'Difficile'],
  [3, '🙂', 'Correct'],
  [4, '😀', 'Bien'],
  [5, '💪', 'Au top'],
]

export const libelleRessenti = (v: number) => RESSENTIS.find(([x]) => x === v)?.[2] ?? ''
