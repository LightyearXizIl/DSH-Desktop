# Windows 平台说明

本文是 [文档总览](../README.md) 的平台子文档。Windows x64 是 DSH Desktop 当前唯一发布安装包的平台。打包与发布步骤见 [发布手册](../release-runbook.md)。

## 运行方式

- Harness 由打包后的 Electron 可执行文件以 Node 模式启动（`ELECTRON_RUN_AS_NODE=1`），Profile 修复、市场基线、generation 安装以及 `.desktop-bin` 下的 `node` / `pnpm` shim 也使用同一个运行时。安装包里不带独立的 Node。
- 运行时通过 Harness 的 `node-addon-require-builtin` 访问 Node 内部能力，它只接受编译时适配的 Electron 版本，所以 Electron 锁定在 `43.0.0`，`scripts/verify-target.mjs` 会在打包前用同一个 Electron 实际调用 loader。更换 Electron 必须重新验证 Windows 打包后的 Harness 启动。
- `build/harness-node-entry.mjs` 在 Windows 启动路径中加载 `windows-hidden-console.mjs`，相关入口作为 `extraResources` 进入安装包，保证 Harness 及其子进程不弹出控制台窗口。

## 窗口与标题栏

- 窗口使用隐藏标题栏。preload 标记 `<html data-windows-titlebar>` 并设置 `--dsh-windows-titlebar-height`（40 DIP），由 Harness 的 AppFrame 绘制并负责拖动标题行。
- “应用 / 编辑”菜单栏位于侧栏切换按钮旁，点击后由主进程弹出原生菜单。应用菜单包含连接手机、重启 Harness、安全模式、日志、会话导出、视图与缩放、检查更新、关于和退出；编辑命令以按键事件发送，让编辑器自己的撤销历史接收。
- Desktop 自己的本地页面（恢复页、导入页等）没有 AppFrame，菜单栏放在标题行左侧，并提供拖动条。
- Liquid Glass 主题下，展开状态的“收起侧边栏”按钮位于品牌行最左侧。侧栏的玻璃底和悬停倾斜都画在侧栏列的 `::before` 玻璃板上，侧栏列本身没有 `transform` 或 `backdrop-filter`，所以倾斜时标题栏上 `position: fixed` 的按钮和侧栏内的悬停提示不会移位。
- 回归：`test/windows-titlebar.test.ts`、`test/windows-menu-bar.test.ts`、`test/windows-sidebar-collapse.test.ts`。DPI、缩放、最大化等视觉表现需要在真实 Windows 上检查。

## 打包要点

- 必须在 Windows x64 上打包，验证脚本会拒绝宿主与目标不一致的组合。
- 复用 `node_modules/electron/dist`，通过 `--config.electronDist` 传给 `scripts/electron-builder-windows.mjs`，不重新下载 Electron；本地版本与锁定版本不一致时停止。
- JavaScript 依赖从 `app.asar` 加载；`asarUnpack` 只保留操作系统需要直接加载或执行的文件（原生模块、`spawn-helper`、ripgrep、LibreOffice 引擎、sherpa-onnx 平台包、PPT 运行时）。
- Python 及 Office 资源放在 `resources/office-runtime`，位于 ASAR 之外，详见 [Office 运行时](../office-runtime.md)。

## 安装器

- NSIS 安装器（非一键模式），允许用户选择安装目录，创建桌面与开始菜单快捷方式，`requestedExecutionLevel` 为 `asInvoker`。
- 固定的安装器模板先把应用解压到同级的暂存目录，再关闭旧应用、把旧目录改名为备份并提升暂存目录；解压或改名失败会恢复上一版安装。用户另选目录时视为独立安装，不会自动卸载原目录。修改该模板时要保留用户选择的安装目录。
- 安装器不得修改 Windows 安全设置（`test/release.test.ts` 会检查 `build/installer.nsh` 不含 Defender 排除、HKLM 写入或提权执行）。

## 签名与更新

- 安装包不做代码签名，首次运行时 SmartScreen 可能提示。
- 更新元数据 `latest.yml` 与 blockmap 由 electron-builder 生成，必须作为 GitHub Release 资产上传。
- 自动更新不校验代码签名：`package.json` 中 `win.verifyUpdateCodeSignature` 为 `false`，且不声明 `signtoolOptions.publisherName`，打包后的 `resources/app-update.yml` 不含 `publisherName`。更新包完整性依赖 `latest.yml` 中的 `sha512` 与 GitHub 的 HTTPS 下载；`test/release.test.ts` 锁定这两项配置。
- 0.0.3 安装包自带的 `app-update.yml` 仍会校验前身的签名，因此 0.0.3 需要手动安装一次 0.0.4，见 [已知遗留问题](../README.md#已知遗留问题)。

## 平台验收清单

涉及 Windows 路径、进程或安装行为的改动，需要在 Windows 上实际验证：标准用户权限、含空格的安装路径、旧版本升级、symlink / junction 与物理路径解析、终端退出（ConPTY）以及安装后首次启动。
