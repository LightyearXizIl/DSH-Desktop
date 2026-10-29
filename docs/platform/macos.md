# macOS 平台说明

本文是 [文档总览](../README.md) 的平台子文档。DSH Desktop 当前**不发布** macOS 安装包，但源码仍保留 macOS 的运行路径与打包脚本（`package:mac:*`、`package:dev:mac:*`、DMG 背景生成、公证脚本），以下记录这些代码的行为，便于今后恢复 macOS 构建。

- 在 macOS 上，Harness 运行在带 Node 能力的 Electron UtilityProcess 中，包命令通过应用的 Helper 以 Node 模式执行，同样不携带独立的 Node。
- 打包后的 macOS 应用拿不到 Node 内部的 ESM loader，所以 `cordis-plugin-loader`、`dsh-client-modules` 补丁以及 `dsh-desktop-hmr-fallback` 插件只在打包态生效，开发态跑通不代表打包后可用。

## 窗口按钮与布局

对照官方 `dsh-v0.1.7-rc.2` 的 `apps/desktop/src/preload-platform.ts`、`apps/desktop/src/main.ts`、`packages/client/ui-layout/src/client/AppFrame.module.css`：

- preload 在客户端挂载前声明 `html[data-platform=darwin]`。
- 使用官方 16/18 原生按钮坐标；不再混用原来的 9px 高度和旧侧栏顶部 padding。
- 收起后由 Harness 隐藏整个侧栏并挂载 `shell.leading`；官方变量为主内容保留顶部和左侧空间。
- main 在加载、进入/退出全屏时通知 preload，映射为 `data-fullscreen`，让官方 CSS 在全屏时回收按钮留白。

平台标记同时影响 shortcuts 环境检测。DSH Desktop 没有官方 `keyboard`/快捷键设置原生桥，因此显式声明 `data-dsh-desktop-web-shortcuts=true`，通过 `dsh-client-shortcuts` 最小补丁继续使用已有 Web 键盘与存储适配器。没有该标记的官方宿主仍要求自己的原生桥；这不是通用的错误吞掉或自动降级。若未来接入完整原生快捷键桥，应同时删除标记与补丁。

不额外复制官方侧栏/顶栏布局，不改变 Windows 的标题栏行为。行为回归覆盖 preload 首次标记、无 document root 时的全屏状态、退出全屏、监听清理和官方/自有宿主快捷键环境区分。

验证：全量 152 个测试文件 / 1261 项通过；typecheck 通过；两项补丁在独立临时依赖目录中 npm ci 后重放成功；真实 macOS Dev 启动、侧栏收起及展开正常，收起后顶部控件与标题留白已确认。屏幕共享指示器覆盖了原生按钮区域，按钮本体及全屏过渡尚未完成视觉验收；未验证最终安装包。

`npm run build` 与 `git diff --check` 通过。

### 完整采用官方窗口材质

macOS 窗口采用 `hiddenInset`、`trafficLightPosition: { x: 16, y: 18 }`、`vibrancy: sidebar`、`visualEffectState: active` 和透明窗口背景。显示时保持原生材质；隐藏/最小化时改用官方深浅底色，恢复时重新挂接 sidebar 材质，避免透明闪烁。主题同步不再把可见 macOS 窗口覆盖成不透明底色。移除旧固定拖拽覆盖条，由官方 `data-window-drag` 标记的行负责拖拽。

新增 backdrop 状态转换测试；完整回归 153 个文件 / 1263 项、typecheck 通过。

## DMG 安装背景（DMG artwork）

The DMG uses a 540 × 380 background with one arrow, no installation caption, and the existing application icon. Finder draws the application and Applications shortcut; their icon size is 85 and their centers are (154, 150) and (386, 150). The arrow is 16 × 28 at (270, 150). Finder may display its own shortcut badge.

### Source and generation

- `build/dmg/install-bg.png`: supplied background, scaled proportionally to width 540 and vertically centered within the existing canvas. The source file remains intact; the canvas clips the small vertical overflow.
- `build/dmg/arrow.png`: supplied arrow, rendered once into the background.
- `scripts/render-dmg-background.swift`: AppKit renderer for the 1080 × 760 Retina representation.
- `scripts/prepare-dmg-background.cjs`: generates 540 × 380 (72 DPI) and 1080 × 760 (144 DPI) representations and combines them into `.build/dmg/background.tiff`.

The macOS `beforePack` hook prepares the artwork for release and development packaging, including direct electron-builder invocations in CI. It uses Node and the macOS build tools (`swiftc`, `sips`, `tiffutil`); no extra package dependency is required. Other platforms skip generation. Failures stop packaging rather than using stale artwork.

For artwork inspection alone, run `node scripts/prepare-dmg-background.cjs` on macOS. Normal builds continue to use the existing `npm run package:mac:arm64` or `npm run package:mac:x64` commands. A `--prepackaged` build skips the pack phase, so run the preparation command first in that case.

### Verification

Mount the generated DMG in Finder and check the canvas size, one arrow, icon positions, absence of the caption, and the Applications link. Eject previous test volumes first to avoid resolving a background alias against an older mounted copy. Check a drag installation in a disposable test environment before release.

Local design HTML, test DMGs and temporary tools are excluded from Git. The accepted visual baseline is the Finder v5 preview; custom HTML logo artwork and CSS shadows are not part of this change. Application UI, icon assets, signing, notarization, publishing and compression settings remain unchanged.
