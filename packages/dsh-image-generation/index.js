import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill'
import { createSettings } from './lib/settings.js'
import { ImageError, generate, readBounded, safeError } from './lib/provider.js'
import { MAX_TEXT_OUTPUT_TOKENS, grsaiText, grsaiVideo, grsaiVideoRequest } from './lib/grsai.js'
import { assetDirectory, normalizeImage, workspaceFor } from './lib/assets.js'
import { commitAsset, commitImage, writerPlan } from './lib/commit.js'
import { previewImage } from './lib/preview.js'

export const name = 'dsh-image-generation'
export const inject = ['credentials', 'connection', 'tools', 'skills', 'systemPrompt', 'sandboxPolicy', 'sandbox', 'subprocess', 'sessionController']
export const Config = z.object({})
export const IMAGE_PROMPT_SECTION = 'tool:image-generation'
export const UNCONFIGURED_IMAGE_PROMPT = 'Do not call image_generate. Direct the user to Settings > Built-in plugins > Image & video generation. Never ask for an API key in conversation.'
export const CONFIGURED_IMAGE_PROMPT = 'For image creation, load the generate-image Skill and call image_generate. Presentations and documents may call it in parallel for multiple visuals. Reuse its PNG workspace path in PPT and Word. The user configures this shared capability in Settings > Built-in plugins > Image & video generation.'
export const VIDEO_PROMPT_SECTION = 'tool:video-generation'
export const UNCONFIGURED_VIDEO_PROMPT = 'Do not call video_generate. Video generation needs a GrsAI key saved in Settings > Built-in plugins > Image & video generation. Never ask for an API key in conversation.'
export const CONFIGURED_VIDEO_PROMPT = 'For a short video clip, call video_generate once per clip. It saves an MP4 in the session workspace and usually takes a few minutes; tell the user it is running. Ratios and duration depend on the saved video model; the tool reports what that model accepts.'
export const TEXT_PROMPT_SECTION = 'tool:text-generation'
export const UNCONFIGURED_TEXT_PROMPT = 'Do not call text_generate. Text generation needs a GrsAI key saved in Settings > Built-in plugins > Image & video generation. Never ask for an API key in conversation.'
export const CONFIGURED_TEXT_PROMPT = 'text_generate sends one prompt to the GrsAI text model saved in Settings (such as Gemini or GPT) and returns its reply. Call it when the user asks for that model\'s output, a second model\'s draft, or bulk copy from it; answer ordinary requests yourself.'

/** An MP4 starts with an ISO base media `ftyp` box. */
function isMp4(data) {
  return data.length > 12 && data.toString('latin1', 4, 8) === 'ftyp'
}

