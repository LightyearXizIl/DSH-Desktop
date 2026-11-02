// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { DEFAULTS, MODEL_CATALOG } from '../packages/dsh-image-generation/lib/provider.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

it('registers the image settings tab in 0.1.7 and opens the configuration form', async () => {
  const source = await readFile(resolve('packages/dsh-image-generation/client.js'), 'utf8')
  const primitives = await readFile(createRequire(resolve('package.json')).resolve('@deepseek-ai/dsh-client-ui-primitives'), 'utf8')
  const exports = primitives.match(/export \{([^}]+)\}/)[1].split(',').map(value => value.trim())
  let plugin
  const require = name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return new Proxy({}, { get(_target, key) {
      expect(exports).toContain(key)
      if (key === 'Menu') return ({ anchor }) => anchor
      return props => React.createElement('svg', props)
    } })
    throw new Error(name)
  }
  new Function('window', source)({ __ModuleLoader__: { load({ factory }) { plugin = factory(require) } } })
  const entries = [], disposers = []
  plugin.apply({
    uiConversation: { events: { register() {} } },
    locale: { register() {}, bind: () => key => key },
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose) },
    slots: {
      inject(name, fn) { if (['settings.plugins.tab', 'conversation.chat.node'].includes(name)) fn() },
      register(options, Component) { entries.push({ options, Component }) }
    }
  })
  const entry = entries.find(item => item.options.name === 'settings.plugins.tab')
  expect(entry.options.id).toBe('image-generation')
  expect(entry.options.label()).toBe('title')
  const settings = { revision: 0, provider: 'bytedance', writable: true, catalogs: MODEL_CATALOG,
    profiles: Object.fromEntries(Object.entries(DEFAULTS).map(([name, defaults]) => [name, { ...defaults, configured: false }])) }
  const fetchMock = vi.fn(async () => ({ ok: true, text: async () => JSON.stringify(settings) }))
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => root.render(React.createElement(entry.Component, { t: key => key, ...entry.options.inject() })))
    await act(async () => container.querySelector('button[aria-expanded]').click())
    expect(container.querySelector('form')).not.toBeNull()
    expect(container.querySelector('input[type=password]')).not.toBeNull()
    expect(container.querySelector('button[type=submit]').textContent).toBe('save')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  } finally {
    await act(async () => root.unmount())
    container.remove()
    disposers.reverse().forEach(dispose => dispose())
    vi.unstubAllGlobals()
  }
})

it('shows the saved GrsAI key\'s credit balance in the GrsAI section', async () => {
  const source = await readFile(resolve('packages/dsh-image-generation/client.js'), 'utf8')
  let plugin
  const require = name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return new Proxy({}, { get(_target, key) {
      if (key === 'Menu') return ({ anchor }) => anchor
      return props => React.createElement('svg', props)
    } })
    throw new Error(name)
  }
  new Function('window', source)({ __ModuleLoader__: { load({ factory }) { plugin = factory(require) } } })
  const entries = [], disposers = []
  plugin.apply({
    uiConversation: { events: { register() {} } },
    locale: { register() {}, bind: () => key => key },
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose) },
    slots: { inject(name, fn) { if (name === 'settings.plugins.tab') fn() }, register(options, Component) { entries.push({ options, Component }) } },
  })
  const entry = entries.find(item => item.options.name === 'settings.plugins.tab')
  const settings = { revision: 2, provider: 'grsai', writable: true, catalogs: MODEL_CATALOG,
    profiles: Object.fromEntries(Object.entries(DEFAULTS).map(([name, defaults]) => [name, { ...defaults, configured: name === 'grsai', validation: name === 'grsai' ? 'credits' : null }])) }
  const catalog = { source: 'provider', origin: 'catalog', canFetch: true, models: ['nano-banana-fast', 'nano-banana-3'], videoModels: ['minimax-h3', 'agnes-video-3'], textModels: ['gemini-3.1-pro', 'gemini-4-pro'] }
  const options = { image: { ratios: ['1:1', '16:9'], resolutions: ['1K', '2K', '4K'], qualities: [] }, video: { ratios: ['16:9', '9:16'], resolutions: ['768p', '480p', '1080p'], duration: { min: 1, max: 15, default: 6 } } }
  const fetchMock = vi.fn(async path => ({ ok: true, text: async () => JSON.stringify(path.endsWith('.credits') ? { key: { credits: 12345 }, account: null } : path.endsWith('.models') ? catalog : path.endsWith('.options') ? options : settings) }))
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => root.render(React.createElement(entry.Component, { t: key => key, ...entry.options.inject() })))
    await act(async () => container.querySelector('button[aria-expanded]').click())
    const balance = container.querySelector('[data-testid=grsai-credits]')
    expect(balance?.textContent).toContain('12,345')
    expect(balance?.textContent).toContain('creditsUnit')
    const creditCall = fetchMock.mock.calls.find(([path]) => path === '/api/image-generation.credits')
    expect(creditCall?.[1].method).toBe('GET')
    // Opening the GrsAI section loads the live catalog without a key.
    const catalogCall = fetchMock.mock.calls.find(([path]) => path === '/api/image-generation.models')
    expect(catalogCall?.[1].method).toBe('POST')
    expect(JSON.parse(catalogCall[1].body)).toMatchObject({ provider: 'grsai', baseUrl: 'https://grsai.dakka.com.cn' })
    expect(container.textContent).toContain('catalogOnline')
    // The saved choices stay selected after the live lists replace the shipped ones.
    expect(container.querySelector('button[name=videoModel]')?.textContent).toContain('minimax-h3')
    expect(container.querySelector('button[name=textModel]')?.textContent).toContain('gemini-3.1-pro')
    expect(container.querySelector('button.dshImageFetch')?.disabled).toBe(false)
    // The option menus list what the Host says the selected models support.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 300)) })
    const optionCall = fetchMock.mock.calls.find(([path]) => path === '/api/image-generation.options')
    expect(JSON.parse(optionCall[1].body)).toEqual({ provider: 'grsai', model: 'nano-banana-fast', videoModel: 'minimax-h3' })
    expect(container.querySelector('button[name=imageResolution]')?.textContent).toContain('1K')
    expect(container.querySelector('button[name=videoResolution]')?.textContent).toContain('768p')
    expect(container.querySelector('input[name=accountToken]')).not.toBeNull()
  } finally {
    await act(async () => root.unmount())
    container.remove()
    disposers.reverse().forEach(dispose => dispose())
    vi.unstubAllGlobals()
  }
})

