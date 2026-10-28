# Harness 0.2.1-rc.4 兼容升级

## 基线与范围

本次只升级 Harness 依赖，不修改 Desktop 版本号。根 manifest 和锁文件从
`0.2.1-rc.2` 同步到 npm 已发布的 `0.2.1-rc.4`：219 个直接 Harness 依赖
固定为同一版本，锁文件中 304 个 `@deepseek-ai/dsh*` 包版本一致。

升级时 npm 的 `latest` dist-tag 仍指向 `0.2.1-rc.2`，`0.2.1-rc.4` 位于
`next`。`git ls-remote` 当时未显示 `dsh-v0.2.1-rc.4` tag，因此本文以 npm
发布包而不是上游 tag 作为兼容依据。Desktop 的依赖、锁文件、补丁和测试直接
对照 npm 上的 rc.2 与 rc.4 原始 tarball。

## 上游变化与适配

补丁审计比较了 28 个 Harness 补丁包涉及的 65 个文件。52 个文件在 rc.2 与
rc.4 之间没有变化；13 个文件存在内容变化，其中多数是版本号或构建标识。
以下变化需要实际合并：

- Conversation 增加 View 标签折叠与 More 菜单、`conversation.input.accessory`
  和 `extensionZone`，并调整 composer 的附件、dock 与 hero 结构。Desktop 保留
  `conversation.hero.modeActions`、`conversation.hero.dock`、输入附件接缝和
  `desktop.workbench.frame`，同时采用上游的新样式和渲染结构。
- Sidebar 新增面板固定/More 菜单、`sidebar.panellist.actions` 及
  `useEntryPins` / `useEntryActions` 注入。Desktop 保留 `sidebar.quickSwitcher`
  和宿主标记，并同时声明上游的新 slot 与钩子。
- Workspace 的空白会话复用会跳过与请求 preset 不一致的会话；Desktop 的
  可见性过滤、workbench 复用过滤和 session starter 仍在该判断中生效。
- `dsh-api-remotes` 的会话描述符、`dsh-client-modules` 的构建标识、
  `dsh-llm-deepseek` 的额度/认证/权限分类等差异按 rc.4 原始包重新生成补丁。

本次没有修改启动入口、Profile 投影、宿主 fallback 或 Safe Mode 的解析规则。
普通 Profile 仍从 Profile 入口解析插件；明确允许的宿主 peer fallback 和 Safe
Mode 安装 anchor 保持不变。

## 补丁迁移

- 28 个 Harness 补丁全部改用 rc.4 文件名，并以 rc.4 原始 tarball 重新生成。
- `dsh` 补丁继续保留 CLI 启动失败的退出语义，并把 Desktop 宿主包加入
  Harness manifest。生成时发现旧脚本曾把 `bin.js` 的差异误写进
  `package.json` hunk；已修正为两个独立、可重放的 hunk，补丁后的 manifest
  通过 JSON 解析。
- Conversation 补丁继续包含 Desktop 的 `heroModeClusterCss` 常量；缺少该
  常量时真实客户端会引用未定义标识符。
- 5 个非 Harness 补丁（Cordis loader、LibreOffice Kit、pi-ai、node-pty、
  undici）保持原版本和行为，总数仍为 33 个补丁。

## 验证结果

2026-10-27，Windows x64：

- `npm ci` 的 postinstall 重放 33/33 补丁并安装品牌资源；随后 Electron 下载
  因网络请求失败中止。本机缓存中的
  `electron-v43.0.0-win32-x64.zip` 与官方 SHA-256 一致，校验后解压恢复
  Electron 43.0.0。不能把本次 `npm ci` 整体记为通过。
- `npm run typecheck`、`npm run build`、`git diff --check` 通过。
- 完整 `npm test`：221 个测试文件，217 个通过、4 个跳过；2200 项通过、
  8 项跳过。包含真实 Harness 子进程、Safe Mode、插件加载失败、Office
  转换、PPT 运行时、会话删除和 workbench 导航回归。
- `node scripts/verify-target.mjs win32 x64` 通过：Electron 43.0.0（Node
  24.17.0）可以加载 Harness 原生 loader。
- `node scripts/probe-electron-node-runtime.mjs` 通过：Electron Node 模式
  使用临时 Profile 启动 Harness，认证后 HTML 返回 HTTP 200。
- 补丁迁移中修正了两个真实回归：Conversation 的未定义 CSS 常量，以及
  `dsh` manifest 被补丁破坏为非法 JSON。两者都有对应测试或真实子进程覆盖。

本次测试夹具同步了 rc.4 的两项变化：workspace 空白会话复用测试先注册
workbench 绑定；sidebar 渲染测试提供上游新增的 `useEntryPins` 和
`useEntryActions`。测试变动只补齐当前契约，没有放宽产品断言。

## 未完成验收

- 未执行真实 Electron 主窗口的完整人工 UI 验收，也未发送真实模型请求。
- 未构建、安装或升级正式 Windows/macOS 安装包；`verify-target` 和运行时
  probe 不等于安装包验收。
- macOS arm64/x64、Windows 标准用户权限、含空格安装路径、junction 和安装后
  升级仍需按发布流程单独验证。
- 第三方市场插件的逐个安装/激活及所有 slot 的多贡献项视觉组合未在本次执行。