export function videoTool(ctx, settings) {
  return defineTool({
    name: 'video_generate',
    description: 'Generate one short video clip through GrsAI (the saved model: Veo 3.1, MiniMax H3 or Agnes Video 2.5) and save it as an MP4 in the session workspace. Requires a saved GrsAI key. Generation usually takes a few minutes. Describe subject, motion, camera and mood in the prompt.',
    parameters: {
      prompt: { type: 'string', required: true, description: 'Subject, action, camera movement, setting, lighting and mood of the clip.' },
      style_context: { type: 'string', description: 'Shared visual style to keep consistent with other assets.' },
      aspect_ratio: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'], description: 'Landscape 16:9 (default) or portrait 9:16 on every model; Agnes Video also takes 1:1, 4:3, 3:4 and 21:9.' },
      duration: { type: 'integer', description: 'Clip length in seconds: MiniMax H3 1-15 (default 6), Agnes Video 4-12 (default 5). Veo renders a fixed length and ignores it.' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: {
        asset_id: { type: 'string', required: true }, workspace_path: { type: 'string', required: true },
        media_type: { type: 'string', required: true }, bytes: { type: 'integer', required: true },
        sha256: { type: 'string', required: true }, provider: { type: 'string', required: true }, model: { type: 'string', required: true },
      } },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    // The provider task may run 14 minutes; leave room for the download and write.
    timeoutMs: 900_000,
    isConcurrencySafe: () => true,
    presentCall: args => ({ card: 'generic', kind: 'execute', title: 'Generate video', rawInput: args }),
    async execute(args, exec) {
      try {
        const prompt = typeof args.prompt === 'string' ? args.prompt.trim() : ''
        const style = typeof args.style_context === 'string' ? args.style_context.trim() : ''
        if (!prompt || prompt.length + style.length > 8000) throw new ImageError('PROMPT', 'Enter a video description of up to 8000 characters including style context.')
        const ratio = args.aspect_ratio ?? '16:9'
        if (args.duration !== undefined && !Number.isInteger(args.duration)) throw new ImageError('DURATION', 'Give the video duration in whole seconds.')
        const root = await workspaceFor(ctx, exec)
        await assetDirectory(root, false, 'video')
        await writerPlan(ctx, root, exec, 'video')
        const spec = await settings.grsaiSpec()
        // Refuse a ratio or length the saved model cannot render before spending credits.
        grsaiVideoRequest(spec.videoModel, prompt, ratio, args.duration)
        ctx.logger.info('image-generation: video started; provider=grsai model=%s', spec.videoModel)
        const data = await grsaiVideo(spec, spec.key, [prompt, style && `Visual style: ${style}`].filter(Boolean).join('\n\n'), { ratio, duration: args.duration }, { signal: exec.signal })
        if (!isMp4(data)) throw new ImageError('VIDEO', 'The provider returned an unsupported video file.', 502)
        // Recheck live session permissions after the long provider call.
        if (await workspaceFor(ctx, exec) !== root) throw new Error('workspace changed')
        const asset = await commitAsset(ctx, root, data, exec, 'video')
        ctx.logger.info('image-generation: video saved; sha256=%s bytes=%d', asset.sha256, data.length)
        return { ...asset, asset_id: `sha256:${asset.sha256}`, media_type: 'video/mp4', bytes: data.length, provider: 'grsai', model: spec.videoModel }
      } catch (error) {
        const safe = safeError(error)
        ctx.logger.info('image-generation: video failed; code=%s http=%s provider_code=%s', safe.code, safe.providerStatus, safe.providerCode)
        throw safe
      }
    },
  })
}

export function textTool(ctx, settings) {
  return defineTool({
    name: 'text_generate',
    description: 'Send one prompt to the GrsAI text model saved in Settings (such as Gemini or GPT through GrsAI) and return its reply. Requires a saved GrsAI key. Use it for that model\'s output or a second model\'s draft; write ordinary replies yourself.',
    parameters: {
      prompt: { type: 'string', required: true, description: 'The complete request, including any source text the model needs; it sees nothing else from this conversation.' },
      instructions: { type: 'string', description: 'System instructions: role, tone, output format and language.' },
      max_output_tokens: { type: 'integer', description: `Upper bound on the reply length, 1-${MAX_TEXT_OUTPUT_TOKENS} tokens. Omit to use the model default.` },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: {
        text: { type: 'string', required: true }, provider: { type: 'string', required: true }, model: { type: 'string', required: true },
        finish_reason: { type: 'string' }, input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' },
      } },
      // The reply reads as text; the model and stop reason stay on one line above it.
      render: (_args, value) => [{ type: 'text', text: `[${value.provider} ${value.model}${value.finish_reason ? `, finish_reason=${value.finish_reason}` : ''}]\n\n${value.text}` }],
    },
    timeoutMs: 200_000,
    isConcurrencySafe: () => true,
    presentCall: args => ({ card: 'generic', kind: 'execute', title: 'Generate text', rawInput: args }),
    async execute(args, exec) {
      try {
        const prompt = typeof args.prompt === 'string' ? args.prompt.trim() : ''
        const instructions = typeof args.instructions === 'string' ? args.instructions.trim() : ''
        if (!prompt || prompt.length + instructions.length > 200_000) throw new ImageError('PROMPT', 'Enter a text prompt of up to 200000 characters including instructions.')
        const maxTokens = args.max_output_tokens
        if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > MAX_TEXT_OUTPUT_TOKENS)) {
          throw new ImageError('PARAMETERS', `Set max_output_tokens between 1 and ${MAX_TEXT_OUTPUT_TOKENS}.`)
        }
        const spec = await settings.grsaiSpec()
        ctx.logger.info('image-generation: text started; provider=grsai model=%s', spec.textModel)
        const reply = await grsaiText(spec, spec.key, { prompt, instructions, maxTokens }, { signal: exec.signal })
        ctx.logger.info('image-generation: text finished; finish_reason=%s output_tokens=%s', reply.finishReason, reply.outputTokens)
        return {
          text: reply.text, provider: 'grsai', model: spec.textModel,
          ...(reply.finishReason === undefined ? {} : { finish_reason: reply.finishReason }),
          ...(reply.inputTokens === undefined ? {} : { input_tokens: reply.inputTokens }),
          ...(reply.outputTokens === undefined ? {} : { output_tokens: reply.outputTokens }),
        }
      } catch (error) {
        const safe = safeError(error)
        ctx.logger.info('image-generation: text failed; code=%s http=%s provider_code=%s', safe.code, safe.providerStatus, safe.providerCode)
        throw safe
      }
    },
  })
}

