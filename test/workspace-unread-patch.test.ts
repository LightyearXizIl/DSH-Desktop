import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const workspacePath = path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js')
const desktopPath = path.join(projectRoot, 'packages/dsh-desktop-client-ui/client.js')

describe('workspace session unread markers', () => {
  it('uses the existing persisted view key and upgrades older snapshots on write', async () => {
    const source = await readFile(workspacePath, 'utf8')
    const start = source.indexOf('function createWorkspaceViewStore() {')
    const end = source.indexOf('\n\t\t//#endregion', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const spec = vm.runInNewContext(`(() => { ${source.slice(start, end)}; return createWorkspaceViewStore() })()`, {
      _deepseek_ai_dsh_client_store: { defineStore: (value: unknown) => value }
    }) as {
      init: () => { unreadSessionIds: string[] }
      persist: string
      actions: {
        markSessionUnread: (draft: { unreadSessionIds?: string[] }, id: string) => void
        markSessionRead: (draft: { unreadSessionIds?: string[] }, id: string) => void
      }
    }
    expect(spec.persist).toBe('dsh.workspace.view.v5')
    expect(spec.init().unreadSessionIds).toEqual([])
    const olderSnapshot: { unreadSessionIds?: string[] } = {}
    spec.actions.markSessionUnread(olderSnapshot, 'session-1')
    spec.actions.markSessionUnread(olderSnapshot, 'session-1')
    expect(olderSnapshot.unreadSessionIds).toEqual(['session-1'])
    spec.actions.markSessionRead(olderSnapshot, 'session-1')
    expect(olderSnapshot.unreadSessionIds).toEqual([])
  })

  it('offers the unread action in the session context menu of both list modes', async () => {
    const [workspace, desktop, patch] = await Promise.all([
      readFile(workspacePath, 'utf8'),
      readFile(desktopPath, 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-ui-workspace'), 'utf8')
    ])
    // Harness 0.2.2 opens one shared context menu for a session row (right-click
    // and the "..." trigger) and renders the legacy menu contributions inside it
    // from the captured target alone. The row no longer hands them its unread
    // state, so the patched SessionMenu reads it from the browser store.
    const start = workspace.indexOf('function SessionMenu(')
    const end = workspace.indexOf('//#endregion', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    type MenuProps = { sessionId: string; displayTitle: string; unread: boolean; onUnreadChange: (id: string, unread: boolean) => void }
    const SessionMenu = vm.runInNewContext(`(() => { ${workspace.slice(start, end)}; return SessionMenu })()`, {
      react: { useMemo: (compute: () => unknown) => compute() }
    }) as (props: Record<string, unknown>) => unknown
    const marked: string[] = []
    const read: string[] = []
    const render = (kind: string, unreadSessionIds: string[] | undefined) => {
      let captured: { name: string; props: MenuProps } | undefined
      const output = SessionMenu({
        target: { kind, value: { sessionId: 'session-1', displayTitle: 'One' } },
        dismiss: () => {},
        renderSlot: (name: string, props: MenuProps) => {
          captured = { name, props }
          return 'entries'
        },
        useStore: (select: (state: { unreadSessionIds?: string[] }) => unknown) => select({ unreadSessionIds }),
        actions: {
          markSessionUnread: (id: string) => marked.push(id),
          markSessionRead: (id: string) => read.push(id)
        }
      })
      return { output, captured }
    }

    const unread = render('session', ['session-1'])
    expect(unread.output).toBe('entries')
    expect(unread.captured?.name).toBe('sidebar.workspaces.session.menu.item')
    expect(unread.captured?.props).toMatchObject({ sessionId: 'session-1', displayTitle: 'One', unread: true })
    unread.captured?.props.onUnreadChange('session-1', false)
    expect(read).toEqual(['session-1'])

    const seen = render('session', ['other'])
    expect(seen.captured?.props.unread).toBe(false)
    seen.captured?.props.onUnreadChange('session-1', true)
    expect(marked).toEqual(['session-1'])

    // A view snapshot persisted before the marker existed has no list yet.
    expect(render('session', undefined).captured?.props.unread).toBe(false)
    // The same content slot also serves workspace targets; those get no session entries.
    expect(render('workspace', ['session-1'])).toEqual({ output: null, captured: undefined })

    // The menu content is registered with the browser store that holds the markers.
    expect(workspace).toMatch(/name: "contextMenu\.content",\s+key: "session",\s+store: viewStore,/)
    // Tree and flat rows both still mark an unread title.
    expect(workspace.match(/unread: unreadSessionIds\.includes\(node\.id\)/g)).toHaveLength(2)
    expect(desktop).toContain("id: 'desktop-unread-session'")
    expect(desktop).toContain("'标为未读'")
    expect(desktop).toContain("'标为已读'")
    expect(patch).toContain('markSessionUnread')
  })

  it('renders an unread indicator and clears the marker when opening a session', async () => {
    const source = await readFile(workspacePath, 'utf8')
    expect(source).toContain('StateDot, { state: "done" }')
    expect(source).toContain('style: unread ? { fontWeight: 600 } : void 0')
    expect(source).toContain('children: t("status.unread")')
    expect(source).toContain('this.view.markSessionRead(target)')
    expect(source).toContain('this.view.markSessionRead(sessionId)')
  })
})
