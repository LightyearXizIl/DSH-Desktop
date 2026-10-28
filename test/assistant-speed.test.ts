import { describe, expect, it } from 'vitest'
import { assistantSpeed, assistantSpeedTitle, formatTokensPerSecond } from '../src/shared/assistant-speed'

describe('assistant speed', () => {
  it('uses generated tokens over decode time, not prompt time', () => {
    expect(assistantSpeed(400, 12_500)).toEqual({
      outputTokens: 400,
      decodeMs: 12_500,
      tokensPerSecond: 32
    })
  })

  it('does not invent a speed without complete readings', () => {
    expect(assistantSpeed(undefined, 10_000).tokensPerSecond).toBeNull()
    expect(assistantSpeed(100, 0).tokensPerSecond).toBeNull()
    expect(assistantSpeed(100, null).tokensPerSecond).toBeNull()
  })

  it('formats one decimal place for the message action row', () => {
    expect(formatTokensPerSecond(8.04, 'zh')).toBe('8.0 tok/s')
    expect(formatTokensPerSecond(null, 'en')).toBe('Speed unavailable')
    expect(assistantSpeedTitle(assistantSpeed(400, 12_500), 'zh')).toContain('400 tokens')
    expect(assistantSpeedTitle(assistantSpeed(undefined, 12_500), 'zh')).toBeUndefined()
  })
})
