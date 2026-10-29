# Harness 升级记录

本文是 [文档总览](../README.md) 的 Harness 子文档，汇总历次 `@deepseek-ai/dsh` 升级中的破坏性变化、适配方式和仍然有效的经验。当前每个补丁的职责见 [补丁清单](patch-inventory.md)。

DeepSeek Harness 官方仓库：<https://github.com/deepseek-ai/deepseek-harness>。Desktop 版本号与 Harness 版本号独立维护，下文的版本号都指 Harness。

## 升级的固定流程

1. 安装目标版本，核对 npm 发布包（而不是上游 tag 或本地 checkout）作为兼容依据。
2. 对每个补丁取三份输入：旧版原始包、旧版打补丁后、新版原始包。先合并行为，再按新版原始包重新生成补丁。
3. 判断补丁去留的标准是“上游是否已原生提供该能力”，而不是“补丁还能不能套上去”。
4. 同步根 manifest、锁文件、宿主插件的 peer 区间；预发布版本的 caret 只在同一 `major.minor.patch` 内匹配，跨版本时要追加区间。
5. 完整 `npm ci`（不能加 `--ignore-scripts`：它会跳过补丁重放、品牌资源和 Electron 安装，测试仍可能全绿而应用起不来）、`npm run typecheck`、`npm run build`、完整 `npm test`、`git diff --check`。
6. `node scripts/verify-target.mjs win32 x64` 与 `node scripts/probe-electron-node-runtime.mjs` 证明 Electron Node 模式能加载 Harness。
7. 真实 Electron 窗口验收受影响的流程。静态检查与 probe 都不等于安装包验收。

## 版本时间线

### 0.2.1-rc.4（当前）

- 219 个直接依赖与锁文件中 304 个 `@deepseek-ai/dsh*` 包统一到 rc.4。升级时 npm 的 `latest` 仍指向 rc.2，rc.4 位于 `next`，因此以 npm 发布包为准。
- 28 个 Harness 补丁按 rc.4 原始包重新生成；对比 65 个补丁目标文件，52 个无变化。
- 合并的上游变化：Conversation 新增 View 标签折叠、More 菜单、`conversation.input.accessory` 与 `extensionZone`；Sidebar 新增面板固定、`sidebar.panellist.actions` 与 `useEntryPins` / `useEntryActions` 注入；Workspace 的空白会话复用会跳过 preset 不一致的会话。
- 迁移中修复了两个真实回归：Conversation 补丁引用了未定义的 CSS 常量；`dsh` 补丁把 `bin.js` 的差异写进了 `package.json` hunk，破坏了 manifest 的 JSON 结构。
- 之后为玻璃主题新增 `dsh-client-ui-layout` 补丁，补丁总数变为 34。

### 0.2.1-rc.2

- 上游新增 DeepSeek Search/Fetch API 开关与临时模型徽标，两个新 bundle 随官方闭包进入，不提升为直接依赖；默认仍使用 Messages 搜索和 HTTP 抓取。
- 稳定性修复（下文“稳定性修复”一节）在此基线上完成，新增 `dsh-settings` 写入校验补丁。
- 已知限制：`dsh-experimental-inspector` 仍拒绝 `globalThis.fetch` 访问器，与某些会改写 fetch 的插件冲突。

### 0.2.1-rc.1

- Remote 元数据从数组改为按方法名索引的对象，codec 改用 Zod；会话删除同时适配 host、remote client 和浏览器聚合描述符。
- 会话创建改为串行 claim 流程；在 resume/create 拿到 handle 后再登记 Desktop 的所有权。
- JSONL persistence 改为命名导出；坏 metadata 的列举容错已由上游实现，删除了旧的容错 hunk。
- 上游退役 schedule bundle（用其 `dropRetiredBundles` 迁移），`dsh-invariants` 与 `dsh-subagent-in-process-driver` 不再作为独立依赖。
- 新增 `@earendil-works/pi-ai` 与 `node-pty` 两个运行时补丁，对齐官方 Desktop 的运行时补丁策略（不能直接把官方 1.1.0 的 pi-ai 补丁改名套在 1.3.0 上）。
- Office/PPT 改为通过 `workingDirectory` 服务读取当前目录：切换目录后产物写入新目录，授权根仍来自 sandbox policy，当前目录必须位于授权根内（含 realpath 后的软链接检查）。
- LibreOffice Kit 统一到 0.1.5，逐页预览补丁随之迁移。

