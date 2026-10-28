import { createElement as h, useId, useRef, type ChangeEvent, type ReactElement, type ReactNode } from 'react'
import {
  Button,
  SegmentedControl,
  Switch,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { ThemeState } from './theme.ts'
import { imageFileToDataUrl } from './image-file.ts'
import type { ThemeSettings } from './settings-model.ts'

export interface ThemeSettingsPageInjected {
  update: (patch: Partial<ThemeSettings>) => Promise<boolean>
  hooks: {
    settings: ObservableSnapshot<ThemeState>
    dark: ObservableSnapshot<boolean>
    error: ObservableSnapshot<string>
  }
}

export type ThemeSettingsPageProps =
  PropsRuntime<'settings.plugins.tab'> & PropsLocale<'settings.desktopTheme'> & InjectFace<ThemeSettingsPageInjected>

export function ThemeSettingsPage(props: ThemeSettingsPageProps): ReactElement {
  const { t, update } = props
  const id = useId()
  const settings = props.useSettings((state: ThemeState) => state).settings
  const dark = props.useDark((value) => value)
  const error = props.useError((value) => value)
  const imageInput = useRef<HTMLInputElement | null>(null)
  const videoInput = useRef<HTMLInputElement | null>(null)
  const wallpaper = settings.wallpaper
  const videoWallpaper = wallpaper.startsWith('host:')
  const bgMin = dark ? 0 : 50
  const bgMax = dark ? 50 : 100
  const bgValue = Math.min(bgMax, Math.max(bgMin, settings.bgBrightness))

  /** Delete one uploaded video file (the host prunes replaced ones itself). */
  const deleteHostWallpaper = (id: string): void => {
    void fetch(`/api/desktop-theme/wallpaper?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      cache: 'no-store',
    }).catch(() => {})
  }

  const uploadVideo = async (file: File): Promise<void> => {
    const response = await fetch('/api/desktop-theme/wallpaper', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: file,
    })
    if (!response.ok) throw new Error(`Wallpaper upload failed: ${response.status}`)
    const result = await response.json() as { id?: unknown }
    if (typeof result.id !== 'string') throw new Error('Invalid wallpaper response')
    const saved = await update({ background: 'wallpaper', wallpaper: `host:${result.id}` })
    // Only the settings document references an upload, so a value that never
    // reached the host would leave an orphan file behind.
    if (!saved) deleteHostWallpaper(result.id)
  }

  const chooseVideo = async (): Promise<void> => {
    const picker = (window as Window & {
      showOpenFilePicker?: (options: {
        multiple?: boolean
        types?: Array<{ description?: string; accept: Record<string, string[]> }>
      }) => Promise<FileSystemFileHandle[]>
    }).showOpenFilePicker
    if (picker !== undefined) {
      try {
        const [handle] = await picker({
          multiple: false,
          types: [{ description: 'Video', accept: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.mkv'] } }],
        })
        if (handle === undefined) return
        await uploadVideo(await handle.getFile())
      } catch {
        // Picker cancelled.
      }
      return
    }
    videoInput.current?.click()
  }

  return h('div', { className: 'dshDesktopThemePage' },
    h(Row, {
      title: t('theme.title'),
      description: t('theme.description'),
      control: h(Switch, {
        checked: settings.enabled,
        label: t('theme.title'),
        onChange: (enabled) => { void update({ enabled }) },
      }),
      last: false,
    }),
    settings.enabled ? null : h('p', { className: 'dshDesktopThemeNotice' }, t('theme.disabledHint')),
    error === '' ? null : h('p', { className: 'dshDesktopThemeError', role: 'alert' }, error),
    h(Group, { title: t('theme.mode'), description: t('theme.modeHint') },
      h(Row, {
        title: t('theme.modeRow'),
        control: h(SegmentedControl<'mica' | 'compat'>, {
          id: `${id}-mode`,
          label: t('theme.mode'),
          value: settings.mode,
          options: [
            { value: 'mica', label: t('theme.modeMica') },
            { value: 'compat', label: t('theme.modeCompat') },
          ] as const,
          onChange: (mode) => { void update({ mode }) },
        }),
      }),
    ),
    h(Group, { title: t('theme.materialGroup') },
      h(Row, {
        title: t('theme.blur'),
        description: t('theme.blurHint'),
        control: h(Knob, {
          label: t('theme.blur'),
          value: settings.blur,
          min: 0,
          max: 40,
          step: 0.5,
          unit: 'px',
          onChange: (blur) => { void update({ blur }) },
        }),
      }),
      h(Row, {
        title: t('theme.frost'),
        description: t('theme.frostHint'),
        control: h(Knob, {
          label: t('theme.frost'),
          value: settings.frost,
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
          onChange: (frost) => { void update({ frost }) },
        }),
        last: true,
      }),
    ),
    h(Group, { title: t('theme.background'), description: t('theme.backgroundHint') },
      h(Row, {
        title: t('theme.backgroundRow'),
        control: h(SegmentedControl<'fluid' | 'wallpaper'>, {
          id: `${id}-background`,
          label: t('theme.background'),
          value: settings.background,
          options: [
            { value: 'fluid', label: t('theme.backgroundFluid') },
            { value: 'wallpaper', label: t('theme.backgroundWallpaper') },
          ] as const,
          onChange: (background) => { void update({ background }) },
        }),
      }),
      settings.background === 'fluid'
        ? h(Row, {
            title: t('theme.fluidHue'),
            description: t('theme.fluidHueHint'),
            control: h(Knob, {
              label: t('theme.fluidHue'),
              value: settings.fluidHue,
              min: 0,
              max: 360,
              step: 1,
              unit: '°',
              onChange: (fluidHue) => { void update({ fluidHue }) },
            }),
          })
        : h(Row, {
            title: t('theme.wallpaper'),
            description: t('theme.wallpaperHint'),
            control: h('div', { className: 'dshDesktopThemeActions' },
              h(Button, {
                variant: 'outline',
                size: 'sm',
                onClick: () => imageInput.current?.click(),
              }, t('theme.chooseImage')),
              h(Button, {
                variant: 'outline',
                size: 'sm',
                onClick: () => { void chooseVideo() },
              }, t('theme.chooseVideo')),
              wallpaper === '' ? null : h(Button, {
                variant: 'ghost',
                size: 'sm',
                className: 'dshDesktopThemeDanger',
                onClick: () => { void update({ wallpaper: '' }) },
              }, t('theme.deleteWallpaper')),
            ),
          }),
      settings.background === 'fluid'
        ? h(Row, {
            title: t('theme.fluidDepth'),
            description: t('theme.fluidDepthHint'),
            control: h(Knob, {
              label: t('theme.fluidDepth'),
              value: settings.fluidDepth,
              min: 0,
              max: 100,
              step: 1,
              unit: '%',
              onChange: (fluidDepth) => { void update({ fluidDepth }) },
            }),
          })
        : null,
      h('input', {
        ref: imageInput,
        type: 'file',
        accept: 'image/*',
        hidden: true,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file === undefined) return
          void imageFileToDataUrl(file)
            .then((wallpaper) => update({ background: 'wallpaper', wallpaper }))
            .catch(() => {})
        },
      }),
      h('input', {
        ref: videoInput,
        type: 'file',
        accept: 'video/mp4,video/webm,video/ogg,video/quicktime',
        hidden: true,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file === undefined) return
          void uploadVideo(file).catch(() => {})
        },
      }),
      settings.background === 'wallpaper'
        ? videoWallpaper
          ? h(Row, {
              title: t('theme.videoBlur'),
              description: t('theme.videoBlurHint'),
              control: h(Knob, {
                label: t('theme.videoBlur'),
                value: settings.videoBlur,
                min: 0,
                max: 40,
                step: 0.5,
                unit: 'px',
                onChange: (videoBlur) => { void update({ videoBlur }) },
              }),
            })
          : h(Row, {
              title: t('theme.wallpaperBlur'),
              description: t('theme.wallpaperBlurHint'),
              control: h(Knob, {
                label: t('theme.wallpaperBlur'),
                value: settings.wallpaperBlur,
                min: 0,
                max: 40,
                step: 0.5,
                unit: 'px',
                onChange: (wallpaperBlur) => { void update({ wallpaperBlur }) },
              }),
            })
        : null,
      settings.background === 'wallpaper'
        ? videoWallpaper
          ? h(Row, {
              title: t('theme.videoBrightness'),
              description: t('theme.videoBrightnessHint'),
              control: h(Knob, {
                label: t('theme.videoBrightness'),
                value: settings.videoBrightness,
                min: 0,
                max: 100,
                step: 1,
                unit: '%',
                onChange: (videoBrightness) => { void update({ videoBrightness }) },
              }),
            })
          : h(Row, {
              title: t('theme.wallpaperFrost'),
              description: t('theme.wallpaperFrostHint'),
              control: h(Knob, {
                label: t('theme.wallpaperFrost'),
                value: settings.wallpaperFrost,
                min: 0,
                max: 100,
                step: 1,
                unit: '%',
                onChange: (wallpaperFrost) => { void update({ wallpaperFrost }) },
              }),
            })
        : null,
      h(Row, {
        title: t('theme.bgBrightness'),
        description: t(dark ? 'theme.bgBrightnessHintDark' : 'theme.bgBrightnessHintLight'),
        control: h(Knob, {
          label: t('theme.bgBrightness'),
          value: bgValue,
          min: bgMin,
          max: bgMax,
          step: 1,
          unit: '%',
          onChange: (bgBrightness) => { void update({ bgBrightness }) },
        }),
        last: true,
      }),
    ),
    h(Group, { title: t('theme.decorAmbient') },
      h(Row, {
        title: t('theme.whale'),
        description: t('theme.whaleHint'),
        control: h(Switch, {
          checked: settings.whale,
          label: t('theme.whale'),
          onChange: (whale) => { void update({ whale }) },
        }),
      }),
      h(Row, {
        title: t('theme.critters'),
        description: t('theme.crittersHint'),
        control: h(Switch, {
          checked: settings.critters,
          label: t('theme.critters'),
          onChange: (critters) => { void update({ critters }) },
        }),
      }),
      h(Row, {
        title: t('theme.mesh'),
        description: t('theme.meshHint'),
        control: h(Switch, {
          checked: settings.mesh,
          label: t('theme.mesh'),
          onChange: (mesh) => { void update({ mesh }) },
        }),
        last: true,
      }),
    ),
    h(Group, { title: t('theme.decorHover') },
      h(Row, {
        title: t('theme.spotlight'),
        description: t('theme.spotlightHint'),
        control: h(Switch, {
          checked: settings.spotlight,
          label: t('theme.spotlight'),
          onChange: (spotlight) => { void update({ spotlight }) },
        }),
      }),
      h(Row, {
        title: t('theme.press'),
        description: t('theme.pressHint'),
        control: h(Switch, {
          checked: settings.press,
          label: t('theme.press'),
          onChange: (press) => { void update({ press }) },
        }),
        last: true,
      }),
    ),
  )
}

function Row(props: {
  title: string
  description?: string
  control: ReactNode
  last?: boolean
}): ReactElement {
  return h('div', {
    className: `dshDesktopThemeRow${props.last === true ? ' dshDesktopThemeRowLast' : ''}`,
  },
  h('div', { className: 'dshDesktopThemeRowText' },
    h('div', { className: 'dshDesktopThemeRowTitle' }, props.title),
    props.description === undefined ? null : h('div', { className: 'dshDesktopThemeRowDescription' }, props.description),
  ),
  h('div', { className: 'dshDesktopThemeControl' }, props.control),
  )
}

function Group(props: {
  title: string
  description?: string
  children?: ReactNode
}): ReactElement {
  return h('section', { className: 'dshDesktopThemeGroup' },
    h('h3', { className: 'dshDesktopThemeGroupTitle' }, props.title),
    props.description === undefined ? null : h('p', { className: 'dshDesktopThemeGroupDescription' }, props.description),
    props.children,
  )
}

function Knob(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}): ReactElement {
  const clamp = (value: number): number => Math.min(props.max, Math.max(props.min, value))
  return h('div', { className: 'dshDesktopThemeKnob' },
    h('input', {
      className: 'dshDesktopThemeRange',
      type: 'range',
      min: props.min,
      max: props.max,
      step: props.step,
      value: props.value,
      'aria-label': props.label,
      onChange: (event: ChangeEvent<HTMLInputElement>) => props.onChange(clamp(Number(event.target.value))),
    }),
    h('span', { className: 'dshDesktopThemeNumber' },
      h('input', {
        type: 'number',
        min: props.min,
        max: props.max,
        step: props.step,
        value: props.value,
        'aria-label': props.label,
        onChange: (event: ChangeEvent<HTMLInputElement>) => props.onChange(clamp(Number(event.target.value))),
      }),
      h('span', null, props.unit),
    ),
  )
}

export const THEME_SETTINGS_STYLES = `
.dshDesktopThemePage { display:flex; flex-direction:column; width:100%; max-width:760px; color:var(--dsw-alias-label-primary); }
.dshDesktopThemeNotice { margin:0; padding:10px 12px; border:0.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md); color:var(--dsw-alias-label-secondary); font-size:13px; line-height:20px; }
.dshDesktopThemeError { margin:8px 0 0; color:var(--dsw-alias-state-error-primary); font-size:12px; line-height:18px; }
.dshDesktopThemeGroup { display:flex; flex-direction:column; }
.dshDesktopThemeGroupTitle { margin:24px 0 0; color:var(--dsw-alias-label-primary); font-size:14px; font-weight:400; line-height:22px; }
.dshDesktopThemeGroupDescription { margin:4px 0 0; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dshDesktopThemeRow { display:flex; align-items:center; justify-content:space-between; gap:24px; padding:16px 0; border-bottom:0.5px solid var(--dsw-alias-border-l2); }
.dshDesktopThemeRowLast { border-bottom:0; }
.dshDesktopThemeRowText { display:flex; flex-direction:column; flex:1; gap:4px; min-width:0; padding-right:48px; }
.dshDesktopThemeRowTitle { color:var(--dsw-alias-label-primary); font-size:14px; line-height:22px; }
.dshDesktopThemeRowDescription { color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
.dshDesktopThemeControl { display:inline-flex; flex:none; align-items:center; gap:8px; }
.dshDesktopThemeActions { display:inline-flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
.dshDesktopThemeKnob { display:inline-flex; align-items:center; gap:8px; min-width:220px; }
.dshDesktopThemeRange { width:130px; min-width:0; accent-color:var(--dsw-alias-state-business-primary); }
.dshDesktopThemeNumber { display:inline-flex; align-items:center; gap:6px; color:var(--dsw-alias-label-secondary); font-size:14px; line-height:22px; }
.dshDesktopThemeNumber input { box-sizing:border-box; width:72px; height:36px; padding:0 8px; border:0.5px solid var(--dsw-alias-border-l4); border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font:inherit; text-align:right; }
.dshDesktopThemeNumber input:focus-visible { outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary)); outline-offset:1px; }
.dshDesktopThemeNumber input::-webkit-inner-spin-button, .dshDesktopThemeNumber input::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
.dshDesktopThemeDanger { color:var(--dsw-alias-state-error-primary); }
@media (width <= 560px) {
  .dshDesktopThemeRow { align-items:flex-start; flex-direction:column; gap:10px; }
  .dshDesktopThemeRowText { padding-right:0; }
  .dshDesktopThemeKnob { width:100%; }
  .dshDesktopThemeRange { flex:1; width:auto; }
}
`
