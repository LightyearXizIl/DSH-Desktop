// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { WINDOWS_TITLEBAR_HEIGHT } from '../src/shared/desktop-menu'
import { markWindowsTitlebar } from '../src/preload/windows-titlebar'

const client = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js', 'utf8')
const ast = ts.createSourceFile('client.js', client, ts.ScriptTarget.Latest, true)

function functionSource(name: string): string {
  let source: string | undefined
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) source = node.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (!source) throw new Error(`Harness layout function ${name} is unavailable`)
  return source
}

function variableSource(name: string): string | undefined {
  let source: string | undefined
  const visit = (node: ts.Node): void => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration =>
      ts.isIdentifier(declaration.name) && declaration.name.text === name
    )) source = node.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return source
}

const collapsedWidthSource = variableSource('collapsedWidth')
// Harness 0.2.2 reads the Windows marker once and keeps the narrow-viewport
// drawer off for it; the collapsed width is derived from both.
const windowsTitlebarSource = variableSource('windowsTitlebar')
const drawerSource = variableSource('drawer')

it('uses the upstream zero-width column after the Windows preload marks the page', () => {
  const doc = document.implementation.createHTMLDocument()
  markWindowsTitlebar(doc)
  expect(doc.documentElement.hasAttribute('data-windows-titlebar')).toBe(true)
  expect(doc.documentElement.style.getPropertyValue('--dsh-windows-titlebar-height')).toBe(`${WINDOWS_TITLEBAR_HEIGHT}px`)
  if (!collapsedWidthSource || !windowsTitlebarSource || !drawerSource) {
    throw new Error('Harness collapsed sidebar width is unavailable')
  }

  const createColumns = new Function('document', 'viewport', `
    ${functionSource('clampWidth')}
    ${functionSource('computeColumns')}
    ${windowsTitlebarSource}
    ${drawerSource}
    const darwin = document.documentElement.dataset.platform === 'darwin'
    ${collapsedWidthSource}
    return { drawer, columns: computeColumns(viewport, 0, 0, collapsedWidth) }
  `) as (doc: Document, viewport: number) => { drawer: boolean; columns: { sidebar: number; center: number } }

  expect(createColumns(doc, 1200)).toMatchObject({ drawer: false, columns: { sidebar: 0, center: 1200 } })
  // Below upstream's 768px drawer breakpoint the Windows window keeps its columns:
  // the caption menubar and rail button sit where the collapsed column was.
  expect(createColumns(doc, 700)).toMatchObject({ drawer: false, columns: { sidebar: 0 } })
  const webDoc = document.implementation.createHTMLDocument()
  expect(createColumns(webDoc, 1200)).toMatchObject({ drawer: false, columns: { sidebar: 56, center: 1144 } })
  expect(createColumns(webDoc, 700)).toMatchObject({ drawer: true, columns: { sidebar: 0 } })
})