async function mountCard(responses) {
  const source = await readFile(resolve('packages/dsh-image-generation/client.js'), 'utf8')
  let plugin
  const require = name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return new Proxy({}, { get(_target, key) {
      if (key === 'Menu') return ({ anchor }) => anchor
      return props => React.createElement('svg', props)
    } })
    throw new Error(name)
  }
  new Function('window', source)({ __ModuleLoader__: { load({ factory }) { plugin = factory(require) } } })
  const entries = [], disposers = []
  plugin.apply({
    uiConversation: { events: { register() {} } },
    locale: { register() {}, bind: () => key => key },
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose) },
    slots: { inject(name, fn) { if (name === 'settings.plugins.tab') fn() }, register(options, Component) { entries.push({ options, Component }) } },
  })
  const entry = entries.find(item => item.options.name === 'settings.plugins.tab')
  const fetchMock = vi.fn(async (path, init) => {
    const [status, body] = responses[path.split('.').at(-1)]?.(init) ?? [503, { code: 'UNAVAILABLE' }]
    return { ok: status < 400, text: async () => JSON.stringify(body) }
  })
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(React.createElement(entry.Component, { t: key => key, ...entry.options.inject() })))
  await act(async () => container.querySelector('button[aria-expanded]').click())
  return {
    container, fetchMock,
    async unmount() { await act(async () => root.unmount()); container.remove(); disposers.reverse().forEach(dispose => dispose()); vi.unstubAllGlobals() },
  }
}

const grsaiSettings = (extra = {}) => ({ revision: 2, provider: 'grsai', writable: true, catalogs: MODEL_CATALOG,
  profiles: Object.fromEntries(Object.entries(DEFAULTS).map(([name, defaults]) => [name,
    { ...defaults, configured: name === 'grsai', validation: name === 'grsai' ? 'credits' : null, ...(name === 'grsai' ? extra : {}) }])) })
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 300)) })

it('explains a 0 key quota and shows the account balance beside it once a token is saved', async () => {
  let account = null
  const card = await mountCard({
    settings: () => [200, grsaiSettings({ accountTokenConfigured: account !== null })],
    credits: () => [200, { key: { credits: 0 }, account }],
  })
  try {
    const balance = () => card.container.querySelector('[data-testid=grsai-credits]').textContent
    // An unlimited key's own quota is 0: the card says why instead of presenting it as the balance.
    expect(balance()).toContain('0 creditsUnit')
    expect(balance()).toContain('creditsZeroHint')
    expect(balance()).not.toContain('creditsAccount')
    account = { credits: 98765 }
    await act(async () => [...card.container.querySelectorAll('button')].find(button => button.textContent === 'creditsRefresh').click())
    expect(balance()).toContain('creditsAccount')
    expect(balance()).toContain('98,765 creditsUnit')
    expect(balance()).not.toContain('creditsZeroHint')
  } finally { await card.unmount() }
})

