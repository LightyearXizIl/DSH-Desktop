/**
 * Release notes as DSH Desktop shows them in the app (the update window and
 * Settings → About). Pure and dependency-free: the main process filters with
 * it before notes reach a renderer, and the preload lays them out with it.
 */

/**
 * Section headings the app shows. Upgrade notes, known limitations,
 * verification details and diagnostic paths belong to the GitHub Release page.
 * `packages/dsh-desktop-client-ui/client.js` keeps the same list for the About
 * page, which runs outside this bundle.
 */
const DISPLAY_SECTIONS = /^(?:更新内容|新增功能|新功能|问题修复|修复|what['’]?s new|new features?|fixes|bug fixes)$/i

const SECTION_HEADING = /^##[ \t]+(.+?)[ \t]*$/
const TITLE_HEADING = /^#[ \t]+(.+?)[ \t]*$/

function headingText(raw: string): string {
  return raw.replace(/[*_`#]/g, '').trim()
}

/**
 * Keep only what the app shows of a release: its title line plus the
 * "what's new" and "fixes" sections. Notes written without `##` sections have
 * nothing to tell apart and pass through whole.
 * @returns the filtered notes, or undefined when nothing displayable is left.
 */
export function releaseNotesForDisplay(notes: string | undefined): string | undefined {
  if (notes === undefined) return undefined
  const lines = notes.replace(/\r\n?/g, '\n').split('\n')
  if (!lines.some((line) => SECTION_HEADING.test(line))) return notes.trim() || undefined
  const kept: string[] = []
  let keep = false
  let sectioned = false
  for (const line of lines) {
    const section = SECTION_HEADING.exec(line)
    if (section) {
      sectioned = true
      keep = DISPLAY_SECTIONS.test(headingText(section[1] ?? ''))
    } else if (!sectioned && TITLE_HEADING.test(line)) {
      // The title line comes before any section; it names the release's theme.
      kept.push(line, '')
      continue
    }
    if (keep) kept.push(line)
  }
  return kept.join('\n').trim() || undefined
}

/**
 * Split the leading "# DSH Desktop v0.0.5 — Theme" line off release notes.
 * @returns the theme (the part after the dash, or the whole title) and the rest.
 */
export function splitReleaseHeading(notes: string | undefined): { theme: string; body: string } {
  const text = (notes ?? '').replace(/\r\n?/g, '\n').trim()
  const match = /^#[ \t]+([^\n]+)\n?/.exec(text)
  if (!match) return { theme: '', body: text }
  const heading = (match[1] ?? '').trim()
  const dash = heading.search(/\s[—–-]\s/)
  return {
    theme: dash >= 0 ? heading.slice(dash + 3).trim() : heading,
    body: text.slice(match[0].length).trim()
  }
}

export interface ReleaseInline {
  kind: 'text' | 'strong' | 'code'
  text: string
}

export interface ReleaseListItem {
  content: ReleaseInline[]
  children: ReleaseListItem[]
}

export type ReleaseBlock =
  | { kind: 'heading'; level: 2 | 3; content: ReleaseInline[] }
  | { kind: 'paragraph'; content: ReleaseInline[] }
  | { kind: 'list'; items: ReleaseListItem[] }

const INLINE_TOKEN = /(\*\*[^*\n]+?\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]*\))/g

/** Bold, inline code and link text; anything else stays literal text. */
export function parseReleaseInline(text: string): ReleaseInline[] {
  const out: ReleaseInline[] = []
  let last = 0
  for (const match of text.matchAll(INLINE_TOKEN)) {
    const token = match[0]
    const at = match.index ?? 0
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
    if (token.startsWith('**')) out.push({ kind: 'strong', text: token.slice(2, -2) })
    else if (token.startsWith('`')) out.push({ kind: 'code', text: token.slice(1, -1) })
    // Links render as their text: the app opens release pages, not arbitrary URLs.
    else out.push({ kind: 'text', text: token.slice(1, token.indexOf('](')) })
    last = at + token.length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}

const LIST_ITEM = /^([ \t]*)(?:[-*+]|\d+[.)])[ \t]+(.*)$/
const ANY_HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/

function indentOf(raw: string): number {
  return raw.replace(/\t/g, '  ').length
}

/**
 * Parse the Markdown subset release notes use — headings, nested lists,
 * paragraphs, bold, inline code — into plain blocks a renderer turns into
 * elements with text content only. Raw HTML is never interpreted.
 */
export function parseReleaseNotes(markdown: string): ReleaseBlock[] {
  const blocks: ReleaseBlock[] = []
  let paragraph: string[] = []
  let list: { items: ReleaseListItem[]; stack: Array<{ indent: number; items: ReleaseListItem[] }> } | undefined
  let lastItem: ReleaseListItem | undefined
  let lastItemText = ''

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return
    blocks.push({ kind: 'paragraph', content: parseReleaseInline(paragraph.join(' ')) })
    paragraph = []
  }
  const flushItem = (): void => {
    if (lastItem !== undefined) lastItem.content = parseReleaseInline(lastItemText)
  }
  const flushList = (): void => {
    flushItem()
    if (list !== undefined) blocks.push({ kind: 'list', items: list.items })
    list = undefined
    lastItem = undefined
    lastItemText = ''
  }

  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.trim() === '') {
      flushParagraph()
      continue
    }
    const heading = ANY_HEADING.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({
        kind: 'heading',
        level: (heading[1] ?? '').length <= 2 ? 2 : 3,
        content: parseReleaseInline(heading[2] ?? '')
      })
      continue
    }
    const item = LIST_ITEM.exec(line)
    if (item) {
      flushParagraph()
      flushItem()
      const indent = indentOf(item[1] ?? '')
      if (list === undefined) {
        const items: ReleaseListItem[] = []
        list = { items, stack: [{ indent, items }] }
      }
      const { stack } = list
      while (stack.length > 1 && indent < (stack[stack.length - 1]?.indent ?? 0)) stack.pop()
      const top = stack[stack.length - 1]
      if (top === undefined) continue
      if (indent > top.indent && lastItem !== undefined) stack.push({ indent, items: lastItem.children })
      const entry: ReleaseListItem = { content: [], children: [] }
      stack[stack.length - 1]?.items.push(entry)
      lastItem = entry
      lastItemText = item[2] ?? ''
      continue
    }
    if (lastItem !== undefined && /^[ \t]+/.test(line)) {
      // An indented line continues the item above it.
      lastItemText = `${lastItemText} ${line.trim()}`
      continue
    }
    flushList()
    paragraph.push(line.trim())
  }
  flushParagraph()
  flushList()
  return blocks
}

/** Plain text of inline content, for one-line summaries. */
function plainText(content: ReleaseInline[]): string {
  return content.map((entry) => entry.text).join('').trim()
}

/**
 * One line for the compact update notification: the release's theme when the
 * notes have a title, otherwise the first item or sentence, without Markdown.
 */
export function releaseNotesSummary(notes: string | undefined): string {
  const { theme, body } = splitReleaseHeading(notes)
  if (theme) return theme
  for (const block of parseReleaseNotes(body)) {
    if (block.kind === 'paragraph') return plainText(block.content)
    if (block.kind === 'list' && block.items[0]) return plainText(block.items[0].content)
  }
  return ''
}
