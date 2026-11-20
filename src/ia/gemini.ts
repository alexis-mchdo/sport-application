// Appel direct à l'API Gemini depuis l'iPhone (pas de serveur).
// La clé est saisie dans Réglages → IA et ne quitte jamais l'appareil (exclue des exports).

export class ErreurIA extends Error {
  /** true si un autre modèle a des chances de répondre (surcharge, modèle indisponible, délai dépassé) */
  readonly basculer: boolean
  constructor(message: string, basculer = false) {
    super(message)
    this.basculer = basculer
  }
}

/** Modèle de secours, plus léger : répond quand les modèles Flash gratuits sont saturés. */
export const MODELE_SECOURS = 'gemini-flash-lite-latest'

/** Niveau de réflexion Gemini (modèles 3 et +). `undefined` = réglage par défaut du modèle. */
export type NiveauReflexion = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'

const URL_API = 'https://generativelanguage.googleapis.com/v1beta/models'
// La création d'un programme peut prendre plus d'une minute sur l'offre gratuite
const DELAI_MS = 180_000
/** Attentes avant de relancer quand Google est surchargé (erreurs 500, 502, 503, 504). */
export const ATTENTES_RELANCE_MS = [3_000, 8_000]
const SURCHARGE = [500, 502, 503, 504]
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface ReponseGemini {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string; details?: { reason?: string }[] }
}

function messageErreur(statut: number, corps: ReponseGemini | null): string {
  const raison = corps?.error?.details?.map((d) => d.reason).join(' ') ?? ''
  if (raison.includes('API_KEY_INVALID') || statut === 401 || statut === 403)
    return 'Clé IA refusée par Google. Vérifie-la dans Réglages → IA.'
  if (statut === 404) return "Modèle IA introuvable ou plus disponible. Vérifie son nom dans Réglages → IA."
  if (statut === 429) return "Quota gratuit de l'IA atteint pour aujourd'hui. Réessaie plus tard (il se recharge chaque jour)."
  if (statut >= 500) return "Le service d'IA est indisponible. Réessaie dans quelques minutes."
  return `Erreur de l'IA (${statut})${corps?.error?.message ? ` : ${corps.error.message}` : ''}`
}

interface ParametresAppel {
  cle: string
  instructions: string
  contexte: string
  schema: object
  reflexion?: NiveauReflexion
}

/**
 * Envoie les instructions + le contexte, impose un JSON conforme à `schema` et renvoie l'objet décodé.
 * Lève une ErreurIA avec un message lisible en cas de problème.
 */
export async function appelerGemini({
  cle,
  modele,
  instructions,
  contexte,
  schema,
  reflexion,
  relances = true,
}: ParametresAppel & { modele: string; relances?: boolean }): Promise<unknown> {
  const corps = JSON.stringify({
    systemInstruction: { parts: [{ text: instructions }] },
    contents: [{ role: 'user', parts: [{ text: contexte }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      maxOutputTokens: 16384,
      ...(reflexion && { thinkingConfig: { thinkingLevel: reflexion } }),
    },
  })
  const url = `${URL_API}/${encodeURIComponent(modele)}:generateContent`
  const envoyer = (avecEnTete: boolean) =>
    fetch(avecEnTete ? url : `${url}?key=${encodeURIComponent(cle)}`, {
      method: 'POST',
      headers: avecEnTete ? { 'Content-Type': 'application/json', 'x-goog-api-key': cle } : { 'Content-Type': 'application/json' },
      body: corps,
      signal: AbortSignal.timeout(DELAI_MS),
    })

  let avecEnTete = true
  const envoyerUneFois = async (): Promise<Response> => {
    try {
      return await envoyer(avecEnTete)
    } catch (e) {
      if ((e as Error).name === 'TimeoutError') throw new ErreurIA("L'IA met trop de temps à répondre. Réessaie.", true)
      if (!avecEnTete) throw new ErreurIA("Impossible de joindre l'IA. Vérifie ta connexion internet.")
      // Si l'en-tête est refusé par le navigateur, on réessaie avec la clé dans l'adresse (HTTPS).
      avecEnTete = false
      return envoyerUneFois()
    }
  }

  let reponse = await envoyerUneFois()
  // Surcharge passagère chez Google : on relance automatiquement avant d'afficher une erreur
  for (const attente of relances ? ATTENTES_RELANCE_MS : []) {
    if (!SURCHARGE.includes(reponse.status)) break
    await attendre(attente)
    reponse = await envoyerUneFois()
  }

  const donnees = (await reponse.json().catch(() => null)) as ReponseGemini | null
  // Modèle qui ne gère pas le niveau de réflexion : on réessaie avec son réglage par défaut
  if (reponse.status === 400 && reflexion && /think/i.test(donnees?.error?.message ?? ''))
    return appelerGemini({ cle, modele, instructions, contexte, schema })
  if (!reponse.ok)
    // Surcharge, modèle indisponible ou quota de ce modèle épuisé : un autre modèle (quota séparé) peut répondre
    throw new ErreurIA(messageErreur(reponse.status, donnees), SURCHARGE.includes(reponse.status) || [404, 429].includes(reponse.status))

  const candidat = donnees?.candidates?.[0]
  if (!candidat) throw new ErreurIA(`L'IA n'a pas répondu${donnees?.promptFeedback?.blockReason ? ' (demande bloquée)' : ''}. Réessaie.`)
  if (candidat.finishReason === 'MAX_TOKENS') throw new ErreurIA("La réponse de l'IA a été coupée. Réessaie.")
  const texte = (candidat.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
  try {
    return JSON.parse(texte)
  } catch {
    throw new ErreurIA("Réponse de l'IA illisible. Réessaie.")
  }
}

/**
 * Essaie le modèle choisi (une seule fois), puis bascule sur le modèle de secours s'il est saturé ou indisponible.
 * Renvoie la réponse et le modèle qui a répondu.
 */
export async function appelerGeminiAvecSecours(p: ParametresAppel & { modele: string }): Promise<{ donnees: unknown; modele: string }> {
  if (p.modele === MODELE_SECOURS) return { donnees: await appelerGemini(p), modele: p.modele }
  try {
    return { donnees: await appelerGemini({ ...p, relances: false }), modele: p.modele }
  } catch (e) {
    if (!(e instanceof ErreurIA) || !e.basculer) throw e
    return { donnees: await appelerGemini({ ...p, modele: MODELE_SECOURS }), modele: MODELE_SECOURS }
  }
}

/** Petit appel pour vérifier que la clé fonctionne. Renvoie le modèle qui a répondu. */
export async function testerConnexion(cle: string, modele: string): Promise<string> {
  const r = await appelerGeminiAvecSecours({
    cle,
    modele,
    instructions: 'Réponds uniquement avec le JSON demandé.',
    contexte: 'Renvoie {"ok": true}.',
    schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
  })
  if ((r.donnees as { ok?: boolean })?.ok !== true) throw new ErreurIA("L'IA a répondu, mais pas comme prévu.")
  return r.modele
}
