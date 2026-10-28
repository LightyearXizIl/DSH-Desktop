export const MAX_WALLPAPER_LENGTH = 2_200_000

export interface ThemeSettings {
  enabled: boolean
  mode: 'mica' | 'compat'
  blur: number
  frost: number
  fluidHue: number
  fluidDepth: number
  bgBrightness: number
  background: 'fluid' | 'wallpaper'
  wallpaper: string
  whale: boolean
  critters: boolean
  mesh: boolean
  spotlight: boolean
  press: boolean
  wallpaperBlur: number
  wallpaperFrost: number
  videoBlur: number
  videoBrightness: number
}

export const DEFAULT_SETTINGS: ThemeSettings = {
  enabled: true,
  mode: 'mica',
  blur: 20,
  frost: 7,
  fluidHue: 320,
  fluidDepth: 25,
  bgBrightness: 50,
  background: 'fluid',
  wallpaper: '',
  whale: true,
  critters: true,
  mesh: true,
  spotlight: true,
  press: true,
  wallpaperBlur: 0,
  wallpaperFrost: 0,
  videoBlur: 6,
  videoBrightness: 45,
}

const NUMBER_LIMITS = {
  blur: [0, 40],
  frost: [0, 100],
  fluidHue: [0, 360],
  fluidDepth: [0, 100],
  bgBrightness: [0, 100],
  wallpaperBlur: [0, 40],
  wallpaperFrost: [0, 100],
  videoBlur: [0, 40],
  videoBrightness: [0, 100],
} as const

type NumericKey = keyof typeof NUMBER_LIMITS

export function normalizeSettings(value: unknown): ThemeSettings {
  const source = isRecord(value) ? value : {}
  const settings: ThemeSettings = {
    ...DEFAULT_SETTINGS,
    enabled: readBoolean(source.enabled, DEFAULT_SETTINGS.enabled),
    mode: source.mode === 'compat' ? 'compat' : 'mica',
    background: source.background === 'wallpaper' ? 'wallpaper' : 'fluid',
    wallpaper: normalizeWallpaper(source.wallpaper),
    whale: readBoolean(source.whale, DEFAULT_SETTINGS.whale),
    critters: readBoolean(source.critters, DEFAULT_SETTINGS.critters),
    mesh: readBoolean(source.mesh, DEFAULT_SETTINGS.mesh),
    spotlight: readBoolean(source.spotlight, DEFAULT_SETTINGS.spotlight),
    press: readBoolean(source.press, DEFAULT_SETTINGS.press),
  }
  for (const key of Object.keys(NUMBER_LIMITS) as NumericKey[]) {
    settings[key] = clampSetting(key, source[key])
  }
  return settings
}

export function clampSetting(key: NumericKey, value: unknown): number {
  const fallback = DEFAULT_SETTINGS[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const [min, max] = NUMBER_LIMITS[key]
  return Math.min(max, Math.max(min, value))
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeWallpaper(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (value.startsWith('data:image/')) return value.length <= MAX_WALLPAPER_LENGTH ? value : ''
  if (value.startsWith('host:')) {
    return /^host:[0-9a-f-]{36}\.(?:mp4|webm|ogg|mov|m4v|mkv)$/u.test(value) ? value : ''
  }
  return ''
}
