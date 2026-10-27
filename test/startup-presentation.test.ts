import { describe, expect, it } from 'vitest'
import { shouldShowNativeSplash } from '../src/main/startup-presentation'

describe('startup presentation', () => {
  it('skips the native splash for normal launches so the Harness startup animation is first', () => {
    expect(shouldShowNativeSplash('normal-launch')).toBe(false)
  })

  it.each(['safe-mode', 'web-import'] as const)('keeps the native splash for %s', reason => {
    expect(shouldShowNativeSplash(reason)).toBe(true)
  })
})
