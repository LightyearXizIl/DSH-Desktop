// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { runInNewContext } from 'node:vm'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

// jsdom replaces the global URL, which fs does not accept; read by path.
const source = readFileSync(path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'), 'utf8')
const nodeRequire = createRequire(import.meta.url)

// The repository has no react-dom typings; load it at runtime behind a narrow shape.
interface Root {
  render: (node: ReactNode) => void
  unmount: () => void
}
const { createRoot } = nodeRequire('react-dom/client') as { createRoot: (host: Element) => Root }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const NOTES = [
  '# DSH Desktop v0.0.5 — 推理等级滑条与新机器体验修复',
  '',
  '## 更新内容',
  '',
  '- **推理等级滑条**：模型菜单里的滑条。',
  '',
  '## 问题修复',
  '',
  '- **窗口两侧白条**：空图片不再渲染。',
  '',
  '## 升级说明',
  '',
  '- 0.0.3 用户需要手动安装。',
  '',
  '## 说明',
  '',
  '- 请提供 `%APPDATA%\\dsh-desktop\\harness.log` 中的行。',
  '- 未执行的验收：全新机器安装。'
].join('\n')

interface AboutHarness {
  section: (props: Record<string, unknown>) => ReactNode
  markdown: string[]
}

/** Load the client plugin with real React and recording stand-ins for the primitives. */
function loadAbout(): AboutHarness {
  const markdown: string[] = []
  let definition: { factory: (require: (id: string) => unknown) => { apply: (ctx: unknown) => void } } | undefined
  runInNewContext(source, {
    console,
    document: { documentElement: { lang: 'zh' }, getElementById: () => null, createElement: () => ({ remove: () => undefined }), head: { appendChild: () => undefined } },
    window: { __ModuleLoader__: { load: (value: typeof definition) => { definition = value } } }
  })
  const plugin = definition!.factory((id) => {
    if (id === 'react') return nodeRequire('react')
    if (id === '@deepseek-ai/dsh-client-ui-primitives') {
      return {
        BrandWordmark: () => null,
        FishLogo: () => null,
        MenuItemButton: () => null,
        Modal: () => null,
        MarkdownDelegateProvider: ({ children }: { children: ReactNode }) => children,
        MarkdownText: ({ text, variant }: { text: string; variant: string }) => {
          markdown.push(text)
          return createElement('div', { 'data-markdown': variant }, text)
        }
      }
    }
    throw new Error(`Unexpected client dependency: ${id}`)
  })
  let section: AboutHarness['section'] | undefined
  plugin.apply({
    locale: { register: vi.fn(), bind: () => (key: string) => key },
    slots: {
      inject: (_name: string, callback: () => unknown) => {
        const result = callback()
        if (result && typeof result === 'object' && Symbol.iterator in result) for (const _ of result as Iterable<unknown>) void _
        return result
      },
      register: (config: { id?: string }, component: AboutHarness['section']) => {
        if (config.id === 'about') section = component
        return () => undefined
      }
    },
    effect: (setup: () => unknown) => setup()
  })
  if (!section) throw new Error('About section was not registered')
  return { section, markdown }
}

// The real dictionary keys with their placeholders filled, so assertions read naturally.
const t = (key: string, values?: Record<string, string>): string =>
  values ? `${key}(${Object.values(values).join(',')})` : key

describe('About page release notes', () => {
  let root: Root | undefined
  let host: HTMLElement | undefined

  afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
  })

  async function render(props: Record<string, unknown>): Promise<HTMLElement> {
    const about = loadAbout()
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root!.render(createElement(about.section, {
        t,
        readInfo: async () => ({ desktopVersion: '0.0.5', harnessVersion: '0.2.1-rc.4', locale: 'zh' }),
        checkUpdates: async () => ({ phase: 'up-to-date', manual: true, currentVersion: '0.0.5' }),
        openExternal: vi.fn(async () => ({ ok: true })),
        assetUrl: (name: string) => `/assets/${name}`,
        ...props
      }))
    })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    Object.assign(host, { markdown: about.markdown })
    return host
  }

  const toggle = (node: HTMLElement, version: string): HTMLButtonElement => {
    const button = [...node.querySelectorAll<HTMLButtonElement>('.dshDesktopNotesToggle')]
      .find((entry) => entry.textContent?.includes(`updateLogTitle(${version})`))
    if (!button) throw new Error(`No notes card for ${version}`)
    return button
  }

  it('always shows the current version as a collapsed card with only its updates and fixes', async () => {
    const readReleaseNotes = vi.fn(async () => ({ version: '0.0.5', notes: NOTES, url: 'https://example.test/v0.0.5' }))
    const node = await render({ readReleaseNotes })
    const button = toggle(node, '0.0.5')

    // The update status lives in the button row, so no empty line separates
    // the buttons from the card and the page keeps one card spacing.
    expect(node.querySelector('.dshDesktopAboutActions [role="status"]')).not.toBeNull()
    expect(node.querySelector('.dshDesktopAbout > [role="status"]')).toBeNull()
    // Collapsed by default: one header row, no body.
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(node.querySelector('.dshDesktopNotesBody')).toBeNull()
    // The release theme is the subtitle; the tag says which version this is.
    expect(button.textContent).toContain('currentTag')
    expect(button.textContent).toContain('推理等级滑条与新机器体验修复')
    expect(readReleaseNotes).toHaveBeenCalledTimes(1)

    await act(async () => { button.click() })
    expect(button.getAttribute('aria-expanded')).toBe('true')
    const body = node.querySelector('.dshDesktopNotesBody')
    expect(body?.id).toBe(button.getAttribute('aria-controls'))
    const rendered = (node as HTMLElement & { markdown: string[] }).markdown.at(-1) ?? ''
    expect(body?.querySelector('[data-markdown="compact"]')).not.toBeNull()
    expect(rendered).toContain('## 更新内容')
    expect(rendered).toContain('## 问题修复')
    // Upgrade notes, limitations and diagnostic paths stay on GitHub.
    expect(rendered).not.toContain('升级说明')
    expect(rendered).not.toContain('## 说明')
    expect(rendered).not.toContain('harness.log')
    expect(rendered).not.toContain('未执行的验收')
    // The heading duplicating the card title is not repeated in the body.
    expect(rendered).not.toContain('# DSH Desktop')

    await act(async () => { button.click() })
    expect(node.querySelector('.dshDesktopNotesBody')).toBeNull()
    expect(readReleaseNotes).toHaveBeenCalledTimes(1)
  })

  it('reports a failed read only when opened and reads again on retry', async () => {
    const readReleaseNotes = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ version: '0.0.5', notes: '## 问题修复\n\n- 修好了', url: '' })
    const node = await render({ readReleaseNotes })
    expect(node.querySelector('[role="alert"]')).toBeNull()

    await act(async () => { toggle(node, '0.0.5').click() })
    const alert = node.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('notesFailed(offline)')
    const retry = [...alert!.querySelectorAll('button')].find((entry) => entry.textContent === 'notesRetry')
    await act(async () => { retry!.click() })
    await act(async () => { await Promise.resolve() })
    expect(readReleaseNotes).toHaveBeenCalledTimes(2)
    expect(node.querySelector('[role="alert"]')).toBeNull()
    expect(node.querySelector('[data-markdown]')?.textContent).toContain('修好了')
  })

  it('shows a version without a Release as having no notes', async () => {
    const node = await render({ readReleaseNotes: async () => ({ version: '0.0.5', url: '' }) })
    await act(async () => { toggle(node, '0.0.5').click() })
    expect(node.querySelector('.dshDesktopNotesBody')?.textContent).toBe('noReleaseNotes')
  })

  it('adds a collapsed card for a newer version found by the update check', async () => {
    const node = await render({
      readReleaseNotes: async () => ({ version: '0.0.5', notes: NOTES, url: '' }),
      checkUpdates: async () => ({ phase: 'available', manual: true, currentVersion: '0.0.5', availableVersion: '0.0.6', releaseNotes: '# DSH Desktop v0.0.6 — 下一版\n\n## 更新内容\n\n- 新东西\n\n## 说明\n\n- 内部', releaseUrl: 'https://example.test/v0.0.6' })
    })
    const check = [...node.querySelectorAll('button')].find((entry) => entry.textContent === 'checkUpdates')
    await act(async () => { check!.click() })
    await act(async () => { await Promise.resolve() })
    const next = toggle(node, '0.0.6')
    expect(next.getAttribute('aria-expanded')).toBe('false')
    expect(next.textContent).toContain('newTag')
    expect(next.textContent).toContain('下一版')
    await act(async () => { next.click() })
    const text = next.closest('.dshDesktopNotes')?.querySelector('[data-markdown]')?.textContent ?? ''
    expect(text).toContain('新东西')
    expect(text).not.toContain('内部')
    // The current version's card stays below it.
    expect(toggle(node, '0.0.5').getAttribute('aria-expanded')).toBe('false')
  })
})
