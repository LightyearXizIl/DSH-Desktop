import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const LOCAL_MODEL_CONFIG_FILENAME = 'local-model.json'

export interface LocalModelConfig {
  enabled: boolean
  pythonPath: string
  strataPath: string
  modelPath: string
  model: string
  dataDir: string
  port: number
  context: string
  kv: 'int8' | 'q4_0' | 'k8v4' | 'fp16'
  vramReserveMib?: number
  vision: 'off' | 'cpu' | 'gpu'
  mtp: 'on' | 'off'
}

export interface LocalModelProbe {
  healthy: boolean
  loaded: boolean
  model?: string
}

export interface LocalModelLauncherOptions {
  configPath: string
  probe: (port: number) => Promise<LocalModelProbe>
  spawnProcess?: (command: string, args: string[], env: NodeJS.ProcessEnv) => ChildProcess
  startupTimeoutMs?: number
  pollIntervalMs?: number
  note?: (message: string) => void
}

export type LocalModelLaunchResult =
  | { status: 'disabled' }
  | { status: 'ready'; reused: true; model?: string }
  | { status: 'ready'; reused: false; model?: string }
  | { status: 'unconfigured'; reason: string }
  | { status: 'failed'; reason: string }

export function localModelConfigPath(userDataPath: string): string {
  return join(userDataPath, LOCAL_MODEL_CONFIG_FILENAME)
}

/**
 * Parse the opt-in launcher file. Invalid files are ignored rather than
 * repaired: this is user-owned local configuration, and a typo must not make
 * DSH start a process against an unrelated model directory.
 */
export function parseLocalModelConfig(value: unknown): LocalModelConfig | { error: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { error: 'local-model.json must be an object' }
  }
  const record = value as Record<string, unknown>
  if (record.enabled !== true) return { error: 'local model auto-start is not enabled' }
  const text = (key: string): string | undefined => {
    const item = record[key]
    return typeof item === 'string' && item.trim().length > 0 ? item.trim() : undefined
  }
  const pythonPath = text('pythonPath')
  const strataPath = text('strataPath')
  const modelPath = text('modelPath')
  const dataDir = text('dataDir')
  if (!pythonPath || !strataPath || !modelPath || !dataDir) {
    return { error: 'pythonPath, strataPath, modelPath and dataDir are required' }
  }
  const port = record.port ?? 8080
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
    return { error: 'port must be an integer from 1 to 65535' }
  }
  const model = text('model') ?? 'iq3_s'
  const context = text('context') ?? '32k'
  const kv = text('kv') ?? 'int8'
  const vramReserveMib = record.vramReserveMib
  const vision = text('vision') ?? 'cpu'
  const mtp = text('mtp') ?? 'on'
  if (kv !== 'int8' && kv !== 'q4_0' && kv !== 'k8v4' && kv !== 'fp16') {
    return { error: 'kv must be int8, q4_0, k8v4 or fp16' }
  }
  if (
    vramReserveMib !== undefined &&
    (typeof vramReserveMib !== 'number' || !Number.isInteger(vramReserveMib) || vramReserveMib < 0)
  ) {
    return { error: 'vramReserveMib must be a non-negative integer' }
  }
  if (vision !== 'off' && vision !== 'cpu' && vision !== 'gpu') {
    return { error: 'vision must be off, cpu or gpu' }
  }
  if (mtp !== 'on' && mtp !== 'off') return { error: 'mtp must be on or off' }
  return {
    enabled: true,
    pythonPath,
    strataPath,
    modelPath,
    dataDir,
    port,
    context,
    kv,
    ...(vramReserveMib === undefined ? {} : { vramReserveMib }),
    vision,
    mtp,
    model
  }
}

export function buildStrataLaunchArgs(config: LocalModelConfig): string[] {
  return [
    config.strataPath,
    'launch',
    '--model-path',
    config.modelPath,
    '--model',
    config.model,
    '--data-dir',
    config.dataDir,
    '--context',
    config.context,
    '--kv',
    config.kv,
    '--vision',
    config.vision,
    '--parallel',
    '1',
    '--mtp',
    config.mtp,
    '--tune',
    'skip',
    '--access',
    'local',
    '--port',
    String(config.port),
    '--yes',
    '--no-tui'
  ].concat(
    config.vramReserveMib === undefined
      ? []
      : ['--set', `vram_reserve_mib=${config.vramReserveMib}`]
  )
}

export async function readLocalModelConfig(path: string): Promise<LocalModelConfig | { error: string }> {
  if (!existsSync(path)) return { error: 'local model auto-start is not configured' }
  try {
    return parseLocalModelConfig(JSON.parse(await readFile(path, 'utf8')))
  } catch (error) {
    return { error: `local-model.json is unreadable: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * Reuse a healthy service, otherwise start Strata and wait for its health
 * endpoint. A failure is returned instead of thrown so local model problems
 * never replace DSH's normal startup path.
 */
export async function ensureLocalModelService(
  options: LocalModelLauncherOptions
): Promise<LocalModelLaunchResult> {
  const parsed = await readLocalModelConfig(options.configPath)
  if ('error' in parsed) {
    return {
      status: parsed.error === 'local model auto-start is not enabled' ? 'disabled' : 'unconfigured',
      reason: parsed.error
    }
  }

  const note = options.note ?? (() => {})
  const probe = async (): Promise<LocalModelProbe> => {
    try {
      return await options.probe(parsed.port)
    } catch {
      return { healthy: false, loaded: false }
    }
  }

  const initial = await probe()
  if (initial.healthy && initial.loaded) {
    note(`[desktop] local model reused on 127.0.0.1:${parsed.port}`)
    return { status: 'ready', reused: true, model: initial.model }
  }

  note(`[desktop] starting local model on 127.0.0.1:${parsed.port}`)
  const child = (options.spawnProcess ?? spawn)(
    parsed.pythonPath,
    buildStrataLaunchArgs(parsed),
    {
      ...process.env,
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8'
    }
  )
  child.once('error', (error) => note(`[desktop] local model launcher error: ${error.message}`))

  const timeoutMs = options.startupTimeoutMs ?? 15 * 60_000
  const intervalMs = options.pollIntervalMs ?? 2_000
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      return { status: 'failed', reason: `Strata exited with code ${child.exitCode}` }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    const current = await probe()
    if (current.healthy && current.loaded) {
      note(`[desktop] local model is ready on 127.0.0.1:${parsed.port}`)
      return { status: 'ready', reused: false, model: current.model }
    }
  }
  return { status: 'failed', reason: `local model did not become ready within ${Math.round(timeoutMs / 1000)} seconds` }
}

export async function probeLocalModel(port: number, timeoutMs = 2_000): Promise<LocalModelProbe> {
  const response = await fetch(`http://127.0.0.1:${port}/health`, {
    signal: AbortSignal.timeout(timeoutMs)
  })
  if (!response.ok) return { healthy: false, loaded: false }
  const body = await response.json() as { status?: unknown; loaded?: unknown; model?: unknown }
  return {
    healthy: body.status === 'ok',
    loaded: body.loaded === true,
    ...(typeof body.model === 'string' ? { model: body.model } : {})
  }
}
