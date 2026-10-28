export interface AssistantSpeedReading {
  readonly outputTokens: number | null
  readonly decodeMs: number | null
  readonly tokensPerSecond: number | null
}

/**
 * Derive decode speed from provider token usage and the first-token-to-finish
 * wall time. Prompt reading and TTFT stay outside this figure, matching the
 * "generation speed" users see beside a completed answer.
 */
export function assistantSpeed(
  outputTokens: number | null | undefined,
  decodeMs: number | null | undefined
): AssistantSpeedReading {
  const tokens = typeof outputTokens === 'number' && Number.isFinite(outputTokens) && outputTokens >= 0
    ? outputTokens
    : null
  const decode = typeof decodeMs === 'number' && Number.isFinite(decodeMs) && decodeMs > 0
    ? decodeMs
    : null
  return {
    outputTokens: tokens,
    decodeMs: decode,
    tokensPerSecond: tokens !== null && decode !== null ? tokens / (decode / 1000) : null
  }
}

export function formatTokensPerSecond(value: number | null, locale: 'zh' | 'en'): string {
  if (value === null) return locale === 'zh' ? '速度未记录' : 'Speed unavailable'
  return locale === 'zh' ? `${value.toFixed(1)} tok/s` : `${value.toFixed(1)} tok/s`
}

export function assistantSpeedTitle(
  reading: AssistantSpeedReading,
  locale: 'zh' | 'en'
): string | undefined {
  if (reading.outputTokens === null || reading.decodeMs === null) return undefined
  return locale === 'zh'
    ? `本条回答生成 ${reading.outputTokens} tokens，解码耗时 ${(reading.decodeMs / 1000).toFixed(1)} 秒`
    : `${reading.outputTokens} output tokens over ${(reading.decodeMs / 1000).toFixed(1)} s of decode`
}