### 0.2.0-rc.2

- 13 个补丁原样重放，11 个上下文失效后用三方合并迁移。`@deepseek-ai/dsh` 补丁修改 `package.json`，生成时要用 `--exclude '^$'` 覆盖 patch-package 的默认排除规则。
- 删除 `dsh-client-ui-model-selection` 补丁：上游已原生提供模型搜索（超过 4 个模型时显示，不再匹配服务商名称）。

### 0.1.7-rc.1 / rc.2

- 旧的 `dsh-agent-presets` 目录预设被 Profile 组合条目和 `dsh-agent-preset-registry` 取代。Desktop 在启动普通 Profile 前，把 `$DSH_HOME/.agent-presets/<id>/agent.cordis.yml` 中有效的插件列表写入 `profiles/web/cordis.patch.yml`，首次写入前备份整个旧目录和原 patch 文件，原目录保留；之后只追加尚未迁移的 ID。
- 删除 `dsh-client-ui-directory-picker-native` 补丁：上游客户端原生读取 `globalThis.__DSH_DIRECTORY_PICKER__`，preload 直接暴露这个窄接口即可。
- generation 校验改为对约定的宿主单例核对当前 DSH 入口提供的精确解析结果；`@deepseek-ai/dsh` 只有 `bin` 没有可导入根入口时，检查包内真实存在的 bin 文件，不把 `require.resolve()` 失败当成缺包。
- 插件的 Harness peer 版本范围不含当前版本时改为告警并继续尝试加载（`dsh-app-boot`、`dsh-plugin-manager` 补丁），告警不等于加载成功。
- Windows 标题栏：preload 标记 `<html data-windows-titlebar>` 并设置 40 DIP 的 `--dsh-windows-titlebar-height` 后，由 Harness 的 AppFrame 绘制标题行；Desktop 的“应用 / 编辑”菜单栏放在侧栏切换按钮旁，由主进程弹出原生菜单。
- 暂停使用 `dsh-client-ui-settings-account` 账号插件（后在 Desktop 0.0.1 恢复账号入口，只跳过首次欢迎遮罩）。
- 新增 `undici` 补丁：HTTP/2 下 `controller.rawHeaders` 是对象，旧 Fetch 要求扁平数组，否则丢失 Content-Type / Content-Encoding，gzip 数据会被当成 JSON。

### 0.1.6-alpha.2

- 接入 Profile resolution generation、`dsh-plugin-manager`、`dsh-hmr`、`dsh-mcp-resources` 和 PTC runtime 依赖闭包。
- Plugin Manager 的安装/删除通过可选的 `profileBundlePackageBackend` 接缝转入 Desktop generation：安装在 staging 校验并 peer 验证后发布不可变 generation，失败时回滚 `desired.json` 与 Profile projection。
- Electron 固定为 `43.0.0`：当时的 `node-addon-require-builtin` 不支持 Electron 43.4.0 的运行时指纹。之后任何 Electron 升级都需要重新做 Windows 打包验证。

### 0.1.5-rc.1 / rc.2

