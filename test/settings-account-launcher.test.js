import { join } from 'node:path'
import { composeEntries, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('Desktop account UI composition', () => {
  it.each([
    ['dsh-desktop.patch.yml', false, true],
    ['dsh-desktop-safe.patch.yml', true, false]
  ])(
    '%s account UI disabled=%s onboardingSkipped=%s while preserving model settings',
    (filename, disabled, onboardingSkipped) => {
      const web = loadOverlayPatches('test', join(root, 'node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml'))
      const desktop = loadOverlayPatches('test', join(root, 'build', filename))
      const upstream = composeEntries([web])
      expect(upstream.find((entry) => entry.id === 'ui-settings-account')?.name)
        .toBe('@deepseek-ai/dsh-client-ui-settings-account')
      const entries = composeEntries([web, desktop])
      const account = entries.find((entry) => entry.id === 'ui-settings-account')
      expect(Boolean(account?.disabled)).toBe(disabled)
      expect(account?.config?.step === 'done').toBe(onboardingSkipped)
      for (const name of ['@deepseek-ai/dsh-client-ui-settings-general', '@deepseek-ai/dsh-client-ui-settings-models']) {
        expect(entries.filter((entry) => entry.name === name && !entry.disabled)).toHaveLength(1)
      }
    }
  )
})
