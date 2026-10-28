import { readFile } from 'node:fs/promises'

export const name = 'dsh-desktop-client-ui'
export const inject = ['connection']

/**
 * Fixed packaged assets for the About page. The route serves only these
 * names, so the renderer never gets a filesystem path or a generic file
 * reader.
 */
const ASSETS = new Map([
  ['author-avatar.png', 'image/png'],
  ['qrcode-wechat.png', 'image/png'],
  ['qrcode-alipay.png', 'image/png']
])

export function apply(ctx) {
  for (const [name, contentType] of ASSETS) {
    ctx.connection.fetch.register({
      path: `/api/desktop-client-ui/assets/${name}`,
      methods: ['GET'],
      requestBody: 'buffered',
      async fetch() {
        try {
          const body = await readFile(new URL(`./assets/${name}`, import.meta.url))
          return new Response(body, {
            headers: {
              'content-type': contentType,
              'cache-control': 'no-cache'
            }
          })
        } catch {
          return Response.json(
            { error: `Could not read ${name}.` },
            { status: 500, headers: { 'cache-control': 'no-store' } }
          )
        }
      }
    })
  }
}
