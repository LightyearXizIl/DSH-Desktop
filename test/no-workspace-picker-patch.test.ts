import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const workspacePath = path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js')
const conversationPath = path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js')
const settingsPath = path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js')

interface MenuItem { id: string; label: string }
interface Element { type: unknown; props: Record<string, unknown> }
interface FlowProps {
  noWorkspace?: boolean
  workspaces: Array<{ workspaceId: string; title: string }>
  onPick?: (id: string) => void
}

/** Evaluate the bundled WorkspacePickFlow with a hook-less React stand-in and return its menu. */
async function renderFlow({ noWorkspace = false, workspaces, onPick = () => {} }: FlowProps): Promise<Element> {
  const source = await readFile(workspacePath, 'utf8')
  const start = source.indexOf('const ADD_WORKSPACE = "::add-workspace";')
  const end = source.indexOf('* The conversation empty-state registration', start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  const body = source.slice(start, source.lastIndexOf('/**', end))
  const jsx = (type: unknown, props: Record<string, unknown>): Element => ({ type, props })
  const Menu = function Menu() {}
  const context = {
    react: { useState: (value: unknown) => [value, () => {}], useCallback: (fn: unknown) => fn, useEffect: () => {} },
    react_jsx_runtime: { jsx, jsxs: jsx, Fragment: 'Fragment' },
    _deepseek_ai_dsh_client_ui_primitives: new Proxy({ Menu }, { get: (target, key) => (key in target ? target[key as 'Menu'] : function Icon() {}) }),
    WorkspacePicker_module_css_default: {},
    workspaceDisplayTitle: (title: string) => title,
  }
  const flow = vm.runInNewContext(`(() => { ${body}; return WorkspacePickFlow })()`, context) as (props: Record<string, unknown>) => Element
  const tree = flow({
    t: (key: string) => key,
    open: true,
    anchorRef: { current: null },
    useWorkspaces: (select: (state: unknown) => unknown) => select({ items: workspaces, phase: 'ready' }),
    createWorkspace: async () => ({ workspaceId: 'created' }),
    useDirectoryFlow: (select: (occupied: boolean) => unknown) => select(true),
    renderDirectoryFlow: () => null,
    onPick,
    onClose: () => {},
    noWorkspace,
  })
  const children = tree.props.children as Element[]
  const menu = children.find((child) => child?.type === Menu)
  if (menu === undefined) throw new Error('the pick flow rendered no menu')
  return menu
}

const ids = (menu: Element): string[] => (menu.props.items as MenuItem[]).map((item) => item.id)

describe('"No workspace" in the hero workspace picker', () => {
  it('lists "No workspace" first, above the workspaces, only where the hero asks for it', async () => {
    const workspaces = [{ workspaceId: 'w1', title: 'skills' }]
    expect(ids(await renderFlow({ workspaces }))).toEqual(['w1'])
    const menu = await renderFlow({ noWorkspace: true, workspaces })
    expect(ids(menu)).toEqual(['::no-workspace', 'w1'])
    expect((menu.props.footer as MenuItem[]).map((item) => item.id)).toEqual(['::add-workspace'])
    expect((menu.props.items as MenuItem[])[0]?.label).toBe('menu.noWorkspace')
  })

  it('keeps the menu open with no workspaces instead of jumping straight to the folder picker', async () => {
    const menu = await renderFlow({ noWorkspace: true, workspaces: [] })
    expect(ids(menu)).toEqual(['::no-workspace', '::add-workspace'])
    expect(menu.props.open).toBe(true)
  })

  it('hands the pick to the owner', async () => {
    const onPick = vi.fn()
    const menu = await renderFlow({ noWorkspace: true, workspaces: [{ workspaceId: 'w1', title: 'skills' }], onPick })
    ;(menu.props.onSelect as (id: string) => void)('::no-workspace')
    expect(onPick).toHaveBeenCalledWith('::no-workspace')
  })

  it('opens a Chat Session for the pick and names a Chat Session\'s chip', async () => {
    const [conversation, workspace, conversationPatch, workspacePatch] = await Promise.all([
      readFile(conversationPath, 'utf8'),
      readFile(workspacePath, 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-ui-conversation'), 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-ui-workspace'), 'utf8'),
    ])
    // Both packages must agree on the entry id.
    expect(workspace).toContain('const NO_WORKSPACE = "::no-workspace";')
    expect(conversation).toContain('const NO_WORKSPACE_PICK = "::no-workspace";')
    expect(workspace).toContain('noWorkspace: true')
    // The pick reuses the draft hand-off of a workspace switch and opens a Chat Session.
    expect(conversation).toContain('openChatSession: () => workspaceNavigation.openChatSession(carryDraftFrom(sessionId), {})')
    expect(conversation).toContain('selectWorkspace: (workspaceId) => workspaceNavigation.openWorkspace(workspaceId, carryDraftFrom(sessionId))')
    expect(conversation).toContain('if (!chatSession) openChatSession?.().catch(() => {});')
    expect(conversation).toContain('const chipTitle = chatSession ? t("hero.noWorkspace")')
    for (const [text, key, zh, en] of [
      [workspace, 'menu.noWorkspace', '不在工作区', 'No workspace'],
      [conversation, 'hero.noWorkspace', '不在工作区', 'No workspace'],
    ] as const) {
      expect(text).toContain(`"${key}": "${zh}"`)
      expect(text).toContain(`"${key}": "${en}"`)
    }
    expect(workspacePatch).toContain('+\t\tconst NO_WORKSPACE = "::no-workspace";')
    expect(conversationPatch).toContain('+\t\tconst NO_WORKSPACE_PICK = "::no-workspace";')
  })
})

describe('Settings navigation icons', () => {
  it('gives About its own glyph instead of the fallback gear', async () => {
    const [settings, patch] = await Promise.all([
      readFile(settingsPath, 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-ui-settings-general'), 'utf8'),
    ])
    expect(settings).toContain('if (id === "about") return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInfoOutlineMedium')
    expect(patch).toContain('+\t\t\tif (id === "about") return')
  })
})