export function imageTool(ctx, settings) {
  return defineTool({
    name: 'image_generate',
    description: 'Generate one photo, illustration or background through the configured image provider and save an Office-compatible PNG in the session workspace. Requires a saved image configuration. Load the generate-image Skill first. A presentation may call this concurrently for multiple visuals. Keep charts, tables and simple diagrams editable.',
    parameters: {
      prompt: { type: 'string', required: true, description: 'Visual subject, composition, palette, lighting, and space for document or slide text.' },
      style_context: { type: 'string', description: 'Shared brand, template and illustration style for consistency across the document.' },
      purpose: { type: 'string', enum: ['general', 'presentation', 'document', 'web', 'marketing'] },
      aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3', '3:4'], description: 'Target composition; actual dimensions are returned. OpenAI uses its closest supported canvas.' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: {
        asset_id: { type: 'string', required: true }, workspace_path: { type: 'string', required: true },
        media_type: { type: 'string', required: true }, width: { type: 'integer', required: true }, height: { type: 'integer', required: true },
        bytes: { type: 'integer', required: true }, sha256: { type: 'string', required: true },
        provider: { type: 'string', required: true }, model: { type: 'string', required: true },
      } },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    timeoutMs: 240_000,
    isConcurrencySafe: () => true,
    presentCall: args => ({ card: 'generic', kind: 'execute', title: 'Generate image', rawInput: args }),
    async execute(args, exec) {
      try {
        const root = await workspaceFor(ctx, exec)
        await assetDirectory(root)
        await writerPlan(ctx, root, exec)
        const spec = await settings.active()
        ctx.logger.info('image-generation: generation started; provider=%s model=%s', spec.provider, spec.model)
        const raw = await generate(spec.provider, spec, spec.key, args, { signal: exec.signal })
        const image = await normalizeImage(raw)
        // Recheck live session permissions after a potentially long provider call.
        if (await workspaceFor(ctx, exec) !== root) throw new Error('workspace changed')
        const asset = await commitImage(ctx, root, image.data, exec)
        ctx.logger.info('image-generation: generation saved; provider=%s sha256=%s', spec.provider, asset.sha256)
        return { ...asset, asset_id: `sha256:${asset.sha256}`, media_type: 'image/png', width: image.width, height: image.height, bytes: image.data.length, provider: spec.provider, model: spec.model }
      } catch (error) {
        const safe = safeError(error)
        ctx.logger.info('image-generation: generation failed; code=%s http=%s provider_code=%s parameter=%s request_id=%s', safe.code, safe.providerStatus, safe.providerCode, safe.parameter, safe.requestId)
        throw safe
      }
    },
  })
}

