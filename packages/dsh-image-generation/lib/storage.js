import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { open, link, unlink } from 'node:fs/promises'
import path from 'node:path'
import { assetDirectory, assetKind } from './assets.js'
import { ImageError } from './provider.js'

export async function materialize(root, data, signal, kind = 'image') {
  signal?.throwIfAborted()
  const { folder, extension } = assetKind(kind)
  const directory = await assetDirectory(root, true, kind)
  const sha256 = createHash('sha256').update(data).digest('hex')
  const filename = `${sha256}.${extension}`
  const target = path.join(directory, filename)
  const temporary = path.join(directory, `.${randomUUID()}.tmp`)
  const handle = await open(temporary, 'wx', 0o600)
  try {
    await handle.writeFile(data, { signal }); await handle.sync(); await handle.close()
    await assetDirectory(root, false, kind)
    signal?.throwIfAborted()
    try { await link(temporary, target) } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const existing = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW)
      try {
        const info = await existing.stat()
        if (!info.isFile() || info.size !== data.length || createHash('sha256').update(await existing.readFile()).digest('hex') !== sha256) throw new ImageError('ASSET_PATH', 'The generated asset path contains different content.')
      } finally { await existing.close() }
    }
  } finally { await handle.close().catch(() => {}); await unlink(temporary).catch(() => {}) }
  return { workspace_path: `.workbuddy/${folder}/${filename}`, sha256 }
}
