# DSH Desktop development guide

This guide covers local development, validation, patch maintenance, and target-native packaging. It is part of the [documentation index](README.md). For the runtime design, see [Architecture](architecture.md). For releases, see the [release runbook](release-runbook.md).

## Prerequisites

- Node.js 22 or later
- npm
- Windows x64 (published target); macOS on Apple Silicon or Intel can still run the source build scripts

This baseline pins `@deepseek-ai/dsh@0.2.1-rc.4`. Windows packages run Harness in Electron Node mode, while macOS uses an Electron UtilityProcess. Both are independent of the Node.js version used to run development commands.

## Local setup

```bash
git clone https://github.com/LightyearXizIl/DSH-Desktop.git
cd DSH-Desktop
npm ci
npm run dev
```

`npm ci` runs the repository's `postinstall` hook. It reapplies the tracked `patch-package` patches, installs DSH brand assets into the pinned Harness frontend, and installs Electron.

Development builds use the separate application name `DSH Desktop Dev` and the separate user-data directory `dsh-desktop-dev`, so they do not reuse production DSH Desktop data. Multiple development worktrees still share that development profile by default; avoid running them at the same time when testing profile, plugin, migration, or recovery changes.

To run another worktree concurrently, set a distinct `DSH_DEV_PROFILE` directory name and unused loopback ports using `DSH_DEV_HARNESS_PORT` and `DSH_DEV_MOBILE_PORT`. For example, on macOS:

```bash
DSH_DEV_PROFILE=dsh-desktop-dev-workbench DSH_DEV_HARNESS_PORT=43132 DSH_DEV_MOBILE_PORT=43133 npm run dev
```

On PowerShell, set the same names through `$env:DSH_DEV_PROFILE`, `$env:DSH_DEV_HARNESS_PORT` and `$env:DSH_DEV_MOBILE_PORT` before `npm run dev`. The profile must be a directory name, separate from `dsh-desktop`; ports must be distinct integers from 1024 to 65535. These overrides are ignored by production builds. Defaults remain `dsh-desktop-dev`, Harness port 43130 and mobile port 43128.

## Validation

Run the core checks before submitting a change:

```bash
npm test
npm run typecheck
npm run build
```

Static checks are not a substitute for runtime verification. Changes that affect startup, profiles, plugins, native dialogs, updates, mobile access, or packaging should also be exercised through the corresponding real application flow.

To exercise the Cloudflare-to-Pinggy fallback without disrupting the machine's network, start the development app with Cloudflare failure simulation enabled:

```bash
DSH_TUNNEL_FORCE_PINGGY=1 npm run dev
```

Then enable the temporary public tunnel from the phone connection screen. The tunnel status should report `pinggy`, and the generated URL should use a Pinggy hostname. This variable affects only the process started from that command; omit it on the next launch to restore the normal Cloudflare-first behavior.

Automatic fallback still happens only when Cloudflare fails to start. If a Cloudflare pairing link is already showing but the phone cannot open it, use **扫码打不开？换一条线路** / **Can't open? Try another link** on the pairing page to switch to Pinggy.

## Project map

```text
src/main/                 Electron main process and application orchestration
src/main/runtime/         Harness process lifecycle and diagnostics
src/main/state/           Profile consistency, repair, recovery, and Safe Mode
src/main/mobile/          Paired phone bridge and optional Cloudflare tunnel
src/main/update/          Installed-build update state and lifecycle
src/preload/              Narrow renderer-to-main IPC and desktop UI seams
src/shared/               Shared contracts and desktop menu definitions
packages/                 Bundled desktop support packages
patches/                  Reproducible patches for the pinned Harness packages
build/                    Packaged HTML, icons, loaders, and Harness entry files
scripts/                  Build, signing, metadata, and target verification tools
test/                     Unit and source-contract regression coverage
.github/workflows/        Inherited CI workflows (not part of the current release flow; see the release runbook)
```

## Built-in theme

