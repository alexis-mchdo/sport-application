// Appel direct à l'API Gemini depuis l'iPhone (pas de serveur).
// La clé est saisie dans Réglages → IA et ne quitte jamais l'appareil (exclue des exports).

export class ErreurIA extends Error {}

/** Niveau de réflexion Gemini (modèles 3 et +). `undefined` = réglage par défaut du modèle. */
export type NiveauReflexion = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'

const URL_API = 'https://generativelanguage.googleapis.com/v1beta/models'
// La création d'un programme peut prendre plus d'une minute sur l'offre gratuite
const DELAI_MS = 180_000

interface ReponseGemini {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string; details?: { reason?: string }[] }
}

function messageErreur(statut: number, corps: ReponseGemini | null): string {
  const raison = corps?.error?.details?.map((d) => d.reason).join(' ') ?? ''
  if (raison.includes('API_KEY_INVALID') || statut === 401 || statut === 403)
    return 'Clé IA refusée par Google. Vérifie-la dans Réglages → IA.'
  if (statut === 404) return 'Modèle IA introuvable. Vérifie son nom dans Réglages → IA.'
  if (statut === 429) return "Quota gratuit de l'IA atteint pour le moment. Réessaie plus tard."
  if (statut >= 500) return "Le service d'IA est indisponible. Réessaie dans quelques minutes."
  return `Erreur de l'IA (${statut})${corps?.error?.message ? ` : ${corps.error.message}` : ''}`
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
}: {
  cle: string
  modele: string
  instructions: string
  contexte: string
  schema: object
  reflexion?: NiveauReflexion
}): Promise<unknown> {
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

  let reponse: Response
  try {
    reponse = await envoyer(true)
  } catch (e) {
    if ((e as Error).name === 'TimeoutError') throw new ErreurIA("L'IA met trop de temps à répondre. Réessaie.")
    // Si l'en-tête est refusé par le navigateur, on réessaie avec la clé dans l'adresse (HTTPS).
    try {
      reponse = await envoyer(false)
    } catch {
      throw new ErreurIA("Impossible de joindre l'IA. Vérifie ta connexion internet.")
    }
  }

  const donnees = (await reponse.json().catch(() => null)) as ReponseGemini | null
  // Modèle qui ne gère pas le niveau de réflexion : on réessaie avec son réglage par défaut
  if (reponse.status === 400 && reflexion && /think/i.test(donnees?.error?.message ?? ''))
    return appelerGemini({ cle, modele, instructions, contexte, schema })
  if (!reponse.ok) throw new ErreurIA(messageErreur(reponse.status, donnees))

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

/** Petit appel pour vérifier que la clé et le modèle fonctionnent. */
export async function testerConnexion(cle: string, modele: string): Promise<void> {
  const r = (await appelerGemini({
    cle,
    modele,
    instructions: 'Réponds uniquement avec le JSON demandé.',
    contexte: 'Renvoie {"ok": true}.',
    schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
  })) as { ok?: boolean }
  if (r?.ok !== true) throw new ErreurIA("L'IA a répondu, mais pas comme prévu.")
}
