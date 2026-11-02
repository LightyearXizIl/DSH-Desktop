// What each provider and model accepts for ratio, resolution and quality, and
// the request fields a choice becomes. The settings card shows exactly these
// values; saved choices outside a model's set fall back to its defaults.
// Sources (checked 2026-11-02): GrsAI apifox documents, Agnes AI model docs
// (wiki.agnes-ai.cn), OpenAI GPT Image size rules (mirrored by GrsAI's VIP
// canvas table), and the Ark Seedream pixel range.
import { ImageError } from './errors.js'

export const IMAGE_RATIOS = Object.freeze(['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'])
export const VIDEO_RATIOS = Object.freeze(['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'])
/** Quality "default" sends no quality field and leaves the provider's own default. */
export const DEFAULT_QUALITY = 'default'

const landscape = ratio => ['16:9', '4:3', '3:2', '21:9'].includes(ratio)
const portrait = ratio => ['9:16', '3:4', '2:3'].includes(ratio)

// GPT Image 2 / 2.5 flexible canvases: edges are multiples of 16, the longest
// edge at most 3840, ratio at most 3:1, 655,360-8,294,400 pixels.
const FLEX_SIZES = {
  '1K': { '1:1': '1024x1024', '16:9': '1280x720', '9:16': '720x1280', '4:3': '1152x864', '3:4': '864x1152', '3:2': '1536x1024', '2:3': '1024x1536', '21:9': '1456x624' },
  '2K': { '1:1': '2048x2048', '16:9': '2048x1152', '9:16': '1152x2048', '4:3': '2304x1728', '3:4': '1728x2304', '3:2': '2048x1360', '2:3': '1360x2048', '21:9': '2912x1248' },
  '4K': { '1:1': '2880x2880', '16:9': '3840x2160', '9:16': '2160x3840', '4:3': '3264x2448', '3:4': '2448x3264', '3:2': '3504x2336', '2:3': '2336x3504', '21:9': '3840x1648' },
}
// GPT Image 1 / 1.5 / mini accept three canvases; DALL-E 3 names its own three.
const gptCanvas = ratio => (landscape(ratio) ? '1536x1024' : portrait(ratio) ? '1024x1536' : '1024x1024')
const dalleCanvas = ratio => (landscape(ratio) ? '1792x1024' : portrait(ratio) ? '1024x1792' : '1024x1024')
// Seedream 2K canvases; 4K doubles each edge and stays inside the documented
// 4096x4096 total-pixel ceiling.
const SEEDREAM_2K = { '1:1': '2048x2048', '16:9': '2560x1440', '9:16': '1440x2560', '4:3': '2304x1728', '3:4': '1728x2304', '3:2': '2496x1664', '2:3': '1664x2496', '21:9': '3024x1296' }
const doubled = size => size.split('x').map(edge => Number(edge) * 2).join('x')
const SEEDREAM_4K = /^doubao-seedream-(?:4-0|4-5|5-0|5-0-lite)-\d{6}$/u

const isFlexibleGpt = model => /^gpt-image-2(?:\.5)?(?:$|[-.])/u.test(model)
const isGrsaiPixelCanvas = model => /-(vip|flare|sunburst)$/u.test(model)

/**
 * The choices one image model offers. `resolutions` and `qualities` are empty
 * when the model takes no such field; the first entry of each list is the default.
 * @returns {{ ratios: string[], resolutions: string[], qualities: string[] }}
 */
