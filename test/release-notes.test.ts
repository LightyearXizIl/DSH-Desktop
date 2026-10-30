import { describe, expect, it } from 'vitest'
import {
  parseReleaseInline,
  parseReleaseNotes,
  releaseNotesForDisplay,
  releaseNotesSummary,
  splitReleaseHeading
} from '../src/shared/release-notes'

const FULL = [
  '# DSH Desktop v0.0.5 — 推理等级滑条与新机器体验修复',
  '',
  '## 更新内容',
  '',
  '- **推理等级滑条**：模型菜单里的滑条，有两种风格：',
  '  - **Codex**（默认）：胶囊轨道。',
  '  - **Claude Code**：像素点阵。',
  '- **动效开关**：跟随系统或始终播放。',
  '',
  '## 问题修复',
  '',
  '- **导入失败**：报 `ENOENT ... pnpm-workspace.yaml`。',
  '',
  '## 升级说明',
  '',
  '- 0.0.3 用户需要手动安装。',
  '',
  '## 说明',
  '',
  '- 请提供 `%APPDATA%\\dsh-desktop\\harness.log` 中的行。',
  '- 未执行的验收：全新机器安装。'
].join('\r\n')

describe('release notes shown in the app', () => {
  it('keeps the title line and only the updates and fixes sections', () => {
    const shown = releaseNotesForDisplay(FULL) ?? ''
    expect(shown.startsWith('# DSH Desktop v0.0.5 — 推理等级滑条与新机器体验修复\n\n## 更新内容')).toBe(true)
    expect(shown).toContain('## 问题修复')
    expect(shown).toContain('pnpm-workspace.yaml')
    // Upgrade notes, limitations and diagnostic paths stay on the GitHub Release.
    expect(shown).not.toContain('升级说明')
    expect(shown).not.toContain('## 说明')
    expect(shown).not.toContain('harness.log')
    expect(shown).not.toContain('未执行的验收')
    // Filtering twice changes nothing, so a renderer may filter again safely.
    expect(releaseNotesForDisplay(shown)).toBe(shown)
  })

  it('passes notes without sections through, and drops notes with nothing to show', () => {
    expect(releaseNotesForDisplay('修复了一些问题。')).toBe('修复了一些问题。')
    expect(releaseNotesForDisplay(undefined)).toBeUndefined()
    expect(releaseNotesForDisplay('   ')).toBeUndefined()
    expect(releaseNotesForDisplay('## 说明\n\n- 内部记录')).toBeUndefined()
    // English section names are recognised too.
    expect(releaseNotesForDisplay("## What's new\n- a\n## Notes\n- b")).toBe("## What's new\n- a")
  })

  it('splits the theme off the title line', () => {
    expect(splitReleaseHeading(FULL)).toMatchObject({ theme: '推理等级滑条与新机器体验修复' })
    expect(splitReleaseHeading(FULL).body.startsWith('## 更新内容')).toBe(true)
    expect(splitReleaseHeading('# Big release\n\n- a')).toEqual({ theme: 'Big release', body: '- a' })
    expect(splitReleaseHeading('- a')).toEqual({ theme: '', body: '- a' })
  })

  it('parses headings, nested lists, bold and code into plain blocks', () => {
    const blocks = parseReleaseNotes(splitReleaseHeading(releaseNotesForDisplay(FULL)).body)
    expect(blocks.map((block) => block.kind)).toEqual(['heading', 'list', 'heading', 'list'])
    const [updates, list] = blocks
    expect(updates).toEqual({ kind: 'heading', level: 2, content: [{ kind: 'text', text: '更新内容' }] })
    if (list?.kind !== 'list') throw new Error('expected a list')
    expect(list.items).toHaveLength(2)
    expect(list.items[0]?.content).toEqual([
      { kind: 'strong', text: '推理等级滑条' },
      { kind: 'text', text: '：模型菜单里的滑条，有两种风格：' }
    ])
    expect(list.items[0]?.children.map((child) => child.content[0])).toEqual([
      { kind: 'strong', text: 'Codex' },
      { kind: 'strong', text: 'Claude Code' }
    ])
    const fixes = blocks[3]
    if (fixes?.kind !== 'list') throw new Error('expected a list')
    expect(fixes.items[0]?.content).toContainEqual({ kind: 'code', text: 'ENOENT ... pnpm-workspace.yaml' })
  })

  it('joins continuation lines, keeps paragraphs, and never turns markup into HTML', () => {
    const blocks = parseReleaseNotes('- first line\n  continues here\n\nA paragraph\nthat wraps.\n\n### Detail\n<img src=x onerror=alert(1)>')
    expect(blocks).toEqual([
      { kind: 'list', items: [{ content: [{ kind: 'text', text: 'first line continues here' }], children: [] }] },
      { kind: 'paragraph', content: [{ kind: 'text', text: 'A paragraph that wraps.' }] },
      { kind: 'heading', level: 3, content: [{ kind: 'text', text: 'Detail' }] },
      { kind: 'paragraph', content: [{ kind: 'text', text: '<img src=x onerror=alert(1)>' }] }
    ])
    // Links show their text only.
    expect(parseReleaseInline('see [the page](https://example.test)')).toEqual([
      { kind: 'text', text: 'see ' },
      { kind: 'text', text: 'the page' }
    ])
  })

  it('summarises notes in one plain line for the update notification', () => {
    expect(releaseNotesSummary(FULL)).toBe('推理等级滑条与新机器体验修复')
    expect(releaseNotesSummary('## 更新内容\n\n- **滑条**：更顺')).toBe('滑条：更顺')
    expect(releaseNotesSummary('修复了一些问题。')).toBe('修复了一些问题。')
    expect(releaseNotesSummary(undefined)).toBe('')
  })
})
