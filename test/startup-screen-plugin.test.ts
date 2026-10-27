import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { resolveTestNodeExecutable } from './node-executable'

const ASSET_FILES = [
  'line-1.mp3',
  'line-2.mp3',
  'line-3.mp3',
  'line-4.mp3',
  'line-5.mp3',
  'line-6.mp3',
  'sfx-tick.mp3',
  'sfx-ticks-run.mp3'
]
const require = createRequire(import.meta.url)

it('loads the bundled startup screen in a real Harness and serves its UI, config and audio', async () => {
  const home = await realpath(await mkdtemp(join(tmpdir(), 'dsh-startup-screen-')))
  await mkdir(join(home, 'launch-root'), { recursive: true })
  const launchRoot = await realpath(join(home, 'launch-root'))
  const profile = join(home, 'profiles', 'web')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    name: 'startup-screen-fixture',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
  }))

  const patch = join(home, 'startup-screen-only.patch.yml')
  await writeFile(patch, [
    '- insert:',
    '    - id: dsh-startup-screen',
    '      name: dsh-startup-screen',
    ''
  ].join('\n'))

  const runtime = new HarnessRuntime({
    dshEntryPath: resolve('node_modules/@deepseek-ai/dsh/lib/bin.js'),
    nodeEntryPath: resolve('build/harness-node-entry.mjs'),
    nodeExecutablePath: resolveTestNodeExecutable(),
    dshPatchPath: patch,
    dshSafePatchPath: resolve('build/dsh-desktop-safe.patch.yml'),
    dshHome: home,
    logPath: join(home, 'runtime.log'),
    startupTimeoutMs: 60_000,
    preferredPort: 0,
    launchProcess: (executable, args, options) => spawn(executable, args, options),
    onChanged() {}
  })

  try {
    await runtime.start(launchRoot)
    const snapshot = runtime.snapshot()
    expect(snapshot.phase, snapshot.logs.join('\n')).toBe('ready')
    expect(snapshot.pluginFailures).toEqual([])
    if (!snapshot.url || !snapshot.authToken) throw new Error('Harness did not announce its endpoint')

    const login = await fetch(`${snapshot.url}/?token=${encodeURIComponent(snapshot.authToken)}`, {
      redirect: 'manual'
    })
    const cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
    expect(cookie).not.toBe('')

    const htmlResponse = await fetch(snapshot.url, { headers: { Cookie: cookie } })
    expect(htmlResponse.status).toBe(200)
    const html = await htmlResponse.text()
    expect(html).toContain('<div id="dsh-startup-root" class="dsu-root dsu-boot"></div>')
    expect(html).toContain('window.__DSH_STARTUP_BOOT__="index"')
    expect(html).toContain('/dsh-startup/splash.css')
    expect(html).toContain('window.__DSH_STARTUP_API__')
    expect(html).toContain('window.__DSH_STARTUP_LOADED__')

    const bootGraph = /globalThis\["__DSH_BOOT__"\]\s*=\s*(\{.*?\});?<\/script>/su.exec(html)
    expect(bootGraph).not.toBeNull()
    expect(JSON.parse(bootGraph![1]!)).toMatchObject({
      entries: expect.arrayContaining([
        expect.objectContaining({ id: 'dsh-startup-screen' })
      ])
    })

    const configResponse = await fetch(new URL('/dsh-startup/config', snapshot.url), {
      headers: { Cookie: cookie }
    })
    expect(configResponse.status).toBe(200)
    const config = await configResponse.json() as { ok?: boolean; version?: string; config?: { enabled?: boolean } }
    expect(config).toMatchObject({ ok: true, version: '1.1.2', config: { enabled: true } })

    const cssResponse = await fetch(new URL('/dsh-startup/splash.css', snapshot.url), {
      headers: { Cookie: cookie }
    })
    expect(cssResponse.status).toBe(200)
    expect(await cssResponse.text()).toContain('#dsh-startup-root')

    const scriptResponse = await fetch(new URL('/dsh-startup/splash.js', snapshot.url), {
      headers: { Cookie: cookie }
    })
    expect(scriptResponse.status).toBe(200)
    expect(await scriptResponse.text()).toContain('window.__DSH_STARTUP_API__')

    for (const file of ASSET_FILES) {
      const response = await fetch(new URL(`/dsh-startup/asset/${file}`, snapshot.url), {
        headers: { Cookie: cookie }
      })
      expect(response.status, file).toBe(200)
      expect(response.headers.get('content-type'), file).toContain('audio/mpeg')
      expect((await response.arrayBuffer()).byteLength, file).toBeGreaterThan(0)
    }

    expect(await readFile(join(home, 'desktop-host-sources.patch.yml'), 'utf8'))
      .toContain('dsh-startup-screen')

    const pagePath = join(home, 'startup-page.html')
    const screenshotPath = join(home, 'startup-screen.png')
    await writeFile(pagePath, html)
    const electron = require('electron') as string
    const probe = resolve('test/startup-screen-render-probe.cjs')
    const render = spawn(electron, [
      probe,
      pagePath,
      resolve('packages/dsh-startup-screen/splash.css'),
      resolve('packages/dsh-startup-screen/assets'),
      screenshotPath
    ], { windowsHide: true })
    let stdout = ''
    let stderr = ''
    render.stdout.on('data', (chunk) => { stdout += chunk })
    render.stderr.on('data', (chunk) => { stderr += chunk })
    const exitCode = await new Promise<number>((resolveExit) => {
      render.once('close', resolveExit)
    })
    expect(exitCode, stderr).toBe(0)
    const rendered = JSON.parse(stdout) as {
      state?: { api?: string; root?: boolean; rootClass?: string; blackInnerClass?: string }
      errors?: string[]
    }
    expect(rendered.state).toMatchObject({ api: 'object', root: true })
    expect(rendered.state?.rootClass).not.toContain('dsu-boot')
    expect(rendered.state).toMatchObject({ blackInnerClass: expect.stringContaining('dsu-in') })
    expect(rendered.errors).toEqual([])
    expect((await readFile(screenshotPath)).byteLength).toBeGreaterThan(1000)
  } finally {
    await runtime.stop()
    await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}, 90_000)