export function imageCapabilities(provider, model = '') {
  switch (provider) {
    // 5.0 Pro tops out near 2K (4,624,220 pixels), and an endpoint ID says
    // nothing about its model, so only the 4.x / 5.0 / 5.0 Lite IDs offer 4K.
    case 'bytedance': return { ratios: [...IMAGE_RATIOS], resolutions: SEEDREAM_4K.test(model) ? ['2K', '4K'] : ['2K'], qualities: [] }
    case 'openai': return {
      ratios: [...IMAGE_RATIOS],
      resolutions: isFlexibleGpt(model) ? ['1K', '2K', '4K'] : ['1K'],
      qualities: ['auto', 'low', 'medium', 'high'],
    }
    case 'agnes': return { ratios: [...IMAGE_RATIOS], resolutions: ['1K', '2K', '3K', '4K'], qualities: [] }
    case 'compatible': return {
      ratios: [...IMAGE_RATIOS],
      // An unknown service: GPT Image canvases by default, DALL-E 3 canvases, or no size at all.
      resolutions: ['gpt', 'dalle3', 'omit'],
      qualities: [DEFAULT_QUALITY, 'auto', 'low', 'medium', 'high', 'standard', 'hd'],
    }
    case 'grsai': {
      if (model.startsWith('nano-banana')) {
        // Channel variants named for a size render only that size.
        const fixed = /-(2k|4k)-/u.exec(model)?.[1]?.toUpperCase()
        return { ratios: [...IMAGE_RATIOS], resolutions: fixed ? [fixed] : ['1K', '2K', '4K'], qualities: [] }
      }
      if (isGrsaiPixelCanvas(model)) {
        const qualities = model.endsWith('-sunburst') ? [DEFAULT_QUALITY, 'low', 'medium', 'high', 'xhigh', 'max']
          : model.endsWith('-flare') ? [DEFAULT_QUALITY, 'low', 'medium', 'high'] : []
        return { ratios: [...IMAGE_RATIOS], resolutions: ['1K', '2K', '4K'], qualities }
      }
      // GPT Image 2 / 2.5 take the ratio at 1K; a model GrsAI adds later gets only the ratio.
      return { ratios: [...IMAGE_RATIOS], resolutions: [], qualities: [] }
    }
    default: throw new ImageError('PROVIDER', 'Choose a supported image provider.')
  }
}

/**
 * A saved choice that the current model does not offer falls back to the
 * model's default, so a model switch never breaks generation.
 */
const pick = (list, value) => (list.includes(value) ? value : list[0])

/**
 * The ratio, resolution and quality one image request uses. An explicit tool
 * ratio wins over the saved default ratio and must be one the model renders.
 */
export function imageChoice(provider, spec, requestedRatio) {
  const caps = imageCapabilities(provider, spec.model)
  if (requestedRatio !== undefined && !caps.ratios.includes(requestedRatio)) {
    throw new ImageError('RATIO', `${spec.model} supports ${caps.ratios.join(', ')}.`)
  }
  return {
    ratio: requestedRatio ?? pick(caps.ratios, spec.imageRatio ?? '1:1'),
    resolution: caps.resolutions.length > 0 ? pick(caps.resolutions, spec.imageResolution) : undefined,
    quality: caps.qualities.length > 0 ? pick(caps.qualities, spec.imageQuality) : undefined,
  }
}

/** The request fields for one image choice, for providers on the OpenAI-shaped Images API. */
export function imageSizeFields(provider, model, { ratio, resolution, quality }) {
  switch (provider) {
    case 'bytedance': return { size: resolution === '4K' ? doubled(SEEDREAM_2K[ratio]) : SEEDREAM_2K[ratio] }
    case 'openai': return { size: isFlexibleGpt(model) ? FLEX_SIZES[resolution][ratio] : gptCanvas(ratio), quality }
    case 'agnes': return { size: resolution, ratio }
    case 'compatible': return {
      ...(resolution === 'omit' ? {} : { size: resolution === 'dalle3' ? dalleCanvas(ratio) : gptCanvas(ratio) }),
      ...(quality === DEFAULT_QUALITY ? {} : { quality }),
    }
    default: throw new ImageError('PROVIDER', 'Choose a supported image provider.')
  }
}

/** GrsAI's unified-API image fields: Nano Banana takes ratio + size, the VIP canvases a pixel size. */
export function grsaiImageFields(model, { ratio, resolution, quality }) {
  if (model.startsWith('nano-banana')) return { aspectRatio: ratio, imageSize: resolution }
  if (isGrsaiPixelCanvas(model)) return { aspectRatio: FLEX_SIZES[resolution][ratio], ...(quality && quality !== DEFAULT_QUALITY ? { quality } : {}) }
  return { aspectRatio: ratio }
}

/**
 * What each video family accepts. `duration` is null when the model renders a
 * fixed length; the first resolution is the default, kept at a low tier because
 * cost scales with it. `maxSeconds` caps the length at a given resolution.
 */
