import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('DSH Desktop sidebar branding', () => {

  it('uses upstream platform-aware collapsed titlebar spacing', async () => {
    const client = await readFile(
      path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js'),
      'utf8'
    )

    expect(client).toContain('document.documentElement.dataset.platform === "darwin"')
    // Harness 0.2.2 reads the Windows marker into one flag that also keeps the
    // narrow-viewport drawer off, then derives the collapsed width from it.
    expect(client).toContain('const windowsTitlebar = document.documentElement.hasAttribute("data-windows-titlebar")')
    expect(client).toContain('const drawer = viewport < 768 && !windowsTitlebar')
    expect(client).toContain('const collapsedWidth = drawer || darwin || windowsTitlebar ? 0 : 56')
    expect(client).toContain('sidebar === 0 ? collapsedWidth')
  })

  it('installs the source logo into the Harness static frontend', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: { postinstall: string } }

    expect(packageJson.scripts.postinstall).toContain('node scripts/install-brand-assets.mjs')
  })
})