it('shows the reason a balance read failed, never 0', async () => {
  const card = await mountCard({
    settings: () => [200, grsaiSettings()],
    credits: () => [502, { code: 'AUTH', error: 'The API key is invalid or expired.', detail: 'apikey不存在', providerStatus: 401 }],
  })
  try {
    const value = card.container.querySelector('[data-testid=grsai-credits] [data-state=failed]')
    // The test locale echoes keys, so the reason renders as the key text plus GrsAI's own words.
    expect(value?.textContent).toBe('creditsAuth · creditsReason · HTTP 401')
    expect(card.container.querySelector('[data-testid=grsai-credits]').textContent).not.toContain('0 creditsUnit')
  } finally { await card.unmount() }
})

it('saves the chosen generation options and a typed account token for GrsAI', async () => {
  let saved
  const card = await mountCard({
    settings: () => [200, grsaiSettings({ imageResolution: '2K', videoResolution: '9999p' })],
    credits: () => [200, { key: { credits: 10 }, account: null }],
    options: () => [200, { image: { ratios: ['1:1', '16:9'], resolutions: ['1K', '2K', '4K'], qualities: [] }, video: { ratios: ['16:9', '9:16'], resolutions: ['768p', '480p', '1080p'] } }],
    save: init => { saved = JSON.parse(init.body); return [200, grsaiSettings()] },
  })
  try {
    await settle()
    expect(card.container.querySelector('button[name=imageResolution]')?.textContent).toContain('2K')
    // A saved value the model no longer offers shows as the model's default.
    expect(card.container.querySelector('button[name=videoResolution]')?.textContent).toContain('768p')
    const input = card.container.querySelector('input[name=accountToken]')
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    await act(async () => { setValue.call(input, 'typed-token'); input.dispatchEvent(new Event('input', { bubbles: true })) })
    await act(async () => card.container.querySelector('button[type=submit]').click())
    expect(saved).toMatchObject({ provider: 'grsai', imageResolution: '2K', accountToken: 'typed-token', clearAccountToken: false })
    // ...and is dropped from the save rather than refused by the Host.
    expect(saved).not.toHaveProperty('videoResolution')
  } finally { await card.unmount() }
})

it('asks for the address of an OpenAI-compatible service up front and sends its options', async () => {
  let saved
  const settings = { ...grsaiSettings(), provider: 'compatible' }
  const card = await mountCard({
    settings: () => [200, settings],
    options: () => [200, { image: { ratios: ['1:1', '16:9'], resolutions: ['gpt', 'dalle3', 'omit'], qualities: ['default', 'auto', 'hd'] }, video: null }],
    save: init => { saved = JSON.parse(init.body); return [200, settings] },
  })
  try {
    const fields = [...card.container.querySelectorAll('input')].map(input => input.name)
    // The address comes before the key, outside the advanced section; there is no video section.
    expect(fields.indexOf('baseUrl')).toBeLessThan(fields.indexOf('apiKey'))
    expect(card.container.querySelector('details')).toBeNull()
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    const type = async (name, value) => {
      const input = card.container.querySelector(`input[name=${name}]`)
      await act(async () => { setValue.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) })
    }
    await type('baseUrl', 'https://images.example.com/v1')
    await type('apiKey', 'compat-key')
    await type('model', 'flux-pro')
    await settle()
    expect(card.container.querySelector('button[name=imageResolution]')?.textContent).toContain('resolution_gpt')
    expect(card.container.querySelector('button[name=imageQuality]')?.textContent).toContain('quality_default')
    expect(card.container.querySelector('button[name=videoResolution]')).toBeNull()
    await act(async () => card.container.querySelector('button[type=submit]').click())
    expect(saved).toMatchObject({ provider: 'compatible', baseUrl: 'https://images.example.com/v1', apiKey: 'compat-key', model: 'flux-pro' })
    const optionCall = card.fetchMock.mock.calls.filter(([path]) => path === '/api/image-generation.options').at(-1)
    expect(JSON.parse(optionCall[1].body)).toMatchObject({ provider: 'compatible', model: 'flux-pro' })
  } finally { await card.unmount() }
})
