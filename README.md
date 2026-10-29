<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="DSH Desktop logo" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop</strong> is a community Windows desktop client for DeepSeek Harness, independently maintained by NullPointer.<br />
  Open-source repository: <a href="https://github.com/LightyearXizIl/DSH-Desktop">LightyearXizIl/DSH-Desktop</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

<p align="center"><strong>Use official DeepSeek models or mainstream third-party providers, manage portable Agent presets, continue Harness sessions from your phone, and turn source material into editable PPTX decks.</strong></p>

DSH Desktop packages the local DeepSeek Harness experience as an installed desktop application. It starts Harness automatically, keeps profiles, plugins, workspaces, model settings, and sessions outside the application directory, and opens the full Harness interface as soon as the local runtime is ready.

> [!IMPORTANT]
> DSH Desktop is an early preview built on the rapidly evolving `@deepseek-ai/dsh@0.2.1-rc.4`. The Windows x64 installer is an unsigned community build, so Windows SmartScreen may warn on first launch. This project is not an official DeepSeek product.

## Download

Download the latest `dsh-desktop-windows-x64-setup.exe` from [GitHub Releases](https://github.com/LightyearXizIl/DSH-Desktop/releases). Versions marked **Pre-release** are for early adopters and may be incompatible with some community plugins.

Installed builds check GitHub Releases for updates shortly after startup and every six hours. When a new version is available, DSH Desktop asks first and shows that release's changelog; the download starts only after you agree, and installation begins only when you choose **Restart and install**. You can also check manually from **Settings → About**, or skip one version without hiding future releases.

## What DSH Desktop adds

DeepSeek Harness already provides an agent runtime and a web UI. DSH Desktop adds the desktop host:

- Starts and stops Harness automatically, without a separate CLI or browser tab
- Adds and manages project workspaces through the native folder picker
- Supports official DeepSeek models and mainstream third-party model providers
- Imports and exports complete custom Agent presets as portable [`.dshpreset` archives](docs/preset-packages.md), checking name conflicts and warning about trust before installation
- Generates editable PPTX decks from source material through the built-in PPT mode
- Bundles Python and Office libraries to create and check DOCX, PPTX and XLSX files offline
- Keeps profiles, plugins, workspaces, sessions and model settings across application upgrades
- Detects Harness startup or frontend plugin failures, writes diagnostics to `harness.log` and offers guided recovery
- Provides a non-destructive Safe Mode that temporarily blocks third-party plugins
- Lets a paired phone continue sessions over the local network or an optional temporary public tunnel
- Ships the Liquid Glass theme (mica and compatibility modes), a startup animation and optional local-model auto-start
- Checks for desktop updates in the app and lets you decide whether to download and install them

## PPT generation

Click **PPT**, choose a template and describe what you want. The built-in catalog contains **16 templates and 192 layouts** and produces editable PPTX files. Template previews are shown in English; generated content can be Chinese or English with matching font settings, and the preview language does not decide the output language.

PPT stays preinstalled, and its automatic instructions apply only to sessions where the PPT button is selected. Templates, validation and reference sources are described in the [PPT runtime notes](packages/ppt-runtime/README.md).

## Phone access

Choose **Connect phone…** from the `Harness` menu and scan the pairing QR code.

- On Wi-Fi, scanning connects immediately.
- An internet tunnel also requires the 6-digit pairing password shown on the computer. By default it is a temporary password kept in memory for 5 minutes; a durable password is generated on this computer only after you opt in from the **Connect phone** window.

Harness itself always runs on a random `127.0.0.1` port; phone access goes through a separate pairing bridge. Cloudflare Quick Tunnel is the usual long-lived path. Free Pinggy is the fallback when Cloudflare is unavailable (for example in mainland China) and expires after about 60 minutes. When the desktop disconnects, the phone session ends.

If Cloudflare fails to start, Pinggy is tried. If a Cloudflare pairing link is showing but the phone cannot open it, choose **Can't open? Try another link** to switch to Pinggy.

## Safe Mode and recovery

If a third-party plugin breaks startup or rendering, DSH Desktop combines runtime and frontend evidence to identify the plugin and opens a guided recovery page.

Choose **Restart in Safe Mode…** from the `Harness` menu to start an isolated profile containing only the official core bundles. Third-party plugins from the normal profile are blocked, while agents, sessions, model settings and workspaces stay available. From the Safe Mode banner you can uninstall the selected plugin or return to normal startup. The recovery page also checks for compatible plugin updates, and Safe Mode can upgrade several plugins at once.

If the normal interface cannot open, you can also start with `--safe-mode`, for example in PowerShell:

```powershell
& "$env:LOCALAPPDATA\Programs\DSH Desktop\DSH Desktop.exe" --safe-mode
```

(Replace the path if you installed to a different directory.)

## Local data and security

- The Harness web UI runs only on a random loopback port.
- The renderer has no Node.js access and runs with context isolation and sandboxing.
- Webviews, untrusted in-app navigation and unexpected permission requests are blocked.
- External web links open in the system browser.
- Profiles and sessions live in Electron's per-user application data directory, not in the installation directory.
- Phone access requires a short-lived pairing token. Wi-Fi scanning connects directly; an internet tunnel also requires the password shown on the computer.

## Platform support

| Platform | Package | Status |
| --- | --- | --- |
| Windows x64 | Unsigned NSIS installer | Supported |
| macOS | Build scripts kept in source; no installers published | Not published |
| Windows ARM64 / Linux | — | Not supported |

Harness contains platform-native dependencies, so every installer must be built on its target operating system and architecture.

## Development and architecture

The full project documentation starts at the [documentation index](docs/README.md). The most used documents:

- [Development guide](docs/development.md) — local setup, validation, patch maintenance and native packaging
- [Architecture](docs/architecture.md) — startup, persisted data, security boundaries, recovery, phone access and updates
- [Release runbook](docs/release-runbook.md) — versioning, packaging and GitHub Release publication
- [Preset packages](docs/preset-packages.md) — the portable Agent preset contract

Run `npm test`, `npm run typecheck` and `npm run build` before submitting a change, and exercise the affected application flow. Never include real API keys in issues, logs, screenshots or test data.

## Related projects

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — the official DeepSeek agent framework that provides this app's runtime and web UI.
- [dsh-market](https://github.com/dsh-market/dsh-market) — the DeepSeek Harness community plugin market for browsing, installing and updating plugins inside Harness.

## License

DSH Desktop is open source under the [MIT License](LICENSE).

DeepSeek Harness and its dependencies remain subject to their own upstream licenses and trademark rules. DSH Desktop is an independent community desktop application and is not affiliated with DeepSeek.