export async function apply(ctx) {
  // Endpoint/model/key are committed together by the credential provider, so a
  // failed save cannot pair an old key with a newly persisted endpoint.
  const settings = createSettings(ctx)
  const jsonResponse = async (run) => {
    try {
      return Response.json(await run(), { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
      const safe = safeError(error)
      return Response.json({ code: safe.code, error: safe.message }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } })
    }
  }
  const registerJson = (path, methods, fetch) => ctx.connection.fetch.register({
    path, methods, requestBody: 'buffered', fetch,
  })
  registerJson('/api/image-generation.settings', ['GET'], () => jsonResponse(() => settings.describe()))
  registerJson('/api/image-generation.credits', ['GET'], request => jsonResponse(() => settings.credits(request.signal)))
  for (const suffix of ['save', 'models']) {
    registerJson(`/api/image-generation.${suffix}`, ['POST'], request => jsonResponse(async () => settings[suffix](
      JSON.parse((await readBounded(request, 16_384, request.signal)).toString('utf8')), request.signal,
    )))
  }
  ctx.tools.register(imageTool(ctx, settings))
  ctx.tools.register(videoTool(ctx, settings))
  ctx.tools.register(textTool(ctx, settings))
  registerJson('/api/image-generation.preview', ['GET'], request => previewImage(ctx, request))
  const locator = new URL('./skills/generate-image/SKILL.md', import.meta.url)
  const candidate = {
    name: 'generate-image', description: 'Create reusable photos, illustrations and backgrounds for presentations, documents and other image requests with the configured image_generate tool.',
    invocation: { modelInvocable: true, userInvocable: true }, provider: name, source: 'bundled', rank: BUNDLED_SKILL_RANK,
    locator, resourceBase: { kind: 'directory', path: fileURLToPath(new URL('.', locator)) },
  }
  ctx.skills.registerProvider(() => ({ name, list: async () => [candidate], get: async selected => selected.name === candidate.name
    ? { ...candidate, content: (await readFile(locator, 'utf8')).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '').trim() } : undefined }))
  ctx.systemPrompt.section({ name: IMAGE_PROMPT_SECTION, order: 114, text: UNCONFIGURED_IMAGE_PROMPT })
  ctx.systemPrompt.section({ name: VIDEO_PROMPT_SECTION, order: 115, text: UNCONFIGURED_VIDEO_PROMPT })
  ctx.systemPrompt.section({ name: TEXT_PROMPT_SECTION, order: 116, text: UNCONFIGURED_TEXT_PROMPT })
  ctx.on('system-prompt/assemble', async (_assembly, _context, next) => {
    let configured = false
    let grsai = false
    try {
      configured = await settings.isConfigured()
      grsai = await settings.isGrsaiConfigured()
    } catch (error) {
      ctx.logger.info('image-generation: prompt assembly treated configuration as unset; code=%s', safeError(error).code)
    }
    const assembly = await next()
    return {
      ...assembly,
      sections: assembly.sections.map(section => {
        if (section.name === IMAGE_PROMPT_SECTION) return { ...section, text: configured ? CONFIGURED_IMAGE_PROMPT : UNCONFIGURED_IMAGE_PROMPT }
        if (section.name === VIDEO_PROMPT_SECTION) return { ...section, text: grsai ? CONFIGURED_VIDEO_PROMPT : UNCONFIGURED_VIDEO_PROMPT }
        if (section.name === TEXT_PROMPT_SECTION) return { ...section, text: grsai ? CONFIGURED_TEXT_PROMPT : UNCONFIGURED_TEXT_PROMPT }
        return section
      }),
    }
  })
}
