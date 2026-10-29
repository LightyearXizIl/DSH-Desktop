// This child receives asset bytes only. The Host wraps it with its configured
// OS sandbox; filesystem confinement remains effective during path-swap races.
import { materialize } from './storage.js'
import { assetKind } from './assets.js'
const kind = process.argv[2] === 'video' ? 'video' : 'image'
const { maxBytes } = assetKind(kind)
const chunks = []; let length = 0
for await (const chunk of process.stdin) {
  length += chunk.length
  if (length > Math.ceil(maxBytes * 4 / 3) + 4) throw new Error('Asset input too large')
  chunks.push(chunk)
}
const data = Buffer.from(Buffer.concat(chunks).toString('utf8'), 'base64')
if (!data.length || data.length > maxBytes) throw new Error('Invalid asset input')
process.stdout.write(JSON.stringify(await materialize(process.cwd(), data, undefined, kind)))
