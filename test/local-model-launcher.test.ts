import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ChildProcess } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import {
  buildStrataLaunchArgs,
  ensureLocalModelService,
  parseLocalModelConfig,
  type LocalModelConfig
} from '../src/main/runtime/local-model-launcher'

const validConfig: LocalModelConfig = {
  enabled: true,
  pythonPath: 'C:\\Strata\\python.exe',
  strataPath: 'C:\\Strata\\strata.py',
  modelPath: 'E:\\models\\IQ3_S',
  dataDir: 'E:\\Strata-data',
  port: 8080,
  context: '32k',
  kv: 'q4_0',
  vramReserveMib: 1536,
  vision: 'cpu',
  mtp: 'on',
  model: 'iq3_s'
}

describe('local model auto-start', () => {
  it('stays disabled without an opt-in file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-local-model-'))
    try {
      const result = await ensureLocalModelService({
        configPath: join(dir, 'local-model.json'),
        probe: vi.fn()
      })
      expect(result.status).toBe('unconfigured')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('ignores an invalid configuration instead of guessing paths', () => {
    expect(parseLocalModelConfig({ enabled: true, pythonPath: 'x' })).toEqual({
      error: 'pythonPath, strataPath, modelPath and dataDir are required'
    })
    expect(parseLocalModelConfig({ enabled: false })).toEqual({
      error: 'local model auto-start is not enabled'
    })
  })

  it('builds the same launch arguments used by the working manual command', () => {
    expect(buildStrataLaunchArgs(validConfig)).toEqual([
      'C:\\Strata\\strata.py',
      'launch',
      '--model-path',
      'E:\\models\\IQ3_S',
      '--model',
      'iq3_s',
      '--data-dir',
      'E:\\Strata-data',
      '--context',
      '32k',
      '--kv',
      'q4_0',
      '--vision',
      'cpu',
      '--parallel',
      '1',
      '--mtp',
      'on',
      '--tune',
      'skip',
      '--access',
      'local',
      '--port',
      '8080',
      '--yes',
      '--no-tui'
      ,
      '--set',
      'vram_reserve_mib=1536'
    ])
  })

  it('reuses a loaded service without spawning another process', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-local-model-'))
    try {
      const configPath = join(dir, 'local-model.json')
      await writeFile(configPath, JSON.stringify(validConfig))
      const spawnProcess = vi.fn()
      const result = await ensureLocalModelService({
        configPath,
        probe: async () => ({ healthy: true, loaded: true, model: 'qwen3.8-flash-next-iq3_s' }),
        spawnProcess
      })
      expect(result).toEqual({
        status: 'ready',
        reused: true,
        model: 'qwen3.8-flash-next-iq3_s'
      })
      expect(spawnProcess).not.toHaveBeenCalled()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('starts a configured service and waits until it reports loaded', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-local-model-'))
    try {
      const configPath = join(dir, 'local-model.json')
      await writeFile(configPath, JSON.stringify(validConfig))
      const spawnProcess = vi.fn(() => ({
        exitCode: null,
        once: vi.fn()
      }) as unknown as ChildProcess)
      let probes = 0
      const result = await ensureLocalModelService({
        configPath,
        probe: async () => {
          probes++
          return probes === 1
            ? { healthy: false, loaded: false }
            : { healthy: true, loaded: true, model: 'qwen3.8-flash-next-iq3_s' }
        },
        spawnProcess,
        startupTimeoutMs: 5_000,
        pollIntervalMs: 1
      })
      expect(result.status).toBe('ready')
      expect(spawnProcess).toHaveBeenCalledOnce()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
