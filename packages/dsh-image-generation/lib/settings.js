import { credentialKey } from '@deepseek-ai/dsh-credentials'
import { DEFAULTS, MODEL_CATALOG, ImageError, listModels, profile, safeError, validateConnection } from './provider.js'
import { grsaiCredits } from './grsai.js'

const KEY = credentialKey('dsh-image-generation', 'configuration')
const EMPTY = () => ({ revision: 0, provider: 'bytedance', profiles: {} })

function described(state, writable) {
  return {
    revision: state.revision, provider: state.provider, writable, catalogs: MODEL_CATALOG,
    profiles: Object.fromEntries(Object.entries(DEFAULTS).map(([provider, defaults]) => {
      const stored = state.profiles[provider]
      return [provider, { ...defaults, ...(stored ? profile(provider, stored) : {}), configured: Boolean(stored?.key), validation: stored?.validation ?? null }]
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
  /** Video and text run on the saved GrsAI profile, whichever provider draws images. */
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
   * A GrsAI key's credit balance, read on demand and never cached: the saved
   * key, or a key typed into the card before saving (used once, not stored).
   */
  async function credits(signal, draft) {
    try {
      let spec
      if (draft === undefined) spec = await grsaiSpec()
      else {
        if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new ImageError('CONFIGURATION', 'Enter a valid GrsAI key.')
        const key = typeof draft.apiKey === 'string' ? draft.apiKey.trim() : ''
        if (!key || key.length > 4096 || /[\s\x00-\x1f\x7f]/u.test(key)) throw new ImageError('KEY_REQUIRED', 'Enter a valid API key.')
        spec = { ...profile('grsai', { baseUrl: draft.baseUrl }), key }
      }
      return { credits: await grsaiCredits(spec, spec.key, { signal }) }
    } catch (error) {
      const safe = safeError(error)
      warn('image-generation: credit balance failed; code=%s http=%s provider_code=%s', safe.code, safe.providerStatus, safe.providerCode)
      throw safe
    }
  }
  async function prepared(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ImageError('CONFIGURATION', 'Enter a valid image configuration.')
    const before = await read()
    if (!Number.isSafeInteger(input.revision) || input.revision !== before.revision) throw new ImageError('CONFLICT', 'The settings changed in another window. Reopen this card before saving.', 409)
    const spec = profile(input.provider, input)
    const previous = before.profiles[input.provider]
    const key = typeof input.apiKey === 'string' ? input.apiKey.trim() : ''
    if (!key && previous && new URL(previous.baseUrl).origin !== new URL(spec.baseUrl).origin) {
      throw new ImageError('KEY_REQUIRED', 'Enter the API key again for the new API origin.')
    }
    const effectiveKey = key || previous?.key
    if (!effectiveKey || effectiveKey.length > 4096 || /[\s\x00-\x1f\x7f]/u.test(effectiveKey)) throw new ImageError('KEY_REQUIRED', 'Enter a valid API key.')
    return { before, spec, effectiveKey }
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
    const { before, spec, effectiveKey } = await prepared(input)
    if (!(await describeWritable())) throw new ImageError('READ_ONLY', 'The host credential store is read-only.', 403)
    try {
      const validation = await validate(input.provider, spec, effectiveKey, { signal })
      signal?.throwIfAborted()
      await ctx.credentials.modifyRecord(KEY, async record => {
        const latest = record?.kind === 'grant' ? record.payload : EMPTY()
        if (latest.revision !== before.revision) throw new ImageError('CONFLICT', 'The settings changed in another window. Reopen this card before saving.', 409)
        return { kind: 'grant', payload: {
          revision: before.revision + 1, provider: input.provider,
          profiles: { ...before.profiles, [input.provider]: { ...spec, key: effectiveKey, validation } },
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
  return { describe, isConfigured, isGrsaiConfigured, active, grsaiSpec, credits, save, models }
}
