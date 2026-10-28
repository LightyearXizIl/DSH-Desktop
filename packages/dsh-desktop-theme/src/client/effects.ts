import type { ThemeSettings } from './settings-model.ts'
import { mountWhale, type WhaleHandle } from './whale.ts'
import { mountMesh, type MeshHandle } from './mesh.ts'
import { startSpotlight } from './spotlight.ts'
import { attachFluidShader, SITE_FLUID_PARAMS, type FluidShaderHandle } from './fluid.ts'
import { attachFluidInteractions } from './fluid-interactions.ts'
import { fluidToneColors } from './fluid-tones.ts'

export interface EffectsController {
  mount: (settings: ThemeSettings, dark: boolean) => void
  update: (settings: ThemeSettings, dark: boolean) => void
  dispose: () => void
}

export function createEffects(): EffectsController {
  let whale: WhaleHandle | undefined
  let mesh: MeshHandle | undefined
  let fluid: FluidShaderHandle | undefined
  let fluidInteractions: (() => void) | undefined
  let spotlight: (() => void) | undefined
  let active = false
  let settings: ThemeSettings | undefined

  const syncWhale = (dark: boolean): void => {
    if (settings?.whale === true && whale === undefined) {
      const host = document.querySelector<HTMLElement>('[data-dsh-desktop-ambient]')
      if (host !== null) whale = mountWhale(host, dark)
    } else if (settings?.whale !== true && whale !== undefined) {
      whale.dispose()
      whale = undefined
    } else {
      whale?.setDark(dark)
    }
  }

  const syncMesh = (): void => {
    if (settings?.mesh === true && mesh === undefined) {
      const host = document.querySelector<HTMLElement>('[data-dsh-desktop-ambient]')
      if (host !== null) mesh = mountMesh(host)
    } else if (settings?.mesh !== true && mesh !== undefined) {
      mesh.dispose()
      mesh = undefined
    }
  }

  const syncFluid = (dark: boolean): void => {
    if (!active || settings === undefined) return
    const canvas = document.querySelector<HTMLCanvasElement>('[data-dsh-desktop-fluid-canvas]')
    if (canvas === null) return
    if (fluid === undefined) {
      try {
        fluid = attachFluidShader(canvas, {
          ...SITE_FLUID_PARAMS,
          ...fluidToneColors(dark, settings.fluidHue, settings.fluidDepth),
        })
        fluidInteractions = attachFluidInteractions({ main: fluid, mainCanvas: canvas })
      } catch {
        fluid = undefined
      }
    } else {
      fluid.setParams({
        ...SITE_FLUID_PARAMS,
        ...fluidToneColors(dark, settings.fluidHue, settings.fluidDepth),
      })
    }
  }

  return {
    mount(next, dark) {
      settings = next
      active = true
      syncWhale(dark)
      syncMesh()
      syncFluid(dark)
      if (spotlight === undefined && (next.spotlight || next.press)) spotlight = startSpotlight()
    },
    update(next, dark) {
      settings = next
      if (!active) return
      syncWhale(dark)
      syncMesh()
      syncFluid(dark)
      if ((next.spotlight || next.press) && spotlight === undefined) spotlight = startSpotlight()
      else if (!next.spotlight && !next.press && spotlight !== undefined) {
        spotlight()
        spotlight = undefined
      }
    },
    dispose() {
      active = false
      whale?.dispose()
      whale = undefined
      mesh?.dispose()
      mesh = undefined
      spotlight?.()
      spotlight = undefined
      fluidInteractions?.()
      fluidInteractions = undefined
      fluid?.dispose()
      fluid = undefined
      settings = undefined
    },
  }
}
