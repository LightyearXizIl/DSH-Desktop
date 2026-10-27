const { app, BrowserWindow } = require('electron')
const { createServer } = require('node:http')
const { mkdtempSync, readFileSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')

const [htmlPath, cssPath, assetsDirectory, screenshotPath] = process.argv.slice(2)
app.setPath('userData', mkdtempSync(join(tmpdir(), 'dsh-startup-render-')))

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.mp3': 'audio/mpeg'
}

app.whenReady().then(async () => {
  const html = readFileSync(htmlPath, 'utf8')
  const css = readFileSync(cssPath)
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname
    if (pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(html)
      return
    }
    if (pathname === '/dsh-startup/splash.css') {
      response.writeHead(200, { 'content-type': contentTypes['.css'] })
      response.end(css)
      return
    }
    if (pathname.startsWith('/dsh-startup/asset/')) {
      const name = pathname.slice('/dsh-startup/asset/'.length)
      if (!/^[a-z0-9._-]+\.mp3$/iu.test(name)) {
        response.writeHead(404).end()
        return
      }
      try {
        const body = readFileSync(join(assetsDirectory, name))
        response.writeHead(200, { 'content-type': contentTypes['.mp3'] })
        response.end(body)
      } catch {
        response.writeHead(404).end()
      }
      return
    }
    response.writeHead(404).end()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  const errors = []
  window.webContents.on('console-message', (_event, level, message) => {
    if (level === 3) errors.push(message)
  })
  await window.loadURL(`http://127.0.0.1:${port}/`)
  await new Promise((resolve) => setTimeout(resolve, 1800))
  const state = await window.webContents.executeJavaScript(`({
    api: typeof window.__DSH_STARTUP_API__,
    root: !!document.getElementById('dsh-startup-root'),
    rootClass: document.getElementById('dsh-startup-root')?.className,
    blackInnerClass: document.querySelector('.dsu-black-inner')?.className,
    status: document.querySelector('.dsu-status-zh')?.textContent,
    htmlClass: document.documentElement.className
  })`)
  const image = await window.webContents.capturePage()
  writeFileSync(screenshotPath, image.toPNG())
  server.close()
  process.stdout.write(JSON.stringify({ state, errors }))
  app.exit(0)
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
