import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { auditStartupEntries, StartupError } from '@deepseek-ai/dsh-app-boot'

const sidebarPath = new URL('../node_modules/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js', import.meta.url)
const conversationPath = new URL('../node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js', import.meta.url)

function loadSidebar() {
  let exports
  const document = {
    documentElement: { hasAttribute: () => false },
    querySelector: () => null,
    createElement: () => ({ dataset: {} }),
    head: { appendChild: () => {} }
  }
  const window = {
    setTimeout,
    clearTimeout,
    __ModuleLoader__: { load: ({ factory }) => {
      exports = factory(name => {
        if (name === 'react') return React
        if (name === 'react/jsx-runtime') return jsxRuntime
        if (name === '@deepseek-ai/dsh-client-store') return { createSnapshotStore: initial => ({ getSnapshot: () => initial, set: () => {} }) }
        if (name === '@deepseek-ai/dsh-client-ui-slots') return { resolveSlotLabel: value => value }
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return new Proxy({ isDarwinDesktop: () => false, Tooltip: ({ children }) => children }, { get: (target, key) => target[key] ?? (() => null) })
        throw new Error(`Unexpected module ${name}`)
      })
    } }
  }
  return readFile(sidebarPath, 'utf8').then(code => {
    vm.runInNewContext(code, { window, document })
    return exports
  })
}