- 依赖从仓库内的本地 tarball 改为 npm 发布包（精确版本 + lockfile integrity），删除了约 8 MB 的 vendored 包，补丁也不再携带构建机绝对路径。
- 会话持久化改为 handle 所有权模型（`create` / `open(id, 'read' | 'write')` / `flush` / `stat` / `list`），删除会话整条补丁链按新 API 重写：删除走与写入相同的独占路径和跨进程锁，只删除对应日志文件，未 materialize 的会话直接拒绝删除。
- `replace` 类 surfaceOp 字段从 `start/end` 改为 `startSeq/endSeq`，内置 PPT 插件随之修正。
- **启动入口契约变化**：CLI 改为 `if (import.meta.main) await runCli()` 并导出 `runCli`。`build/harness-node-entry.mjs` 是以模块方式导入 bin.js 的，若不显式调用 `runCli()`，进程会静默 `exit 0`，界面只显示 “Harness stopped unexpectedly (exit code 0)”。入口现在在导入后显式调用 `runCli()`。
- **connection 路由的 inject 归属**：`ctx.connection.rpc.handle()` 会在读取 `connection` 的那个 Context 上注册 webServer 路由，必须放在 `ctx.inject(["webServer"], ...)` 的作用域里，否则整棵插件树加载失败。
- CSS 补丁改为“只追加”：保留上游样式和 class map，只追加 Desktop 规则和新键，避免上游重新打包后 class 静默失配。

### 0.1.2 系列（alpha.1 → rc.1）

- 主机 API 引入浏览器 token 认证：每个 Host 进程生成随机启动令牌，只有 `GET /?token=...` 能换取绑定 Host 的签名 cookie（HttpOnly、SameSite=Strict，HMAC 密钥在 `$DSH_HOME/.credentials.yaml`）。`harness-runtime` 从 `dsh web:` 输出行捕获令牌，主窗口首次导航带令牌；手机桥接自行走一遍换取流程。`scripts/verify-harness-auth.mjs` 覆盖 401 → 303 → 200。
- 手机桥接迁移到 `<namespace>/<method>` 端点与 `/api/remote.mux` 多路复用流（订阅 `$events` 与 `workspace/follow`，应答走 `$events/result`），历史改为 `session/page` 游标分页。
- 品牌改由 `dsh-desktop-client-ui` 占用 `sidebar.brand.mark` 等 slot，预设导入导出迁入 `dsh-desktop-preset-transfer` 插件。
- 教训：`scripts/install-brand-assets.mjs` 改为按标签和 JSON 键匹配上游前端资源，目标缺失时响亮失败；新增桌面插件必须同时写入 Profile patch、`@deepseek-ai/dsh` 依赖补丁和 `package.json`（`test/desktop-plugin-closure.test.ts` 锁定这一不变量），否则整棵插件树失败。

## 稳定性修复

基于线上故障分类在 0.2.1-rc.2 基线上完成，结论仍然有效：

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| F01 | 关闭模型视觉开关后留下图片限制字段，下次启动报 `text-only catalog model ... cannot declare image request limits` | 同次更新删除 `imagePixelBudget`、`imageMaxBytes`；已保存的矛盾配置可恢复 |
| F02 | splash 加载、窗口销毁与退出竞态 | 保留首次失败的原始 cause；区分 `ERR_ABORTED`；renderer 不可用时提供原生恢复入口 |
| F03 | 错误的模型地址导致启动失败且无法修改 | UI 与持久化边界双重校验（`dsh-settings` 补丁），启动失败时可通过不依赖 Harness 的入口修正 |
| F04 | workspace 与凭据文件的格式拦截 | 移除 Desktop 的静态拦截，与上游运行时保持一致 |
| F05 | 安装包依赖闭包、原生资源与解析路径 | 补齐打包门禁；EPERM 保留原始 cause，不通过扩大宿主 fallback 或全局 `NODE_PATH` 绕过 |
| F06 | 旧 workflow 插件与预设引用缺失的包 | 按归属可撤销地停用并保留原文，不重新塞入旧实现 |
| F07 | Windows renderer 创建进程失败（`launch-failed` 18 / 49） | 仅完成分类与恢复，根因未解决 |
| F08 | Harness 非预期 `exit 0` 与 OOM | 需要可关联的运行标识与首个 fatal，根因未解决 |

配置恢复的边界：恢复前停止 runtime，持文件锁复核内容，创建独立的 `0600` 原文件备份后原子替换；拒绝越界路径、symlink 和并发修改；未知损坏不自动清空。

## 平台相关记录

- macOS 窗口铬栏、DMG 背景等内容见 [macOS 平台说明](../platform/macos.md)。
- Windows 打包、标题栏与安装器行为见 [Windows 平台说明](../platform/windows.md)。
