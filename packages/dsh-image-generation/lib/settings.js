import { credentialKey } from '@deepseek-ai/dsh-credentials'
import { DEFAULTS, MODEL_CATALOG, VIDEO_PROVIDERS, ImageError, checkedProfile, listModels, profile, safeError, validateConnection } from './provider.js'
import { grsaiAccountCredits, grsaiCredits } from './grsai.js'
import { imageCapabilities, videoCapabilities } from './options.js'

const KEY = credentialKey('dsh-image-generation', 'configuration')
const SECRET = /[\s\x00-\x1f\x7f]/u
const validSecret = value => Boolean(value) && value.length <= 4096 && !SECRET.test(value)
const trimmed = value => (typeof value === 'string' ? value.trim() : '')
const EMPTY = () => ({ revision: 0, provider: 'bytedance', profiles: {} })

function described(state, writable) {
  return {
    revision: state.revision, provider: state.provider, writable, catalogs: MODEL_CATALOG,
    profiles: Object.fromEntries(Object.entries(DEFAULTS).map(([provider, defaults]) => {
      const stored = state.profiles[provider]
      return [provider, {
        ...defaults, ...(stored ? profile(provider, stored) : {}), configured: Boolean(stored?.key), validation: stored?.validation ?? null,
        // Secrets never leave the Host; the card only learns whether one is saved.
        ...(provider === 'grsai' ? { accountTokenConfigured: Boolean(stored?.accountToken) } : {}),
      }]
    })),
  }
}

