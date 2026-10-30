import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'

const project = path.resolve(import.meta.dirname, '..')
const packageRoot = path.join(project, 'packages', 'dsh-desktop-theme')
const output = path.join(packageRoot, 'lib')
const entry = path.join(packageRoot, 'src', 'client', 'index.ts')
const outputFile = path.join(output, 'client.js')

const externals = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-locale/client',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-settings/client',
  '@deepseek-ai/dsh-client-ui-settings-plugins/client',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-theme/client',
]

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })

await build({
  entryPoints: [entry],
  outfile: outputFile,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome130',
  charset: 'utf8',
  external: externals,
  banner: {
    js: "window.__ModuleLoader__.load({ id: 'dsh-desktop-theme', factory: (require) => { const module = { exports: {} }; const exports = module.exports; Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });",
  },
  footer: {
    js: "Object.assign(exports, __themeExports); return module.exports; } })",
  },
  globalName: '__themeExports',
})

const source = await readFile(outputFile, 'utf8')
const moduleHeader = source.slice(0, 400)
if (!moduleHeader.includes('window.__ModuleLoader__.load(') || !moduleHeader.includes("id: 'dsh-desktop-theme'")) {
  throw new Error('desktop theme bundle is missing its ModuleLoader registration')
}
if (/\brequire\(["']\.\//u.test(source)) {
  throw new Error('desktop theme bundle must not require package-local files at runtime')
}
for (const dependency of [
  'react',
  'react-dom',
  '@deepseek-ai/dsh-client-ui-primitives',
]) {
  if (!source.includes(`__require("${dependency}")`)) {
    throw new Error(`desktop theme bundle must retain ${dependency} as a runtime dependency`)
  }
}
await writeFile(outputFile, `${source.trimEnd()}\n`)
