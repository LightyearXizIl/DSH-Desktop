import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(projectRoot, 'build', 'icon.png')
const lightSource = path.join(projectRoot, 'build', 'logo-light.png')
const darkSource = path.join(projectRoot, 'build', 'logo-dark.png')
const destinationDirectory = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist'
)
const destination = path.join(destinationDirectory, 'dsh-desktop-logo.png')
const lightDestination = path.join(destinationDirectory, 'dsh-desktop-logo-light.png')
const darkDestination = path.join(destinationDirectory, 'dsh-desktop-logo-dark.png')
const indexPath = path.join(destinationDirectory, 'index.html')
const manifestPath = path.join(destinationDirectory, 'manifest.webmanifest')

/**
 * Swap the Harness favicon link for the desktop's own.
 *
 * The href is matched rather than pinned: 0.1.2-alpha.1 moved it from
 * `/favicon.svg` to `./favicon.svg`. Harness 0.1.7-rc.1 declares separate
 * light and dark favicon links; Desktop uses the same PNG for both themes.
 * @param contents - index.html source.
 * @param file - path shown in the failure message.
 * @returns index.html with the desktop icon link.
 */
export function replaceIconLink(contents, file) {
  const desktop = '<link rel="icon" type="image/png" href="/dsh-desktop-logo.png" />'
  if (contents.includes(desktop)) return contents
  const matches = contents.match(/<link rel="icon"[^>]*>/gu) ?? []
  const themedLinks = matches.length === 2
    && matches.some((link) => link.includes('media="(prefers-color-scheme: dark)"'))
    && matches.some((link) => link.includes('media="(prefers-color-scheme: light)"'))
  if (matches.length !== 1 && !themedLinks) {
    throw new Error(
      `Could not update DSH Desktop branding in ${file}: expected one icon link or a light/dark pair, found ${String(matches.length)}`
    )
  }
  return themedLinks
    ? contents.replace(matches[0], desktop).replace(matches[1], '')
    : contents.replace(matches[0], desktop)
}

/**
 * Point the web manifest's icon at the desktop logo.
 *
 * Edited as JSON rather than as text: upstream added `"purpose": "any"` to the
 * entry in 0.1.2-alpha.1, which a pinned multi-line string could not survive,
 * and key order is not a contract. The entry still has to exist.
 *
 * Harness 0.2.2 replaced the single `favicon.svg` entry with a PNG set
 * (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`). Those are the
 * upstream marks at fixed sizes, so the set collapses into the one desktop
 * logo; entries Desktop does not recognise are kept.
 * @param contents - manifest source.
 * @param file - path shown in the failure message.
 * @returns manifest JSON with the desktop icon.
 */
export function replaceManifestIcon(contents, file) {
  const manifest = JSON.parse(contents)
  const icons = Array.isArray(manifest.icons) ? manifest.icons : []
  const target = icons.find((icon) => icon?.src === '/dsh-desktop-logo.png')
    ?? icons.find((icon) => typeof icon?.src === 'string' && icon.src.endsWith('favicon.svg'))
  const upstreamPngSet = icons.filter((icon) =>
    typeof icon?.src === 'string' && /^(?:\.?\/)?icon-(?:maskable-)?\d+\.png$/u.test(icon.src))
  if (target === undefined && upstreamPngSet.length > 0) {
    manifest.icons = [
      { src: '/dsh-desktop-logo.png', sizes: '1254x1254', type: 'image/png', purpose: 'any' },
      ...icons.filter((icon) => !upstreamPngSet.includes(icon))
    ]
    return `${JSON.stringify(manifest, null, 2)}\n`
  }
  if (target === undefined) {
    throw new Error(`Could not update DSH Desktop branding in ${file}: no icon entry to replace`)
  }
  target.src = '/dsh-desktop-logo.png'
  target.sizes = '1254x1254'
  target.type = 'image/png'
  return `${JSON.stringify(manifest, null, 2)}\n`
}

async function installBrandAssets() {
  await mkdir(destinationDirectory, { recursive: true })
  await copyFile(source, destination)
  await copyFile(lightSource, lightDestination)
  await copyFile(darkSource, darkDestination)

  const index = await readFile(indexPath, 'utf8')
  await writeFile(indexPath, replaceIconLink(index, path.relative(projectRoot, indexPath)))

  const manifest = await readFile(manifestPath, 'utf8')
  await writeFile(
    manifestPath,
    replaceManifestIcon(manifest, path.relative(projectRoot, manifestPath))
  )

  console.log(`Installed DSH Desktop brand assets: ${[
    destination,
    lightDestination,
    darkDestination
  ].map((file) => path.relative(projectRoot, file)).join(', ')}`)
}

// Run only as a script: the test imports the pure replacers above.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await installBrandAssets()
}