const VIDEO_FAMILIES = {
  'grsai:veo': { ratios: ['16:9', '9:16'], resolutions: [], duration: null },
  'grsai:minimax': { ratios: ['16:9', '9:16'], resolutions: ['768p', '480p', '1080p'], duration: { min: 1, max: 15, default: 6 }, maxSeconds: { '1080p': 10 } },
  'grsai:agnes': { ratios: [...VIDEO_RATIOS], resolutions: ['720p', '1080p', '2k'], duration: { min: 4, max: 12, default: 5 } },
  'grsai:wan': { ratios: [...VIDEO_RATIOS], resolutions: ['720p', '480p', '1080p'], duration: { min: 2, max: 30, default: 5 } },
  // A model the catalog added after this release: send the unified API's
  // common fields and let GrsAI reject what it does not accept.
  'grsai:other': { ratios: [...VIDEO_RATIOS], resolutions: [], duration: { min: 1, max: 60 } },
  'agnes:standard': { ratios: [...VIDEO_RATIOS], resolutions: ['720P', '1080P', '2K'], duration: { min: 4, max: 12, default: 5 } },
  // Agnes Video 2.5 Flash renders 720P only.
  'agnes:flash': { ratios: [...VIDEO_RATIOS], resolutions: ['720P'], duration: { min: 4, max: 12, default: 5 } },
}

export function videoFamily(provider, model) {
  if (provider === 'agnes') return model.includes('flash') ? 'agnes:flash' : 'agnes:standard'
  if (model.startsWith('veo')) return 'grsai:veo'
  if (model.startsWith('minimax')) return 'grsai:minimax'
  if (model.startsWith('agnes')) return 'grsai:agnes'
  if (model.startsWith('wan')) return 'grsai:wan'
  return 'grsai:other'
}

/** Ratios, resolutions and duration range the given video model accepts. */
export function videoCapabilities(provider, model) {
  const { ratios, resolutions, duration, maxSeconds } = VIDEO_FAMILIES[videoFamily(provider, model)]
  return { ratios: [...ratios], resolutions: [...resolutions], duration, ...(maxSeconds ? { maxSeconds } : {}) }
}

/**
 * The ratio, resolution and length one clip uses, refused before submission
 * (and before credits are spent) when the model cannot render it.
 */
export function videoChoice(provider, spec, requestedRatio, requestedSeconds) {
  const caps = videoCapabilities(provider, spec.videoModel)
  const ratio = requestedRatio ?? pick(caps.ratios, spec.videoRatio ?? '16:9')
  if (!caps.ratios.includes(ratio)) throw new ImageError('RATIO', `${spec.videoModel} supports ${caps.ratios.join(', ')}.`)
  const resolution = caps.resolutions.length > 0 ? pick(caps.resolutions, spec.videoResolution) : undefined
  if (!caps.duration) return { ratio, resolution, seconds: undefined }
  const seconds = requestedSeconds ?? caps.duration.default
  const max = Math.min(caps.duration.max, caps.maxSeconds?.[resolution] ?? Infinity)
  if (seconds !== undefined && (!Number.isInteger(seconds) || seconds < caps.duration.min || seconds > max)) {
    throw new ImageError('DURATION', `${spec.videoModel} renders ${caps.duration.min}-${max} seconds${max < caps.duration.max ? ` at ${resolution}` : ''}.`)
  }
  return { ratio, resolution, seconds }
}

const OPTION = /^[A-Za-z0-9:._-]{1,32}$/u

/** Saved generation options: short tokens only, checked against the model at save time. */
export function storedOptions(input = {}) {
  const options = {}
  for (const name of ['imageRatio', 'imageResolution', 'imageQuality', 'videoRatio', 'videoResolution']) {
    const value = input[name]
    if (value === undefined || value === null || value === '') continue
    if (typeof value !== 'string' || !OPTION.test(value)) throw new ImageError('OPTION', 'Choose a supported generation option.')
    options[name] = value
  }
  return options
}

/** Refuse a saved option the selected model does not offer, so the card shows what is sent. */
export function checkOptions(provider, spec) {
  const image = imageCapabilities(provider, spec.model)
  const bad = (list, value) => value !== undefined && list.length > 0 && !list.includes(value)
  if (bad(image.ratios, spec.imageRatio) || bad(image.resolutions, spec.imageResolution) || bad(image.qualities, spec.imageQuality)) {
    throw new ImageError('OPTION', `The selected image options are not available for ${spec.model}.`)
  }
  if (spec.videoModel) {
    const video = videoCapabilities(provider, spec.videoModel)
    if (bad(video.ratios, spec.videoRatio) || bad(video.resolutions, spec.videoResolution)) {
      throw new ImageError('OPTION', `The selected video options are not available for ${spec.videoModel}.`)
    }
  }
}
