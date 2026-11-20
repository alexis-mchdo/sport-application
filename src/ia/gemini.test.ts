import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErreurIA, appelerGemini } from './gemini'

const appel = () => appelerGemini({ cle: 'CLE', modele: 'gemini-flash-latest', instructions: 'i', contexte: 'c', schema: {} })
const repondre = (statut: number, corps: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corps), { status: statut })))

afterEach(() => vi.unstubAllGlobals())

describe('client Gemini', () => {
  it('envoie la clé en en-tête et le format JSON imposé, puis décode la réponse', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: 'STOP' }] })),
    )
    vi.stubGlobal('fetch', fetchMock)
    expect(await appel()).toEqual({ ok: true })
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent')
    expect((options.headers as Record<string, string>)['x-goog-api-key']).toBe('CLE')
    const corps = JSON.parse(options.body as string)
    expect(corps.generationConfig.responseMimeType).toBe('application/json')
    expect(corps.systemInstruction.parts[0].text).toBe('i')
  })

  it('envoie le niveau de réflexion, et réessaie sans si le modèle le refuse', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Thinking level is not supported for this model.' } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] })))
    vi.stubGlobal('fetch', fetchMock)
    const r = await appelerGemini({ cle: 'CLE', modele: 'm', instructions: 'i', contexte: 'c', schema: {}, reflexion: 'LOW' })
    expect(r).toEqual({ ok: true })
    const corps = (n: number) => JSON.parse((fetchMock.mock.calls[n][1] as RequestInit).body as string)
    expect(corps(0).generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'LOW' })
    expect(corps(1).generationConfig.thinkingConfig).toBeUndefined()
  })

  it('relance automatiquement quand Google est surchargé', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] })))
    vi.stubGlobal('fetch', fetchMock)
    const resultat = appel()
    await vi.runAllTimersAsync()
    expect(await resultat).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })

  it('abandonne après les relances si la surcharge continue', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const resultat = appel().catch((e: Error) => e)
    await vi.runAllTimersAsync()
    expect(((await resultat) as Error).message).toMatch(/indisponible/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })

  it('ignore les parties « pensée »', async () => {
    repondre(200, { candidates: [{ content: { parts: [{ text: 'je réfléchis', thought: true }, { text: '{"a":1}' }] } }] })
    expect(await appel()).toEqual({ a: 1 })
  })

  it('traduit les erreurs en messages lisibles', async () => {
    repondre(400, { error: { details: [{ reason: 'API_KEY_INVALID' }] } })
    await expect(appel()).rejects.toThrow(/Clé IA refusée/)
    repondre(429, {})
    await expect(appel()).rejects.toThrow(/Quota/)
    repondre(200, { candidates: [{ content: { parts: [{ text: '{"a":' }] }, finishReason: 'MAX_TOKENS' }] })
    await expect(appel()).rejects.toThrow(/coupée/)
    repondre(200, { candidates: [{ content: { parts: [{ text: 'pas du json' }] } }] })
    await expect(appel()).rejects.toBeInstanceOf(ErreurIA)
  })

  it('réessaie avec la clé dans l’adresse si l’en-tête est bloqué', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] })))
    vi.stubGlobal('fetch', fetchMock)
    expect(await appel()).toEqual({})
    expect(fetchMock.mock.calls[1][0]).toContain('?key=CLE')
  })
})