describe('rc.2 workbench patch slots', () => {
  it('declares and renders the quick switcher between New Session and the native panel navigation with the native action', async () => {
    const sidebar = await loadSidebar()
    const registrations = []
    const startSession = vi.fn()
    const ctx = {
      get: () => ({ startSession }),
      effect: () => {},
      locale: { register: () => {}, subscribe: () => {} },
      slots: {
        entriesOfSlot: () => [], subscribe: () => {},
        inject: (_name, callback) => callback(),
        register: (options, Component) => registrations.push({ options, Component })
      },
      shortcuts: { catalog: {} },
      layout: { toggleSidebar: () => {}, selectPanel: () => {} }
    }
    sidebar.apply(ctx)
    const shell = registrations.find(item => item.options.name === 'sidebar')
    expect(shell.options.children['sidebar.quickSwitcher']).toEqual({ kind: 'single', scope: 'root' })
    const rendered = []
    const shortcutKeys = ['Ctrl', 'Alt', 'N']
    const markup = renderToStaticMarkup(React.createElement(shell.Component, {
      collapsed: false, width: 250, startSession, toggleSidebar: () => {}, selectPanel: () => {},
      setPinned: () => {}, trackEntryClick: () => {},
      usePanels: () => [{ id: 'plugins', label: '插件' }], useEntryPins: () => [], useEntryActions: () => false,
      useShortcuts: () => ({ id: 'session.new', keys: shortcutKeys, aria: 'Control+Alt+N' }),
      usePanelInfo: () => ({}), t: key => key,
      renderSlot: (name, owner) => {
        rendered.push({ name, owner })
        return name === 'sidebar.quickSwitcher' ? React.createElement('span', null, 'Workbench switcher') : null
      }
    }))
    expect(markup).toContain('Workbench switcher')
    // The keyboard action remains, but the sidebar does not render a visible shortcut badge.
    expect(markup).toContain('aria-keyshortcuts="Control+Alt+N"')
    expect(markup).not.toContain('hHd-Xa_newSessionShortcut')
    expect(markup.indexOf('Workbench switcher')).toBeGreaterThan(markup.indexOf('class="hHd-Xa_newSession"'))
    expect(markup.indexOf('Workbench switcher')).toBeLessThan(markup.indexOf('class="hHd-Xa_panelList"'))
    expect(rendered.find(item => item.name === 'sidebar.quickSwitcher')?.owner).toEqual({ wide: true, startSession })
    expect(rendered.findIndex(item => item.name === 'sidebar.quickSwitcher')).toBeGreaterThan(-1)
  })

  it('isolates a failed optional workbench without hiding a failed core entry', async () => {
    const makeEntry = (id, workbench) => ({
      disabled: false,
      options: { id, name: id, __dshPluginOwner: workbench ? { workbench: true } : undefined },
      lastImportError: new Error(`${id} import failed`),
      _failure: () => new Error(`${id} failed`)
    })
    const optional = makeEntry('third-party-workbench', true)
    const warnings = []
    await expect(auditStartupEntries({ loader: { entries: () => [optional] } }, 'test', line => warnings.push(line))).resolves.toBeUndefined()
    expect(warnings.join('')).toContain('third-party-workbench')
    const core = makeEntry('webserver', false)
    await expect(auditStartupEntries({ loader: { entries: () => [optional, core] } }, 'test', () => {})).rejects.toBeInstanceOf(StartupError)
  })

  it('keeps the native conversation as fallback for the workbench frame', async () => {
    const source = await readFile(conversationPath, 'utf8')
    expect(source).toContain('return renderSlot("desktop.workbench.frame", { conversation }, { fallback: conversation });')
    expect(source).toContain('"desktop.workbench.frame": { kind: "single", scope: "root" }')
  })

  it('publishes the conversation column width once a column transition settles', async () => {
    const source = await readFile(conversationPath, 'utf8')
    const start = source.indexOf('function ConversationWidthControls(')
    const body = source.slice(start, source.indexOf('const onStart', start))
    // Publishing on every frame of a sidebar toggle restyled the whole
    // transcript each frame (~13ms on a long session) and dropped frames.
    expect(body).toContain('const animating = container.closest("[data-animating]");')
    expect(body).toMatch(/if \(animating === null\) \{\s+publishWidths\(container\);\s+return;\s+\}/)
    expect(body).toContain('if (animating.hasAttribute("data-animating")) return;')
    expect(body).toContain('settle.observe(animating, { attributes: true, attributeFilter: ["data-animating"] });')
    expect(body).toContain('settle?.disconnect();')
  })

  it('renders Chat as a persistent heading below Workspaces', async () => {
    const workspacePath = new URL('../node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js', import.meta.url)
    const source = await readFile(workspacePath, 'utf8')
    expect(source).toContain('const label = row.workspaceId === void 0 ? t("group.chat") : row.label;')
    expect(source).toContain('"group.chat": "聊天"')
    expect(source).toContain('"group.chat": "Chat"')
    expect(source).toContain('"data-chat-group": isChat ? "true" : void 0')
    expect(source).toContain('"data-row-key": "chat-heading"')
    expect(source).toMatch(/role: "treeitem",\s+"aria-expanded": row\.expanded,/)
    expect(source).toContain('rowKeys.push(group.workspaceId === void 0 ? "chat-heading" : `workspace:${group.key}`);')
    expect(source).toContain('if (g.sessions.length === 0 && g.key !== "") continue;')
    expect(source).toContain('this.openChatSession(prepareDraft')
    expect(source).toContain('async startChatSession(prompt)')
    expect(source).toContain('this.view.markChatSession(sessionId)')
    expect(source).toContain('const chat = new Set(list.chatSessionIds ?? []);')
    expect(source).toContain('function ProjectRowItem({ group, containsCurrentDescendant = false, onToggle, onCreate, chatSearch, actions, drag, home, newShortcut, t })')
    // The chat search is the chat group's own: it no longer opens the
    // workspace section search, which spans every workspace.
    expect(source).toMatch(/\bchatSearch,\s+onToggle: \(\) => \{/)
    expect(source).not.toContain('onSearch: requestSearch,')
    expect(source).toContain('onCreate();')
    expect(source).toContain('onClick: onToggle,')
    expect(source).toMatch(/setGroupExpanded\(group\.key, true\);\s+startSession\(void 0, \{ chat: true \}\);/)
    expect(source).toContain('"actions.chatSearch": "搜索聊天会话"')
    expect(source).toContain('"chat.search.placeholder": "搜索聊天名称"')
    expect(source).toContain('"chat.search.placeholder": "Search chat names"')
    expect(source).toContain('"actions.chatCollapse": "收起聊天列表"')
    expect(source).toContain('"actions.chatExpand": "展开聊天列表"')
    // Aligned with the workspace header's actions despite the tree's gutter.
    expect(source).toContain('.bhn1Oq_root:not(.bhn1Oq_rail) .bhn1Oq_sectionHeader.YDXeBa_chatHeader{margin-right:5px}')
    expect(source).toContain('.YDXeBa_chatFoldIconClosed{transform:rotate(-90deg)}')
    expect(source).toContain('groupExpansion: { "": true }')
    expect(source).toContain('key === "" ? groupExpansion[key] !== false : groupExpansion[key] ?? ancestorKeys.has(key)')
  })
})
