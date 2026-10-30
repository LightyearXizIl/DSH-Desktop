window.__ModuleLoader__.load({
  id: 'dsh-desktop-market-installer',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const NS = 'settings.desktopMarketInstaller'
    const STATUS_PATH = '/dsh-desktop/market-installer/status'
    const INSTALL_PATH = '/dsh-desktop/market-installer/install'
    const MARKET_SIDEBAR_PATH = '/dsh-market/sidebar-entry'
    const MARKET_REPOSITORY = 'https://github.com/dsh-market/dsh-market'

    const en = {
      nav: 'Plugin market',
      title: 'Plugin market',
      intro: 'Install dsh-market to browse, search, install, and manage community plugins inside DSH Desktop.',
      community: 'dsh-market is maintained by its community; installing and using community plugins requires network access, those plugins are not reviewed by DSH Desktop, and after installation dsh-market will notify you when its own updates are available.',
      version: 'Recommended version',
      install: 'Install plugin market',
      installing: 'Installing plugin market…',
      installingHint: 'This can take a few minutes. Keep DSH Desktop open while pnpm downloads and configures the plugin.',
      installed: 'Plugin market installed',
      installedHint: 'Restart Harness once to load the complete market interface.',
      restart: 'Restart Harness',
      restarting: 'Restarting…',
      retry: 'Try again',
      incomplete: 'The previous installation is incomplete. Run the installer again to repair it.',
      failed: 'Plugin market could not be installed.',
      statusFailed: 'Could not read installation status.',
      repository: 'View dsh-market on GitHub',
      repositoryButton: 'View on GitHub',
      futureUpdates: 'After installation, dsh-market will notify you when its own updates are available.',
      loading: 'Loading plugin market…',
      loadFailed: 'Plugin market is installed but did not load.',
      loadFailedHint: 'Restart Harness to try again. If it still does not appear, remove it and install it again.',
      remove: 'Remove plugin market',
      removing: 'Removing…',
      removeFailed: 'Plugin market could not be removed.',
      imageTab: 'Image & video generation', builtInImageTitle: 'Built-in image & video generation', builtInImageEnabled: 'The built-in plugin is on.', builtInImageDisabled: 'The built-in plugin is off. You can use the market version.', builtInImageEnable: 'Enable built-in plugin', builtInImageConflict: 'Disable the market version of image & video generation before enabling the built-in plugin.', builtInImageFailed: 'Could not read or change the built-in plugin state.', builtInImageRetry: 'Try again', builtInImageRestart: 'Restart Harness to apply', builtInImagePending: 'The built-in plugin will load after Harness restarts.'
    }

    const zh = {
      nav: '插件市场',
      title: '插件市场',
      intro: '安装 dsh-market，在 DSH Desktop 内浏览、搜索、安装并管理社区插件。',
      community: 'dsh-market 由社区维护，安装和使用社区插件需要联网且不由 DSH Desktop 审核，安装后有新版本时会提示并提供升级。',
      version: '推荐版本',
      install: '安装插件市场',
      installing: '正在安装插件市场…',
      installingHint: '下载和配置可能需要几分钟，请保持 DSH Desktop 处于打开状态。',
      installed: '插件市场已安装',
      installedHint: '重启一次 Harness，即可加载完整的插件市场界面。',
      restart: '重启 Harness',
      restarting: '正在重启…',
      retry: '重试',
      incomplete: '上一次安装没有完成，请重新运行安装以修复。',
      failed: '插件市场安装失败。',
      statusFailed: '无法读取安装状态。',
      repository: '在 GitHub 查看 dsh-market',
      repositoryButton: '在 GitHub 查看',
      futureUpdates: '安装后，dsh-market 会在有新版本时提示并提供升级。',
      loading: '正在加载插件市场…',
      loadFailed: '插件市场已安装，但没有加载成功。',
      loadFailedHint: '可以重启 Harness 再试；仍未出现时，移除后重新安装。',
      remove: '移除插件市场',
      removing: '正在移除…',
      removeFailed: '插件市场移除失败。',
      imageTab: '影像生成', builtInImageTitle: '内置影像生成', builtInImageEnabled: '内置插件已启用。', builtInImageDisabled: '内置插件已关闭，可以使用市场版本。', builtInImageEnable: '启用内置插件', builtInImageConflict: '请先停用市场版本的影像生成，再启用内置插件。', builtInImageFailed: '无法读取或更改内置插件状态。', builtInImageRetry: '重试', builtInImageRestart: '重启 Harness 使更改生效', builtInImagePending: '重启 Harness 后将加载内置插件。'
    }

    const css = `
      .dshDesktopMarketSection{box-sizing:border-box;max-width:720px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:16px}
      .dshDesktopMarketTitle{margin:0;font-size:20px;font-weight:600;line-height:30px}
      .dshDesktopMarketIntro{margin:0;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
      .dshDesktopMarketCard{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:20px;padding:22px;display:flex;flex-direction:column;gap:18px}
      .dshDesktopMarketMark{width:46px;height:46px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);display:grid;grid-template-columns:repeat(2,10px);grid-auto-rows:10px;place-content:center;gap:4px}
      .dshDesktopMarketMark span{display:block;border-radius:3px;background:var(--dsw-alias-label-primary)}
      .dshDesktopMarketMark span:nth-child(4){opacity:.28}
      .dshDesktopMarketHead{display:flex;align-items:flex-start;gap:14px}
      .dshDesktopMarketIdentity{min-width:0;display:flex;flex-direction:column;gap:3px}
      .dshDesktopMarketName{font-size:16px;font-weight:600;line-height:24px}
      .dshDesktopMarketVersion{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
      .dshDesktopMarketNotice{margin:0;padding-top:16px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:19px}
      .dshDesktopMarketStatus{display:flex;flex-direction:column;gap:5px}
      .dshDesktopMarketStatusTitle{font-size:14px;font-weight:600;line-height:22px}
      .dshDesktopMarketStatusDetail{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;overflow-wrap:anywhere}
      .dshDesktopMarketActions{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
      .dshDesktopMarketButton{box-sizing:border-box;height:36px;padding:0 16px;border:1px solid transparent;border-radius:18px;font:inherit;font-size:14px;font-weight:500;cursor:pointer}
      .dshDesktopMarketPrimary{color:var(--dsw-alias-label-primary-foreground);background:var(--dsw-alias-button-primary-fill)}
      .dshDesktopMarketPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
      .dshDesktopMarketSecondary{color:var(--dsw-alias-label-primary);background:transparent;border-color:var(--dsw-alias-border-l3)}
      .dshDesktopMarketSecondary:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
      .dshDesktopMarketButton:disabled{cursor:default;opacity:.5}
      .dshDesktopMarketIconButton{display:inline-flex;align-items:center;gap:8px;text-decoration:none;line-height:34px}
      .dshDesktopMarketIconButton svg{width:16px;height:16px;flex:none;fill:currentColor}
      .dshDesktopMarketButton:focus-visible,.dshDesktopMarketLink:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
      .dshDesktopMarketLink{color:var(--dsw-alias-label-secondary);border-radius:6px;padding:5px 4px;font-size:13px;line-height:20px;text-decoration:none}
      .dshDesktopMarketLink:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}
      .dshDesktopMarketSpinner{box-sizing:border-box;width:16px;height:16px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-label-primary);border-radius:50%;animation:dshDesktopMarketSpin .75s linear infinite}
      .dshDesktopMarketBusy{display:flex;align-items:center;gap:9px}
      .dshDesktopMarketError{color:var(--dsw-alias-state-error-primary)}
      .dshDesktopBuiltInImage{list-style:none;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;color:var(--dsw-alias-label-primary)}.dshDesktopBuiltInImageTitle{font-size:15px;font-weight:600}.dshDesktopBuiltInImageHint{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}.dshDesktopBuiltInImageLabel{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer}.dshDesktopBuiltInImageLabel input{accent-color:var(--dsw-alias-brand-primary)}
      .dshDesktopMarketModalBackdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.42)}
      .dshDesktopMarketModal{box-sizing:border-box;width:min(440px,100%);padding:24px;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 18px 48px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:12px}
      .dshDesktopMarketModalTitle{margin:0;font-size:18px;font-weight:600;line-height:26px}
      .dshDesktopMarketModalText{margin:0;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
      .dshDesktopMarketModalNote{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:19px}
      .dshDesktopMarketModalActions{display:flex;justify-content:flex-end;gap:10px;padding-top:8px}
      @keyframes dshDesktopMarketSpin{to{transform:rotate(360deg)}}
      @media (prefers-reduced-motion:reduce){.dshDesktopMarketSpinner{animation:none}}
    `

    const GITHUB_ICON_PATH =
      'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z'

    function GitHubIcon() {
      return React.createElement(
        'svg',
        { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
        React.createElement('path', { d: GITHUB_ICON_PATH })
      )
    }

    function installStyles() {
      if (document.querySelector('style[data-plugin-css="dsh-desktop-market-installer"]')) return
      const style = document.createElement('style')
      style.dataset.plugin = 'dsh-desktop-market-installer'
      style.dataset.pluginCss = 'dsh-desktop-market-installer'
      style.textContent = css
      document.head.appendChild(style)
    }

    function marketAlreadyComposed() {
      const entries = globalThis.__DSH_BOOT__?.entries
      return Array.isArray(entries) && entries.some((entry) => entry?.id === 'dshmarket')
    }

    function BuiltInImageControl({ t }) {
      const [state, setState] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [restart, setRestart] = React.useState(false)
      const [error, setError] = React.useState('')
      const [retry, setRetry] = React.useState(0)
      React.useEffect(() => {
        const desktop = globalThis.dshDesktop
        if (!desktop?.getBuiltInImageGenerationStatus) { setError('builtInImageFailed'); return }
        let active = true
        void desktop.getBuiltInImageGenerationStatus().then(result => {
          if (active) { setState(result); setError('') }
        }, () => { if (active) setError('builtInImageFailed') })
        return () => { active = false }
      }, [retry])
      if (!state && !error) return null
      const enable = async event => {
        event.preventDefault()
        setBusy(true); setError('')
        try {
          const result = await globalThis.dshDesktop.setBuiltInImageGenerationEnabled(true)
          if (!result.ok) { setError(result.reason === 'market-active' ? 'builtInImageConflict' : 'builtInImageFailed'); return }
          setState(previous => ({ ...previous, enabled: true }))
          setRestart(true)
        } catch { setError('builtInImageFailed') }
        finally { setBusy(false) }
      }
      const restartHarness = async () => {
        setBusy(true); setError('')
        try {
          const result = await globalThis.dshDesktop.restartHarness()
          if (!result.ok) setError('builtInImageFailed')
        } catch { setError('builtInImageFailed') }
        finally { setBusy(false) }
      }
      return React.createElement('section', { className: 'dshDesktopBuiltInImage', 'data-testid': 'built-in-image-generation-control' },
        React.createElement('span', { className: 'dshDesktopBuiltInImageTitle' }, t('builtInImageTitle')),
        state && React.createElement('p', { className: 'dshDesktopBuiltInImageHint' }, t(restart ? 'builtInImagePending' : state.enabled ? 'builtInImageEnabled' : 'builtInImageDisabled')),
        state?.marketActive && !restart && !state.enabled && React.createElement('p', { className: 'dshDesktopBuiltInImageHint' }, t('builtInImageConflict')),
        state && !state.enabled && React.createElement('label', { className: 'dshDesktopBuiltInImageLabel' },
          React.createElement('input', { type: 'checkbox', role: 'switch', checked: restart, disabled: busy || restart || state.marketActive, onChange: enable }), t('builtInImageEnable')),
        error && React.createElement('p', { className: 'dshDesktopMarketError', role: 'alert' }, t(error)),
        !state && error && React.createElement('button', { className: 'dshDesktopMarketButton dshDesktopMarketSecondary', type: 'button', onClick: () => { setError(''); setRetry(value => value + 1) } }, t('builtInImageRetry')),
        restart && React.createElement('button', { className: 'dshDesktopMarketButton dshDesktopMarketSecondary', type: 'button', disabled: busy, onClick: restartHarness }, t('builtInImageRestart')))
    }

    async function readStatus() {
      const response = await fetch(STATUS_PATH, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`)
      return payload
    }

    /**
     * Whether dsh-market's own sidebar row is switched on. dsh-market 1.67+
     * serves the user's choice at this route for its own client; an older
     * build answers 404, and any failure reads as "off" so the market keeps
     * its Settings section.
     */
    async function marketSidebarEnabled() {
      try {
        const response = await fetch(MARKET_SIDEBAR_PATH, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store'
        })
        if (!response.ok) return false
        const payload = await response.json()
        return payload?.enabled === true
      } catch {
        // Unreachable or not JSON: treat as off, which keeps a door open.
        return false
      }
    }

    /** How long a composed market may take to activate before the tab calls it failed. */
    const MARKET_LOAD_GRACE_MS = 8_000

    function MarketInstallerSection({ t, composed }) {
      const [status, setStatus] = React.useState()
      const [error, setError] = React.useState()
      const [restarting, setRestarting] = React.useState(false)
      const [removing, setRemoving] = React.useState(false)
      const [settled, setSettled] = React.useState(
        () => !composed || performance.now() >= MARKET_LOAD_GRACE_MS
      )

      React.useEffect(() => {
        if (settled) return
        const timer = setTimeout(
          () => setSettled(true),
          Math.max(0, MARKET_LOAD_GRACE_MS - performance.now())
        )
        return () => clearTimeout(timer)
      }, [settled])

      React.useEffect(() => {
        let disposed = false
        const load = async () => {
          try {
            const next = await readStatus()
            if (disposed) return
            setStatus(next)
            setError(undefined)
          } catch (failure) {
            if (!disposed) setError(failure instanceof Error ? failure.message : String(failure))
          }
        }
        void load()
        return () => {
          disposed = true
        }
      }, [])

      React.useEffect(() => {
        if (status?.phase !== 'installing') return
        let disposed = false
        let timer
        const poll = async () => {
          try {
            const next = await readStatus()
            if (disposed) return
            setStatus(next)
            setError(undefined)
            if (next.phase === 'installing') timer = setTimeout(poll, 850)
          } catch (failure) {
            if (disposed) return
            setError(failure instanceof Error ? failure.message : String(failure))
            timer = setTimeout(poll, 1_500)
          }
        }
        timer = setTimeout(poll, 850)
        return () => {
          disposed = true
          clearTimeout(timer)
        }
      }, [status?.phase])

      const install = async () => {
        setError(undefined)
        setStatus((current) => ({
          ...current,
          phase: 'installing',
          recommendedVersion: current?.recommendedVersion || 'latest'
        }))
        try {
          const response = await fetch(INSTALL_PATH, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { accept: 'application/json' }
          })
          const payload = await response.json()
          if (!response.ok && response.status !== 409) {
            throw new Error(payload?.error || `HTTP ${response.status}`)
          }
          setStatus(payload)
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure))
        }
      }

      const restart = async () => {
        const bridge = globalThis.dshDesktop
        if (!bridge || typeof bridge.restartHarness !== 'function') {
          setError('Harness > Restart Harness')
          return
        }
        setRestarting(true)
        setError(undefined)
        try {
          await bridge.restartHarness()
        } catch (failure) {
          setRestarting(false)
          setError(failure instanceof Error ? failure.message : String(failure))
        }
      }

      const remove = async () => {
        setRemoving(true)
        setError(undefined)
        try {
          // The desktop stops Harness, removes the market and relaunches, so
          // a successful call reloads this page into the install state.
          const result = await globalThis.dshDesktop.uninstallMarket()
          if (!result?.ok) {
            setRemoving(false)
            setError(t('removeFailed'))
          }
        } catch (failure) {
          setRemoving(false)
          setError(failure instanceof Error ? failure.message : String(failure))
        }
      }

      const phase = status?.phase
      const busy = phase === 'installing'
      const installed = phase === 'installed'
      // In the boot graph and on disk, yet this tab is showing: the market's
      // client never came up (this tab hides as soon as it does).
      const stalled = Boolean(composed) && installed && !status?.restartRequired
      const failed = phase === 'error' || phase === 'incomplete' || Boolean(error)
      const version = status?.recommendedVersion || 'latest'
      const canRemove = typeof globalThis.dshDesktop?.uninstallMarket === 'function'

      return React.createElement(
        'section',
        { className: 'dshDesktopMarketSection' },
        React.createElement('h2', { className: 'dshDesktopMarketTitle' }, t('title')),
        React.createElement('p', { className: 'dshDesktopMarketIntro' }, t('intro')),
        React.createElement(
          'div',
          { className: 'dshDesktopMarketCard' },
          React.createElement(
            'div',
            { className: 'dshDesktopMarketHead' },
            React.createElement(
              'div',
              { className: 'dshDesktopMarketMark', 'aria-hidden': 'true' },
              React.createElement('span'),
              React.createElement('span'),
              React.createElement('span'),
              React.createElement('span')
            ),
            React.createElement(
              'div',
              { className: 'dshDesktopMarketIdentity' },
              React.createElement('span', { className: 'dshDesktopMarketName' }, 'dsh-market'),
              React.createElement(
                'span',
                { className: 'dshDesktopMarketVersion' },
                `${t('version')} · ${version}`
              )
            )
          ),
          busy
            ? React.createElement(
                'div',
                { className: 'dshDesktopMarketStatus' },
                React.createElement(
                  'div',
                  { className: 'dshDesktopMarketBusy' },
                  React.createElement('span', {
                    className: 'dshDesktopMarketSpinner',
                    'aria-hidden': 'true'
                  }),
                  React.createElement(
                    'span',
                    { className: 'dshDesktopMarketStatusTitle' },
                    t('installing')
                  )
                ),
                React.createElement(
                  'p',
                  { className: 'dshDesktopMarketStatusDetail' },
                  status?.detail || t('installingHint')
                )
              )
            : stalled
              ? React.createElement(
                  'div',
                  { className: 'dshDesktopMarketStatus', role: 'status', 'aria-live': 'polite' },
                  React.createElement(
                    'span',
                    {
                      className: settled
                        ? 'dshDesktopMarketStatusTitle dshDesktopMarketError'
                        : 'dshDesktopMarketStatusTitle'
                    },
                    settled ? t('loadFailed') : t('loading')
                  ),
                  settled
                    ? React.createElement(
                        'p',
                        { className: 'dshDesktopMarketStatusDetail' },
                        t('loadFailedHint')
                      )
                    : null,
                  error
                    ? React.createElement(
                        'p',
                        { className: 'dshDesktopMarketStatusDetail dshDesktopMarketError' },
                        error
                      )
                    : null
                )
            : installed
              ? React.createElement(
                  'div',
                  { className: 'dshDesktopMarketStatus' },
                  React.createElement(
                    'span',
                    { className: 'dshDesktopMarketStatusTitle' },
                    t('installed')
                  ),
                  React.createElement(
                    'p',
                    { className: 'dshDesktopMarketStatusDetail' },
                    t('installedHint')
                  )
                )
              : failed
                ? React.createElement(
                    'div',
                    { className: 'dshDesktopMarketStatus' },
                    React.createElement(
                      'span',
                      { className: 'dshDesktopMarketStatusTitle dshDesktopMarketError' },
                      phase === 'incomplete' ? t('incomplete') : t('failed')
                    ),
                    error || status?.detail
                      ? React.createElement(
                          'p',
                          { className: 'dshDesktopMarketStatusDetail dshDesktopMarketError' },
                          error || status?.detail
                        )
                      : null
                  )
                : null,
          React.createElement(
            'div',
            { className: 'dshDesktopMarketActions' },
            installed
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dshDesktopMarketButton dshDesktopMarketPrimary',
                    disabled: restarting || removing,
                    onClick: () => void restart()
                  },
                  restarting ? t('restarting') : t('restart')
                )
              : React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dshDesktopMarketButton dshDesktopMarketPrimary',
                    disabled: busy || (!status && !error),
                    onClick: () => void install()
                  },
                  failed ? t('retry') : t('install')
                ),
            stalled && settled && canRemove
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dshDesktopMarketButton dshDesktopMarketSecondary',
                    disabled: restarting || removing,
                    onClick: () => void remove()
                  },
                  removing ? t('removing') : t('remove')
                )
              : null,
            React.createElement(
              'a',
              {
                className: 'dshDesktopMarketButton dshDesktopMarketSecondary dshDesktopMarketIconButton',
                href: MARKET_REPOSITORY,
                target: '_blank',
                rel: 'noopener noreferrer',
                'aria-label': t('repository')
              },
              GitHubIcon(),
              t('repositoryButton')
            )
          ),
          React.createElement('p', { className: 'dshDesktopMarketNotice' }, t('community'))
        )
      )
    }

    const inject = ['slots', 'locale']
    function apply(ctx) {
      installStyles()
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'dsh-desktop-market-installer: copy dictionaries'
      )
      const t = ctx.locale.bind(NS)
      registerBuiltInImageTab(ctx, t)
      registerMarketTab(ctx, t)
    }

    /**
     * The placeholder "Plugin market" tab stays until dsh-market's client is
     * really running, which is when it provides its `market` service and
     * registers its own tab in the same step. Being in the boot graph is not
     * enough: a market that is declared but fails to activate registers
     * neither, and hiding the placeholder on the graph alone left no market
     * entry at all, not even a way to repair it.
     */
    function registerMarketTab(ctx, t) {
      const composed = marketAlreadyComposed()
      let active = true
      let dispose
      const show = () => {
        if (!active || dispose !== undefined) return
        dispose = ctx.slots.inject('settings.plugins.tab', () =>
          ctx.slots.register(
            {
              name: 'settings.plugins.tab',
              id: 'market',
              order: 60,
              label: () => t('nav'),
              inject: () => ({ t, composed })
            },
            MarketInstallerSection
          )
        )
      }
      const hide = () => {
        dispose?.()
        dispose = undefined
      }
      ctx.effect(() => {
        show()
        return () => {
          active = false
          hide()
        }
      }, 'dsh-desktop-market-installer: market tab')
      // The running dsh-market owns its management card (version, updates,
      // removal) under Settings → Built-in plugins. When its sidebar row is on
      // that row carries the full panel, and the market's own Settings section
      // would be a third door, so ask it through its published control to hide
      // that section. Only then: builds before 1.67 have no sidebar row and no
      // card, and a newer build with no choice on record keeps the row off
      // because it counts that very section as its door, so hiding it there
      // left the market with no way in at all.
      ctx.inject(['market'], (scoped) => {
        hide()
        const market = scoped.market
        const ownsSection = typeof market?.setSettingsVisible === 'function'
        let disposed = false
        let hidden = false
        if (ownsSection) {
          void marketSidebarEnabled().then((enabled) => {
            if (disposed || !enabled) return
            market.setSettingsVisible(false)
            hidden = true
          })
        }
        return () => {
          disposed = true
          if (hidden) market.setSettingsVisible(true)
          show()
        }
      })
    }

    /**
     * One "Image generation" tab at a time. While the built-in plugin is on it
     * contributes that tab itself and this control has nothing to offer but a
     * status line, so the control only registers while the built-in plugin is
     * off (to turn it back on) or its status cannot be read (to show the error).
     */
    function registerBuiltInImageTab(ctx, t) {
      ctx.effect(() => {
        let active = true
        let dispose
        const register = () => {
          if (!active || dispose !== undefined) return
          dispose = ctx.slots.inject('settings.plugins.tab', () =>
            ctx.slots.register(
              { name: 'settings.plugins.tab', id: 'desktop-host-plugins', order: -100,
                label: () => t('imageTab'), locale: NS,
                inject: () => ({ t }) },
              BuiltInImageControl
            )
          )
        }
        const desktop = globalThis.dshDesktop
        if (typeof desktop?.getBuiltInImageGenerationStatus !== 'function') register()
        else {
          void desktop.getBuiltInImageGenerationStatus().then(
            (status) => { if (status?.enabled !== true) register() },
            register
          )
        }
        return () => {
          active = false
          dispose?.()
        }
      }, 'dsh-desktop-market-installer: built-in image tab')
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