/** Keep each validated endpoint/model/key together in one atomic host credential record. */
export function createSettings(ctx, validate = validateConnection) {
  // Failures go out at warn: the Desktop log bridge keeps warnings and errors.
  const warn = (...args) => (ctx.logger.warn ?? ctx.logger.info).apply(ctx.logger, args)
  async function read() {
    let record
    try {
      record = await ctx.credentials.readRecord(KEY)
    } catch (error) {
      if (error instanceof ImageError) throw error
      throw new ImageError('LOAD_FAILED', 'The saved image configuration could not be read.', 503)
    }
    if (!record) return EMPTY()
    if (record.kind !== 'grant' || !Number.isSafeInteger(record.payload?.revision) || !record.payload?.profiles) {
      throw new ImageError('CONFIGURATION', 'The stored image configuration needs to be saved again.', 500)
    }
    return record.payload
  }
  async function describeWritable() {
    try { return (await ctx.credentials.describeRecord(KEY)).writable } catch { return true }
  }
  async function describe() {
    try {
      const state = await read()
      return described(state, await describeWritable())
    } catch (error) {
      const safe = safeError(error)
      warn('image-generation: settings describe failed; code=%s', safe.code)
      throw safe
    }
  }
  async function isConfigured() {
    const state = await read()
    return Boolean(state.profiles[state.provider]?.key)
  }
  async function active() {
    const state = await read()
    const spec = state.profiles[state.provider]
    if (!spec?.key) throw new ImageError('NOT_CONFIGURED', 'Configure image generation in Settings > Built-in plugins before generating an image.')
    return { provider: state.provider, ...profile(state.provider, spec), key: spec.key }
  }
  /**
   * The profile that renders video: the image provider when it has video
   * (GrsAI or Agnes AI), otherwise a saved GrsAI profile, then a saved Agnes AI
   * one. So Seedream can draw while GrsAI renders clips, as before.
   */
  function videoProvider(state) {
    if (VIDEO_PROVIDERS.includes(state.provider) && state.profiles[state.provider]?.key) return state.provider
    return VIDEO_PROVIDERS.find(provider => state.profiles[provider]?.key)
  }
  async function videoSpec() {
    const state = await read()
    const provider = videoProvider(state)
    if (!provider) throw new ImageError('NOT_CONFIGURED', 'Save a GrsAI or Agnes AI key in Settings > Built-in plugins > Image & video generation before generating video.')
    const spec = state.profiles[provider]
    return { provider, ...profile(provider, spec), key: spec.key }
  }
  async function isVideoConfigured() {
    return Boolean(videoProvider(await read()))
  }
  /** Text runs on the saved GrsAI profile, whichever provider draws images. */
  async function grsaiSpec() {
    const state = await read()
    const spec = state.profiles.grsai
    if (!spec?.key) throw new ImageError('NOT_CONFIGURED', 'Save a GrsAI key in Settings > Built-in plugins > Image & video generation before generating video or text.')
    return { provider: 'grsai', ...profile('grsai', spec), key: spec.key }
  }
  async function isGrsaiConfigured() {
    const state = await read()
    return Boolean(state.profiles.grsai?.key)
  }
  /**
   * GrsAI balances, read on demand and never cached: the key's own quota and,
   * when an account token is saved or typed, the account balance behind it.
   * A key or token typed into the card before saving is used once, not stored.
   * The key result decides success; an account failure is reported beside it.
   * @returns `{ key: { credits, unlimited? }, account: { credits } | { error } | null }`
   */
  async function credits(signal, draft) {
    try {
      let spec
      if (draft === undefined) {
        const state = await read()
        const saved = state.profiles.grsai
        if (!saved?.key) throw new ImageError('NOT_CONFIGURED', 'Save a GrsAI key first.')
        spec = { ...profile('grsai', saved), key: saved.key, accountToken: saved.accountToken }
      } else {
        if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new ImageError('CONFIGURATION', 'Enter a valid GrsAI key.')
        const base = profile('grsai', { baseUrl: draft.baseUrl })
        const saved = (await read()).profiles.grsai
        const sameOrigin = saved && new URL(saved.baseUrl).origin === new URL(base.baseUrl).origin
        // A typed key or token replaces the saved one; the saved one is reused only on its own origin.
        const key = trimmed(draft.apiKey) || (sameOrigin ? saved.key : '')
        const accountToken = trimmed(draft.accountToken) || (sameOrigin ? saved.accountToken : undefined)
        if (!validSecret(key)) throw new ImageError('KEY_REQUIRED', 'Enter a valid API key.')
        if (accountToken !== undefined && !validSecret(accountToken)) throw new ImageError('TOKEN', 'Enter a valid GrsAI account token.')
        spec = { ...base, key, accountToken }
      }
      const [key, account] = await Promise.all([
        grsaiCredits(spec, spec.key, { signal }),
        spec.accountToken
          ? grsaiAccountCredits(spec, spec.accountToken, { signal }).then(value => ({ credits: value }), error => {
            const safe = safeError(error)
            warn('image-generation: account balance failed; code=%s http=%s provider_code=%s', safe.code, safe.providerStatus, safe.providerCode)
            return { error: { code: safe.code, ...(safe.detail ? { detail: safe.detail } : {}), ...(safe.providerStatus ? { providerStatus: safe.providerStatus } : {}) } }
          })
          : null,
      ])
      return { key, account }
    } catch (error) {
      const safe = safeError(error)
      warn('image-generation: credit balance failed; code=%s http=%s provider_code=%s', safe.code, safe.providerStatus, safe.providerCode)
      throw safe
    }
  }
  /** The choices the card offers for one provider and model (see options.js). */
  function options(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.hasOwn(DEFAULTS, input.provider)) throw new ImageError('PROVIDER', 'Choose a supported image provider.')
    const id = value => (typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/u.test(value.trim()) ? value.trim() : '')
    const video = VIDEO_PROVIDERS.includes(input.provider) && id(input.videoModel)
    return { image: imageCapabilities(input.provider, id(input.model)), video: video ? videoCapabilities(input.provider, video) : null }
  }
  async function prepared(input, check = profile) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ImageError('CONFIGURATION', 'Enter a valid image configuration.')
    const before = await read()
    if (!Number.isSafeInteger(input.revision) || input.revision !== before.revision) throw new ImageError('CONFLICT', 'The settings changed in another window. Reopen this card before saving.', 409)
    const spec = check(input.provider, input)
    const previous = before.profiles[input.provider]
    const key = trimmed(input.apiKey)
    const moved = previous && new URL(previous.baseUrl).origin !== new URL(spec.baseUrl).origin
    if (!key && moved) throw new ImageError('KEY_REQUIRED', 'Enter the API key again for the new API origin.')
    const effectiveKey = key || previous?.key
    if (!validSecret(effectiveKey)) throw new ImageError('KEY_REQUIRED', 'Enter a valid API key.')
    // The GrsAI account token follows the key's rules: typed to replace, kept
    // on the same origin, dropped when cleared or when the origin changes.
    let accountToken
    if (input.provider === 'grsai') {
      const typed = trimmed(input.accountToken)
      if (typed && !validSecret(typed)) throw new ImageError('TOKEN', 'Enter a valid GrsAI account token.')
      accountToken = typed || (input.clearAccountToken === true || moved ? undefined : previous?.accountToken)
    }
    return { before, spec, effectiveKey, accountToken }
  }
  async function models(input, signal) {
    // GrsAI publishes its catalog without a key, so the menus load before one is saved.
    if (input?.provider === 'grsai') {
      try {
        return await listModels('grsai', profile('grsai', input), undefined, { signal })
      } catch (error) {
        const safe = safeError(error)
        warn('image-generation: GrsAI catalog failed; code=%s', safe.code)
        throw safe
      }
    }
    const { spec, effectiveKey } = await prepared(input)
    return listModels(input.provider, spec, effectiveKey, { signal })
  }
  async function save(input, signal) {
    const { before, spec, effectiveKey, accountToken } = await prepared(input, checkedProfile)
    if (!(await describeWritable())) throw new ImageError('READ_ONLY', 'The host credential store is read-only.', 403)
    try {
      const validation = await validate(input.provider, accountToken ? { ...spec, accountToken } : spec, effectiveKey, { signal })
      signal?.throwIfAborted()
      await ctx.credentials.modifyRecord(KEY, async record => {
        const latest = record?.kind === 'grant' ? record.payload : EMPTY()
        if (latest.revision !== before.revision) throw new ImageError('CONFLICT', 'The settings changed in another window. Reopen this card before saving.', 409)
        return { kind: 'grant', payload: {
          revision: before.revision + 1, provider: input.provider,
          profiles: { ...before.profiles, [input.provider]: { ...spec, key: effectiveKey, ...(accountToken ? { accountToken } : {}), validation } },
        } }
      })
      ctx.logger.info('image-generation: configuration saved; provider=%s validation=%s', input.provider, validation)
      return await describe()
    } catch (error) {
      const safe = safeError(error)
      warn('image-generation: configuration save failed; provider=%s code=%s http=%s provider_code=%s', input.provider, safe.code, safe.providerStatus, safe.providerCode)
      throw safe
    }
  }
  return { describe, isConfigured, isGrsaiConfigured, isVideoConfigured, active, grsaiSpec, videoSpec, credits, options, save, models }
}
