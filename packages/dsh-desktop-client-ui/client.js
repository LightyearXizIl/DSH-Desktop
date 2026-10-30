window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const {
      BrandWordmark,
      FishLogo,
      MarkdownDelegateProvider,
      MarkdownText,
      MenuItemButton,
      Modal
    } = require('@deepseek-ai/dsh-client-ui-primitives')

    const ABOUT_NS = 'settings.desktopAbout'
    const ABOUT_AUTHOR = {
      name: 'NullPointer',
      login: 'LightyearXizIl',
      repository: 'https://github.com/LightyearXizIl/DSH-Desktop',
      wechat: 'XizllHZ_007'
    }
    const ABOUT_ASSET = (name) => `/api/desktop-client-ui/assets/${name}`
    const ABOUT_ZH = {
      nav: '关于',
      title: '关于 DSH Desktop',
      intro: '作者、版本与支持方式。',
      author: '作者',
      repository: 'GitHub 仓库',
      wechat: '微信号',
      desktopVersion: '桌面端版本',
      harnessVersion: '内置 Harness',
      versionLoading: '正在读取版本…',
      versionUnavailable: '版本信息不可用',
      checkUpdates: '检查更新',
      checking: '正在检查…',
      upToDate: '当前已是最新版本。',
      available: '发现新版本 {version}，更新窗口已打开。',
      unsupported: '当前构建不支持自动更新。',
      checkFailed: '检查更新失败：{message}',
      checkFailedUnknown: '未知错误',
      checkFinished: '更新检查已完成。',
      updateLogTitle: 'v{version} 更新日志',
      viewRelease: '查看 GitHub Release',
      noReleaseNotes: '这个版本没有填写更新说明。',
      currentTag: '当前版本',
      newTag: '新版本',
      notesLoading: '正在读取更新日志…',
      notesFailed: '读取更新日志失败：{message}',
      notesRetry: '重试',
      copyCode: '复制',
      copiedCode: '已复制',
      footnotes: '脚注',
      appreciate: '赞赏',
      appreciateTitle: '支持 DSH Desktop',
      appreciateIntro: '如果这个项目对你有帮助，可以扫码赞赏。',
      wechatPay: '微信赞赏',
      alipay: '支付宝赞赏',
      close: '关闭',
      avatarAlt: 'NullPointer 的 GitHub 头像',
      wechatQrAlt: '微信赞赏二维码',
      alipayQrAlt: '支付宝赞赏二维码',
      thanks: '感谢你的支持。'
    }
    const ABOUT_EN = {
      nav: 'About',
      title: 'About DSH Desktop',
      intro: 'Author, version, and ways to support the project.',
      author: 'Author',
      repository: 'GitHub repository',
      wechat: 'WeChat ID',
      desktopVersion: 'Desktop version',
      harnessVersion: 'Bundled Harness',
      versionLoading: 'Reading version…',
      versionUnavailable: 'Version information is unavailable',
      checkUpdates: 'Check for updates',
      checking: 'Checking…',
      upToDate: 'You are on the latest version.',
      available: 'Version {version} is available. The update window is open.',
      unsupported: 'Automatic updates are unavailable in this build.',
      checkFailed: 'Update check failed: {message}',
      checkFailedUnknown: 'Unknown error',
      checkFinished: 'Update check finished.',
      updateLogTitle: 'What’s new in v{version}',
      viewRelease: 'View GitHub Release',
      noReleaseNotes: 'This release has no notes.',
      currentTag: 'Current',
      newTag: 'New',
      notesLoading: 'Loading release notes…',
      notesFailed: 'Could not load release notes: {message}',
      notesRetry: 'Try again',
      copyCode: 'Copy',
      copiedCode: 'Copied',
      footnotes: 'Footnotes',
      appreciate: 'Support',
      appreciateTitle: 'Support DSH Desktop',
      appreciateIntro: 'If this project helps you, you can support it by scanning a code.',
      wechatPay: 'WeChat',
      alipay: 'Alipay',
      close: 'Close',
      avatarAlt: 'NullPointer GitHub avatar',
      wechatQrAlt: 'WeChat support QR code',
      alipayQrAlt: 'Alipay support QR code',
      thanks: 'Thank you for your support.'
    }

    // Tight bounds of the mark inside its 1000x1000 source artwork.
    const BRAND_MARK_VIEWBOX = { x: 42, y: 218, width: 898, height: 564 }
    // DSH Desktop whale mark: a window with a tail, drawn in currentColor so
    // it follows the sidebar text color in both themes.
    const BRAND_MARK_PATH = "M478.318 218C605.318 218 683.318 287 687.318 404L691.318 472C693.318 525 697.319 556 726.318 574C746.318 587 774.318 585 790.318 562C799.318 550 802.318 539 792.318 534C747.319 513 727.318 472 738.318 428C739.652 420 742.652 418.667 747.318 424C774.318 450 815.318 460 831.318 501C855.318 457 898.318 456 930.318 436C936.318 431.333 939.318 433.333 939.318 442C938.318 496 903.318 535 850.318 547C841.318 570 833.318 592 819.318 622C773.318 723 661.318 782 491.318 782H294.318C161.319 782 74.3183 714 53.3184 592C41.3184 526 38.3184 433 50.3184 375C70.3184 277 113.82 218 234.32 218H478.318ZM571.82 350.5C469.82 333.5 277.82 329.5 164.82 350.5C138.82 355.5 114.318 379 110.318 404C100.318 451 102.318 551 124.318 596C155.318 660 214.319 697 315.318 705C324.318 678 346.319 662 376.318 662C404.318 662 427.318 678 435.318 705C493.318 699 526.318 680 562.318 652C621.318 606 633.749 527.103 633.749 424C633.749 385.144 604.82 355.5 571.82 350.5ZM179.32 264C167.722 264 158.32 273.402 158.32 285C158.32 296.598 167.722 306 179.32 306C190.918 306 200.32 296.598 200.32 285C200.32 273.402 190.918 264 179.32 264ZM245.551 264C233.953 264 224.551 273.402 224.551 285C224.551 296.598 233.953 306 245.551 306C257.149 306 266.551 296.598 266.551 285C266.551 273.402 257.149 264 245.551 264ZM311.782 264C300.184 264 290.782 273.402 290.782 285C290.782 296.598 300.184 306 311.782 306C323.38 306 332.782 296.598 332.782 285C332.782 273.402 323.38 264 311.782 264Z"

    function DesktopBrandMark() {
      const height = 17
      return React.createElement(
        'svg',
        {
          width: height * BRAND_MARK_VIEWBOX.width / BRAND_MARK_VIEWBOX.height,
          height,
          viewBox: `${BRAND_MARK_VIEWBOX.x} ${BRAND_MARK_VIEWBOX.y} ${BRAND_MARK_VIEWBOX.width} ${BRAND_MARK_VIEWBOX.height}`,
          fill: 'none',
          'aria-hidden': 'true'
        },
        React.createElement('path', { d: BRAND_MARK_PATH, fill: 'currentColor' })
      )
    }

    function DesktopBrandName() {
      return React.createElement(BrandWordmark, { includeMark: false })
    }

    function ConversationBrandMark(props) {
      return React.createElement(FishLogo, props)
    }

    function OpenUnpreviewableFile({ absolutePath, openWorkspacePath }) {
      const [error, setError] = React.useState('')
      const label = document.documentElement.lang?.toLowerCase().startsWith('zh')
        ? '用本地应用打开'
        : 'Open with local app'
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('button', {
          type: 'button',
          'data-textpreview-open-local': true,
          onClick: () => {
            setError('')
            void openWorkspacePath(absolutePath).catch((reason) => {
              setError(reason instanceof Error ? reason.message : String(reason))
            })
          }
        }, label),
        error && React.createElement('span', { role: 'alert' }, error)
      )
    }

    function DeleteSessionMenuItem({ sessionId, displayTitle, useMenuOpenState, deleteSession }) {
      const [, setMenuOpen] = useMenuOpenState()
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      const label = chinese ? '永久删除会话' : 'Delete session permanently'
      const warning = chinese
        ? `确定删除“${displayTitle || sessionId}”？工作区文件会保留。此操作无法撤销。`
        : `Delete “${displayTitle || sessionId}”? Workspace files are kept. This can’t be undone.`
      return React.createElement(MenuItemButton, {
        danger: true,
        onSelect: () => {
          setMenuOpen(false)
          if (!window.confirm(warning)) return
          void Promise.resolve().then(() => deleteSession(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function OpenSessionFolderMenuItem({ sessionId, useMenuOpenState, openInFinder }) {
      const [, setMenuOpen] = useMenuOpenState()
      if (typeof window.dshDesktop?.openInFinder !== 'function') return null
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      const label = chinese ? '在文件管理器中打开' : 'Open in file manager'
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          void Promise.resolve().then(() => openInFinder(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function UnreadSessionMenuItem({ sessionId, unread, onUnreadChange, useMenuOpenState }) {
      const [, setMenuOpen] = useMenuOpenState()
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          onUnreadChange(sessionId, !unread)
        }
      }, unread ? (chinese ? '标为已读' : 'Mark as read') : (chinese ? '标为未读' : 'Mark as unread'))
    }

    /**
     * Split the leading "# DSH Desktop v0.0.5 — Theme" heading off release
     * notes: the card title already names the version, so the heading's theme
     * becomes the card's subtitle and the body starts at the first section.
     */
    function splitReleaseHeading(notes) {
      const text = typeof notes === 'string' ? notes.trim() : ''
      const match = /^#[ \t]+([^\n]+)\n?/.exec(text)
      if (!match) return { theme: '', body: text }
      const heading = match[1].trim()
      const dash = heading.search(/\s[\u2014\u2013-]\s/)
      return {
        theme: dash >= 0 ? heading.slice(dash + 3).trim() : heading,
        body: text.slice(match[0].length).trim()
      }
    }

    /** Release sections the About page shows; the rest stays on the GitHub Release. */
    const DISPLAY_SECTIONS = /^(?:更新内容|新增功能|新功能|问题修复|修复|what[\u2019']?s new|new features?|fixes|bug fixes)$/i

    /**
     * What the About page shows of a release: only its "what's new" and
     * "fixes" sections. Upgrade notes, known limitations, verification details
     * and diagnostic paths are for the GitHub Release page, not the app. Notes
     * written without sections have nothing to tell apart and show whole.
     */
    function releaseNotesForDisplay(notes) {
      const { theme, body } = splitReleaseHeading(notes)
      const lines = body.split('\n')
      if (!lines.some((line) => /^##[ \t]+/.test(line))) return { theme, body }
      const kept = []
      let keep = false
      for (const line of lines) {
        const heading = /^##[ \t]+(.+?)[ \t]*$/.exec(line)
        if (heading) keep = DISPLAY_SECTIONS.test(heading[1].replace(/[*_`#]/g, '').trim())
        if (keep) kept.push(line)
      }
      return { theme, body: kept.join('\n').trim() }
    }

    function NotesChevron() {
      return React.createElement(
        'svg',
        { className: 'dshDesktopNotesChevron', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        React.createElement('path', {
          d: 'M6 3.5 10.5 8 6 12.5',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        })
      )
    }

    /**
     * One version's release notes as a collapsible card, collapsed by default.
     * Notes come either inline (`notes`, from an update check) or from `load`,
     * which runs once when the card mounts so the collapsed header can show
     * the release's theme; a failed read only surfaces once the card is open.
     */
    function ReleaseNotesCard({ t, version, tag, tone, notes, url, load, openExternal }) {
      const [open, setOpen] = React.useState(false)
      const [state, setState] = React.useState(
        load ? { phase: 'loading' } : { phase: 'ready', notes: notes || '', url: url || '' }
      )
      const alive = React.useRef(true)

      const read = () => {
        if (!load) return
        setState({ phase: 'loading' })
        void Promise.resolve()
          .then(() => load())
          .then((value) => {
            if (alive.current) setState({ phase: 'ready', notes: value?.notes || '', url: value?.url || '' })
          })
          .catch((error) => {
            if (!alive.current) return
            // Read the message without instanceof: an IPC rejection can carry an
            // Error from another realm.
            const message = error && typeof error.message === 'string' ? error.message : ''
            setState({ phase: 'error', message: message || t('checkFailedUnknown') })
          })
      }

      React.useEffect(() => {
        alive.current = true
        read()
        return () => {
          alive.current = false
        }
      }, [])

      const { theme, body } = releaseNotesForDisplay(state.notes)
      const releaseUrl = state.url || url || ''
      const bodyId = `dsh-desktop-notes-${String(tone || 'release').replace(/[^\w-]/g, '')}-${String(version).replace(/[^\w-]/g, '-')}`
      const labels = { code: { copyLabel: t('copyCode'), copiedLabel: t('copiedCode') }, footnotes: t('footnotes') }
      const openLink = (href) => {
        void openExternal(href).catch((error) => {
          console.error('[about] unable to open link', error)
        })
      }

      let content
      if (state.phase === 'loading') {
        content = React.createElement('p', { className: 'dshDesktopNotesStatus' }, t('notesLoading'))
      } else if (state.phase === 'error') {
        content = React.createElement(
          'div',
          { className: 'dshDesktopNotesStatus', role: 'alert' },
          React.createElement('span', { className: 'dshDesktopNotesError' }, t('notesFailed', { message: state.message })),
          React.createElement('button', { type: 'button', className: 'dshDesktopAboutLink', onClick: read }, t('notesRetry'))
        )
      } else if (!body) {
        content = React.createElement('p', { className: 'dshDesktopNotesStatus' }, t('noReleaseNotes'))
      } else if (MarkdownText && MarkdownDelegateProvider) {
        content = React.createElement(
          MarkdownDelegateProvider,
          { openExternalLink: openLink },
          React.createElement(MarkdownText, { text: body, variant: 'compact', labels })
        )
      } else {
        // Older primitives without the Markdown renderer: plain text, never HTML.
        content = React.createElement('pre', { className: 'dshDesktopAboutReleaseNotes' }, body)
      }

      return React.createElement(
        'section',
        { className: 'dshDesktopNotes', 'data-open': open ? 'true' : 'false' },
        React.createElement(
          'div',
          { className: 'dshDesktopNotesHead' },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dshDesktopNotesToggle',
              'aria-expanded': open,
              'aria-controls': bodyId,
              onClick: () => setOpen(!open)
            },
            React.createElement(NotesChevron),
            React.createElement('span', { className: 'dshDesktopNotesTitle' }, t('updateLogTitle', { version })),
            tag ? React.createElement('span', { className: 'dshDesktopNotesTag', 'data-tone': tone || 'current' }, tag) : null,
            theme ? React.createElement('span', { className: 'dshDesktopNotesTheme' }, theme) : null
          ),
          releaseUrl
            ? React.createElement('button', {
                type: 'button',
                className: 'dshDesktopAboutLink',
                onClick: () => openLink(releaseUrl)
              }, t('viewRelease'))
            : null
        ),
        open
          ? React.createElement(
              'div',
              { id: bodyId, className: 'dshDesktopNotesBody', 'aria-busy': state.phase === 'loading' },
              content
            )
          : null
      )
    }

    function AboutSection(props) {
      const {
        t,
        readInfo,
        readReleaseNotes,
        checkUpdates,
        openExternal,
        assetUrl
      } = props
      const [info, setInfo] = React.useState(null)
      const [infoError, setInfoError] = React.useState(false)
      const [checking, setChecking] = React.useState(false)
      const [notice, setNotice] = React.useState('')
      const [updateResult, setUpdateResult] = React.useState(null)
      const [supportOpen, setSupportOpen] = React.useState(false)
      const alive = React.useRef(true)

      React.useEffect(() => {
        alive.current = true
        void Promise.resolve()
          .then(() => readInfo())
          .then((value) => {
            if (alive.current) setInfo(value)
          })
          .catch(() => {
            if (alive.current) setInfoError(true)
          })
        return () => {
          alive.current = false
        }
      }, [])

      const check = async () => {
        if (!alive.current) return
        setChecking(true)
        setNotice(t('checking'))
        setUpdateResult(null)
        try {
          const status = await checkUpdates()
          if (!alive.current) return
          if (status?.phase === 'available') {
            setNotice(t('available', { version: status.availableVersion || '' }))
            const releaseUrl = status.releaseUrl || ''
            setUpdateResult({
              version: status.availableVersion || '',
              notes: status.releaseNotes || '',
              url: releaseUrl
            })
          } else if (status?.phase === 'up-to-date') {
            setNotice(t('upToDate'))
          } else if (status?.phase === 'unsupported') {
            setNotice(t('unsupported'))
          } else if (status?.phase === 'error') {
            setNotice(t('checkFailed', {
              message: status.message || t('checkFailedUnknown')
            }))
          } else {
            setNotice(t('checkFinished'))
          }
        } catch (error) {
          if (!alive.current) return
          setNotice(t('checkFailed', {
            message: error instanceof Error && error.message
              ? error.message
              : t('checkFailedUnknown')
          }))
        } finally {
          if (alive.current) setChecking(false)
        }
      }

      const openRepository = () => {
        void openExternal(ABOUT_AUTHOR.repository).catch((error) => {
          console.error('[about] unable to open repository', error)
        })
      }

      const versions = info
        ? [
            [t('desktopVersion'), info.desktopVersion],
            [t('harnessVersion'), info.harnessVersion]
          ]
        : []

      return React.createElement(
        'section',
        { className: 'dshDesktopAbout' },
        React.createElement('h2', { className: 'dshDesktopAboutTitle' }, t('title')),
        React.createElement('p', { className: 'dshDesktopAboutIntro' }, t('intro')),
        React.createElement(
          'div',
          { className: 'dshDesktopAboutHero' },
          React.createElement('img', {
            className: 'dshDesktopAboutAvatar',
            src: assetUrl('author-avatar.png'),
            alt: t('avatarAlt'),
            width: 64,
            height: 64
          }),
          React.createElement(
            'div',
            { className: 'dshDesktopAboutIdentity' },
            React.createElement('strong', null, ABOUT_AUTHOR.name),
            React.createElement('span', { className: 'dshDesktopAboutLogin' }, `@${ABOUT_AUTHOR.login}`)
          ),
          React.createElement('button', {
            type: 'button',
            className: 'dshDesktopAboutButton',
            onClick: openRepository
          }, t('repository'))
        ),
        React.createElement(
          'div',
          { className: 'dshDesktopAboutCard' },
          React.createElement(
            'div',
            { className: 'dshDesktopAboutRows' },
            React.createElement(
              'div',
              { className: 'dshDesktopAboutRow' },
              React.createElement('span', { className: 'dshDesktopAboutLabel' }, t('author')),
              React.createElement('span', null, ABOUT_AUTHOR.name)
            ),
            React.createElement(
              'div',
              { className: 'dshDesktopAboutRow' },
              React.createElement('span', { className: 'dshDesktopAboutLabel' }, t('repository')),
              React.createElement('span', { className: 'dshDesktopAboutValue' }, 'LightyearXizIl/DSH-Desktop')
            ),
            React.createElement(
              'div',
              { className: 'dshDesktopAboutRow' },
              React.createElement('span', { className: 'dshDesktopAboutLabel' }, t('wechat')),
              React.createElement('code', { className: 'dshDesktopAboutCode' }, ABOUT_AUTHOR.wechat)
            ),
            ...versions.map(([label, value]) =>
              React.createElement(
                'div',
                { className: 'dshDesktopAboutRow', key: label },
                React.createElement('span', { className: 'dshDesktopAboutLabel' }, label),
                React.createElement('code', { className: 'dshDesktopAboutCode' }, value)
              )
            ),
            !info && !infoError
              ? React.createElement(
                  'div',
                  { className: 'dshDesktopAboutRow' },
                  React.createElement('span', { className: 'dshDesktopAboutLabel' }, t('desktopVersion')),
                  React.createElement('span', { className: 'dshDesktopAboutMuted' }, t('versionLoading'))
                )
              : null,
            infoError
              ? React.createElement(
                  'p',
                  { className: 'dshDesktopAboutError', role: 'alert' },
                  t('versionUnavailable')
                )
              : null
          )
        ),
        React.createElement(
          'div',
          { className: 'dshDesktopAboutActions' },
          React.createElement('button', {
            type: 'button',
            className: 'dshDesktopAboutButton dshDesktopAboutPrimary',
            disabled: checking,
            onClick: () => { void check() }
          }, checking ? t('checking') : t('checkUpdates')),
          React.createElement('button', {
            type: 'button',
            className: 'dshDesktopAboutButton',
            onClick: () => setSupportOpen(true)
          }, t('appreciate')),
          // Beside the buttons rather than on its own line: an empty status row
          // left a gap twice the page's card spacing above the release notes.
          React.createElement('p', {
            className: 'dshDesktopAboutNotice',
            role: 'status',
            'aria-live': 'polite'
          }, notice)
        ),
        updateResult
          ? React.createElement(ReleaseNotesCard, {
              key: `available-${updateResult.version}`,
              t,
              version: updateResult.version,
              tag: t('newTag'),
              tone: 'new',
              notes: updateResult.notes,
              url: updateResult.url,
              openExternal
            })
          : null,
        info && typeof readReleaseNotes === 'function'
          ? React.createElement(ReleaseNotesCard, {
              key: `current-${info.desktopVersion}`,
              t,
              version: info.desktopVersion,
              tag: t('currentTag'),
              tone: 'current',
              load: readReleaseNotes,
              openExternal
            })
          : null,
        React.createElement(
          Modal,
          {
            open: supportOpen,
            onClose: () => setSupportOpen(false),
            title: t('appreciateTitle'),
            closeLabel: t('close')
          },
          React.createElement('p', { className: 'dshDesktopSupportIntro' }, t('appreciateIntro')),
          React.createElement(
            'div',
            { className: 'dshDesktopSupportGrid' },
            React.createElement(
              'figure',
              { className: 'dshDesktopSupportCode' },
              React.createElement('img', {
                src: assetUrl('qrcode-wechat.png'),
                alt: t('wechatQrAlt'),
                draggable: false,
                width: 220,
                height: 220
              }),
              React.createElement('figcaption', null, t('wechatPay'))
            ),
            React.createElement(
              'figure',
              { className: 'dshDesktopSupportCode' },
              React.createElement('img', {
                src: assetUrl('qrcode-alipay.png'),
                alt: t('alipayQrAlt'),
                draggable: false,
                width: 220,
                height: 220
              }),
              React.createElement('figcaption', null, t('alipay'))
            )
          ),
          React.createElement('p', { className: 'dshDesktopSupportThanks' }, t('thanks'))
        )
      )
    }

    const inject = ['slots', 'locale', 'remote.session', 'sessions', 'uiWorkspace']
    function apply(ctx) {
      const aboutT = ctx.locale.bind(ABOUT_NS)
      ctx.effect(
        () => ctx.locale.register(ABOUT_NS, { zh: ABOUT_ZH, en: ABOUT_EN }),
        'dsh-desktop-client-ui: About dictionaries'
      )
      ctx.effect(() => {
        const id = 'dsh-desktop-preset-toolbar-style'
        if (document.getElementById(id)) return
        const style = document.createElement('style')
        style.id = id
        style.textContent = `
          html, body, body * {
            scrollbar-width:none !important;
            scrollbar-color:transparent transparent !important;
            -ms-overflow-style:none !important;
          }
          html::-webkit-scrollbar, body::-webkit-scrollbar, body *::-webkit-scrollbar,
          html::-webkit-scrollbar-corner, body::-webkit-scrollbar-corner, body *::-webkit-scrollbar-corner {
            display:none !important;
            width:0 !important;
            height:0 !important;
          }
          html::-webkit-scrollbar-button, body::-webkit-scrollbar-button, body *::-webkit-scrollbar-button {
            display:none !important;
          }
          html, body { overflow-x:clip !important; }
          body > #root { max-width:100vw; overflow-x:clip; }
          :root { --dsh-page-title-top-spacing:56px; }
          /* Top-level page titles align with the sidebar brand row. Keep
             conversation chrome and detail/dialog headers in their own layout. */
          [data-plugin-panel] > header[data-window-drag] {
            padding-top:var(--dsh-page-title-top-spacing);
          }
          [data-dsh-preset-heading] { display:flex; align-items:center; flex-wrap:wrap; gap:12px 16px; }
          [data-dsh-preset-heading] h2 { margin:0; }
          [data-dsh-preset-actions] { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:auto; }
          [data-dsh-preset-actions] button { white-space:nowrap; }
          [data-dsh-preset-search] { margin-bottom:16px; }
          [data-dsh-preset-search] input[type=search] {
            box-sizing:border-box; width:100%; min-width:0; height:36px;
            border:1px solid var(--dsw-alias-border-l2); border-radius:10px;
            background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-primary);
            padding:0 12px; font:inherit; font-size:13px;
          }
          [data-dsh-preset-search] input[type=search]::placeholder { color:var(--dsw-alias-label-caption); }
          [data-dsh-preset-search] input[type=search]:focus-visible {
            outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px;
            background:var(--dsw-alias-bg-base);
          }
          .dshDesktopAbout { box-sizing:border-box; display:flex; flex-direction:column; gap:14px; width:100%; max-width:760px; color:var(--dsw-alias-label-primary); }
          .dshDesktopAboutTitle { margin:0; font-size:18px; font-weight:600; line-height:26px; }
          .dshDesktopAboutIntro { margin:0; color:var(--dsw-alias-label-tertiary); font-size:13px; line-height:20px; }
          .dshDesktopAboutHero { box-sizing:border-box; display:flex; align-items:center; gap:14px; padding:18px; border:1px solid var(--dsw-alias-border-l2); border-radius:16px; background:var(--dsw-alias-bg-layer-1); }
          .dshDesktopAboutAvatar { flex:none; width:64px; height:64px; border:1px solid var(--dsw-alias-border-l2); border-radius:16px; object-fit:cover; background:var(--dsw-alias-bg-layer-2); }
          .dshDesktopAboutIdentity { display:flex; flex-direction:column; gap:3px; min-width:0; flex:1; }
          .dshDesktopAboutIdentity strong { font-size:16px; line-height:24px; }
          .dshDesktopAboutLogin { color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
          .dshDesktopAboutCard { box-sizing:border-box; padding:16px 18px; border:1px solid var(--dsw-alias-border-l2); border-radius:16px; background:var(--dsw-alias-bg-layer-1); }
          .dshDesktopAboutRows { display:flex; flex-direction:column; }
          .dshDesktopAboutRow { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding:10px 0; border-bottom:1px solid var(--dsw-alias-border-l2); font-size:13px; line-height:20px; }
          .dshDesktopAboutRow:last-child { border-bottom:0; }
          .dshDesktopAboutLabel { flex:none; color:var(--dsw-alias-label-tertiary); }
          .dshDesktopAboutValue { min-width:0; text-align:right; overflow-wrap:anywhere; }
          .dshDesktopAboutCode { max-width:60%; padding:1px 6px; border-radius:5px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-family:var(--ds-font-family-code,monospace); font-size:12px; overflow-wrap:anywhere; }
          .dshDesktopAboutMuted { color:var(--dsw-alias-label-tertiary); }
          .dshDesktopAboutError { margin:8px 0 0; color:var(--dsw-alias-state-error-primary); font-size:12px; line-height:18px; }
          .dshDesktopAboutActions { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
          .dshDesktopAboutButton { box-sizing:border-box; height:36px; padding:0 16px; border:1px solid var(--dsw-alias-border-l3); border-radius:18px; background:transparent; color:var(--dsw-alias-label-primary); font:inherit; font-size:13px; font-weight:500; cursor:pointer; }
          .dshDesktopAboutButton:hover:not(:disabled) { background:var(--dsw-alias-interactive-bg-hover); }
          .dshDesktopAboutButton:disabled { cursor:default; opacity:.55; }
          .dshDesktopAboutButton:focus-visible { outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px; }
          .dshDesktopAboutPrimary { border-color:transparent; background:var(--dsw-alias-button-primary-fill); color:var(--dsw-alias-label-primary-foreground); }
          .dshDesktopAboutPrimary:hover:not(:disabled) { background:var(--dsw-alias-button-primary-hover); }
          .dshDesktopAboutNotice { flex:1 1 180px; min-width:0; margin:0 0 0 4px; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
          .dshDesktopAboutLink { padding:0; border:0; background:transparent; color:var(--dsw-alias-state-business-primary); font:inherit; font-size:12px; cursor:pointer; }
          .dshDesktopAboutLink:hover { text-decoration:underline; text-underline-offset:3px; }
          .dshDesktopAboutLink:focus-visible { outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px; }
          .dshDesktopAboutReleaseNotes { box-sizing:border-box; max-height:260px; margin:0; padding:12px; overflow:auto; border-radius:10px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-family:inherit; font-size:12px; line-height:19px; white-space:pre-wrap; overflow-wrap:anywhere; }
          .dshDesktopNotes { box-sizing:border-box; border:1px solid var(--dsw-alias-border-l2); border-radius:14px; background:var(--dsw-alias-bg-layer-1); overflow:hidden; }
          .dshDesktopNotesHead { display:flex; align-items:center; gap:12px; min-height:46px; padding:0 16px 0 6px; }
          .dshDesktopNotesToggle { display:flex; flex:1; align-items:center; gap:8px; min-width:0; height:46px; padding:0 8px; border:0; border-radius:10px; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }
          .dshDesktopNotesToggle:focus-visible { outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:-4px; }
          .dshDesktopNotesChevron { flex:none; width:14px; height:14px; color:var(--dsw-alias-label-tertiary); transition:transform .18s ease, color .18s ease; }
          .dshDesktopNotesToggle:hover .dshDesktopNotesChevron { color:var(--dsw-alias-label-secondary); }
          .dshDesktopNotes[data-open='true'] .dshDesktopNotesChevron { transform:rotate(90deg); }
          .dshDesktopNotesTitle { flex:none; font-size:13px; font-weight:600; line-height:20px; }
          .dshDesktopNotesTag { flex:none; padding:0 7px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary); font-size:11px; font-weight:500; line-height:18px; }
          .dshDesktopNotesTag[data-tone='new'] { background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%,transparent); color:var(--dsw-alias-state-business-primary); }
          .dshDesktopNotesTheme { min-width:0; overflow:hidden; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; text-overflow:ellipsis; white-space:nowrap; }
          .dshDesktopNotesBody { box-sizing:border-box; max-height:380px; padding:2px 22px 18px; overflow:auto; border-top:1px solid var(--dsw-alias-border-l2); animation:dshDesktopNotesIn .18s ease; }
          @keyframes dshDesktopNotesIn { from { opacity:0; transform:translateY(-4px); } }
          .dshDesktopNotesStatus { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin:14px 0 0; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; }
          .dshDesktopNotesError { color:var(--dsw-alias-state-error-primary); }
          /* Release notes typography: sections get an accent bar, each item leads
             with its bold name in the primary label colour, and the prose sits a
             step quieter with roomy line height. Scoped under the About section so
             conversation Markdown keeps its own look. */
          .dshDesktopAbout .dshDesktopNotesBody h1,
          .dshDesktopAbout .dshDesktopNotesBody h2 { display:flex; align-items:center; gap:8px; margin:18px 0 8px; color:var(--dsw-alias-label-primary); font-size:13px; font-weight:600; line-height:20px; }
          .dshDesktopAbout .dshDesktopNotesBody h1::before,
          .dshDesktopAbout .dshDesktopNotesBody h2::before { content:''; flex:none; width:3px; height:13px; border-radius:2px; background:var(--dsw-alias-state-business-primary); }
          .dshDesktopAbout .dshDesktopNotesBody h3 { margin:14px 0 6px; color:var(--dsw-alias-label-secondary); font-size:12px; font-weight:600; line-height:18px; }
          .dshDesktopAbout .dshDesktopNotesBody ul,
          .dshDesktopAbout .dshDesktopNotesBody ol { margin:0; padding-left:18px; }
          .dshDesktopAbout .dshDesktopNotesBody li { margin:7px 0; color:var(--dsw-alias-label-secondary); font-size:12.5px; line-height:21px; }
          .dshDesktopAbout .dshDesktopNotesBody li::marker { color:var(--dsw-alias-label-tertiary); }
          .dshDesktopAbout .dshDesktopNotesBody li li { margin:4px 0; }
          .dshDesktopAbout .dshDesktopNotesBody li > ul { margin-top:4px; }
          .dshDesktopAbout .dshDesktopNotesBody strong { color:var(--dsw-alias-label-primary); font-weight:600; }
          .dshDesktopAbout .dshDesktopNotesBody p { margin:8px 0; color:var(--dsw-alias-label-secondary); font-size:12.5px; line-height:21px; }
          .dshDesktopAbout .dshDesktopNotesBody li > p { margin:0; }
          .dshDesktopAbout .dshDesktopNotesBody code { padding:1px 5px; border-radius:5px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font-family:var(--ds-font-family-code,monospace); font-size:11.5px; }
          @media (prefers-reduced-motion: reduce) {
            .dshDesktopNotesChevron { transition:none; }
            .dshDesktopNotesBody { animation:none; }
          }
          .dshDesktopSupportIntro { margin:0 0 14px; color:var(--dsw-alias-label-secondary); font-size:13px; line-height:20px; }
          .dshDesktopSupportGrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
          .dshDesktopSupportCode { display:flex; flex-direction:column; align-items:center; gap:8px; margin:0; padding:12px; border:1px solid var(--dsw-alias-border-l2); border-radius:14px; background:var(--dsw-alias-bg-layer-1); }
          .dshDesktopSupportCode img { display:block; width:100%; max-width:220px; height:auto; aspect-ratio:1; object-fit:contain; user-select:none; -webkit-user-drag:none; }
          .dshDesktopSupportCode figcaption { color:var(--dsw-alias-label-primary); font-size:13px; font-weight:600; line-height:20px; }
          .dshDesktopSupportThanks { margin:14px 0 0; color:var(--dsw-alias-label-tertiary); font-size:12px; line-height:18px; text-align:center; }
          @media (width <= 560px) {
            .dshDesktopAboutHero { align-items:flex-start; flex-wrap:wrap; }
            .dshDesktopAboutHero .dshDesktopAboutButton { width:100%; }
            .dshDesktopSupportGrid { grid-template-columns:1fr; }
          }
        `
        document.head.appendChild(style)
        return () => style.remove()
      })
      ctx.slots.inject('sidebar.brand.mark', () =>
        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.inject('conversation.hero.brand.mark', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark' }, DesktopBrandMark)
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, DesktopBrandName)
            yield ctx.slots.register(
              { name: 'conversation.hero.brand.mark' },
              ConversationBrandMark
            )
          })
        )
      )
      ctx.slots.inject('sidebar.right.tab.document.unpreviewable', () =>
        ctx.slots.register({
          name: 'sidebar.right.tab.document.unpreviewable',
          id: 'desktop-open-local',
          inject: () => ({
            openWorkspacePath: (path) => ctx.remote.session.openWorkspacePath({ path })
          })
        }, OpenUnpreviewableFile)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-delete-session',
          order: 900,
          inject: () => ({
            deleteSession: (sessionId) => {
              const workspace = ctx.get('uiWorkspace')
              if (!workspace) throw new Error('Workspace navigation is unavailable')
              return workspace.deleteSession(sessionId)
            }
          })
        }, DeleteSessionMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-open-session-folder',
          order: 800,
          inject: () => ({
            openInFinder: (sessionId) => {
              const cwd = ctx.get('sessions').list.getSnapshot().byId[sessionId]?.cwd
              if (!cwd) throw new Error('Session workspace directory is unavailable')
              return window.dshDesktop.openInFinder(cwd)
            }
          })
        }, OpenSessionFolderMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-unread-session',
          order: 350
        }, UnreadSessionMenuItem)
      )
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register({
          name: 'settings.section',
          id: 'about',
          order: 100,
          label: () => aboutT('nav'),
          locale: ABOUT_NS,
          inject: () => ({
            t: aboutT,
            readInfo: () => window.dshDesktop.getAboutInfo(),
            readReleaseNotes: typeof window.dshDesktop?.getReleaseNotes === 'function'
              ? () => window.dshDesktop.getReleaseNotes()
              : undefined,
            checkUpdates: () => window.dshDesktop.checkForUpdates(),
            openExternal: (url) => window.dshDesktop.openExternal(url),
            assetUrl: ABOUT_ASSET
          })
        }, AboutSection)
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