The Liquid Glass theme source lives in `packages/dsh-desktop-theme/src/client/`.
Edit those TypeScript modules, not the generated
`packages/dsh-desktop-theme/lib/client.js`. Run `npm run theme:build` after
client source changes; `npm run build` and the test pre-hooks also rebuild it.
Theme CSS must preserve upstream layout geometry and use Harness design tokens
and controls instead of global border-radius overrides. The host-owned update
and About dialogs are also part of the theme contract and must use the same
progress percentage for copy, ARIA values and the visual fill. Check visual
changes in all eight light/dark × mica/compatibility × fluid/wallpaper
combinations; the procedure is in the theme package README under
[Visual audit](../packages/dsh-desktop-theme/README.md#visual-audit).

## Maintaining upstream patches

The desktop product intentionally reuses the upstream Harness UI. Desktop-specific provider onboarding, preset transfer, model selection, workspace, branding, and layout changes are captured under `patches/` rather than stored as untracked edits in `node_modules`.

When upgrading Harness:

1. Install the intended upstream version.
2. Verify the current Settings, Credentials, Provider Directory, workspace, and preset contracts.
3. Reapply or rewrite each desktop customization.
4. Regenerate the relevant `patch-package` patches.
5. Run the full automated suite.
6. Start the real app and exercise every affected user flow.

## Packaging

Harness includes architecture-specific native dependencies. Build each installer on the operating system and architecture where it will run.

Routine development tasks do not include packaging by default. Stop after the
source change, focused regression, type check, production build, and any
required real application verification. Run the commands below only when the
user explicitly asks for an installer or a formal release artifact; do not
treat a changelog or release checklist as implicit packaging approval.

```bash
# macOS Apple Silicon, on an Apple Silicon Mac or runner
npm run package:mac:arm64

# macOS Intel, on an Intel Mac or runner
npm run package:mac:x64

# Windows x64 NSIS installer, on a Windows x64 machine or runner
npm run package:win
```

Windows packaging must reuse the Electron distribution already installed in the
repository. `npm run package:win` invokes electron-builder without an explicit
`electronDist`, so electron-builder may re-download the same Electron archive
even when `node_modules/electron/dist` is present. For local Windows builds,
check that the local distribution matches `package.json`, then pass it to the
same packaging adapter:

```powershell
# Verify that the local Electron distribution is the pinned version.
Get-Content node_modules/electron/dist/version

# Reuse node_modules/electron/dist instead of downloading Electron again.
npm run build
node scripts/electron-builder-windows.mjs --win --x64 --publish never `
  "--config.electronDist=$PWD/node_modules/electron/dist"
```

Do not use the local distribution when its version differs from the locked
`electron` dependency. A version mismatch must fail the build or be resolved
explicitly; never substitute an older or newer Electron to avoid a download.
CI may use its own Electron cache, but it must still package the locked
version.

Do not invoke `electron-builder --win` from macOS or Linux for a distributable Windows package. The target verification scripts intentionally reject host/target mismatches.

For local unsigned development packages, use the corresponding `package:dev:*` command. Packages run Harness and package commands through the packaged Electron runtime (a utility process and the Helper in Node mode on macOS, the executable in Node mode on Windows); no standalone `node_modules/node` may be present under `app.asar.unpacked`. Verify the packaged native-module, pnpm and Harness smokes, then install the final installer and start it once before handoff. Office preparation is included in dev, build and test: it fetches hash-locked native Python and wheels into `.build/office-runtime`, outside ASAR, and ships no second Node runtime. See [Office runtime](office-runtime.md). The locked Electron 43.0.0 must remain compatible with the native loader: `scripts/verify-target.mjs` fails packaging when Electron in Node mode cannot load it, and changing Electron still requires a new Windows package qualification. Before packaging, `node scripts/probe-electron-node-runtime.mjs` boots Harness from the repository through Electron Node mode with a disposable `DSH_HOME` and checks an authenticated HTTP response; run it before every Windows package.

Releases are built locally on Windows x64 and published as GitHub Release assets; the steps are in the [release runbook](release-runbook.md). A successful local build is not a release until the installer, `latest.yml` and blockmap are uploaded.

## Contribution hygiene

- Never include real API keys in issues, logs, screenshots, fixtures, or test data.
- Preserve unrelated worktree changes.
- Keep temporary research, local reports, and internal working documents under the ignored `doc/` directory.
- Update all localized README files when changing user-visible facts.
