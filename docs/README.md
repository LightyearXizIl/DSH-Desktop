# DSH Desktop 项目文档

这是 DSH Desktop 的主文档：先给出项目全貌，再通过“文档地图”指向各份子文档。所有子文档的开头都会链接回本页。

## 1. 项目概况

| 项目 | 内容 |
| --- | --- |
| 定位 | 面向 Windows 的 DeepSeek Harness 社区桌面客户端；Electron 外壳，复用 Harness 的 Agent 运行时与 Web UI，不另建运行时或业务前端 |
| 作者 | NullPointer（GitHub [@LightyearXizIl](https://github.com/LightyearXizIl)） |
| 仓库 | [LightyearXizIl/DSH-Desktop](https://github.com/LightyearXizIl/DSH-Desktop) |
| 当前版本 | Desktop `0.0.5`（2026-10-30 发布）；Harness `@deepseek-ai/dsh@0.2.1-rc.4`；Electron `43.0.0` |
| 发布平台 | Windows x64，未签名 NSIS 安装包，发布在 GitHub Releases |
| 许可证 | MIT（见根目录 `LICENSE`） |

版本号以根 `package.json` 为准，Desktop 与 Harness 的版本号独立维护。每个版本的改动见根目录 [CHANGELOG.md](../CHANGELOG.md)。

## 2. 文档地图

```text
README.md（及 5 个语言版本）     面向用户的项目介绍
CHANGELOG.md                    版本更新日志
RELEASE_NOTES.md                GitHub Release 正文的写作风格参考
AGENTS.md（及子目录 AGENTS.md） 开发约束，供人和 AI 代理共同遵守
docs/
├── README.md                   ← 本页：主文档
├── architecture.md             运行架构
├── development.md              开发指南
├── release-runbook.md          发布手册
├── office-runtime.md           Office 运行时
├── preset-packages.md          .dshpreset 包格式
├── engineering/                工程规范
├── harness/                    Harness 升级与补丁
├── features/                   功能说明
├── platform/                   平台说明
├── workbench-*.md              随产品分发的工作台规范（6 份，路径固定）
└── images/                     README 使用的图片
```

### 核心

| 文档 | 内容 |
| --- | --- |
| [运行架构](architecture.md) | 进程拓扑、启动流程、持久化数据、窗口与 IPC 安全、Profile 与插件恢复、Safe Mode、手机访问边界、更新、崩溃上报、主题定制边界 |
| [开发指南](development.md) | 环境、本地启动、验证命令、项目目录、内置主题、上游补丁维护、打包 |
| [发布手册](release-runbook.md) | 版本号、更新日志、Windows 打包、验收、`gh release create` 发布、签名现状 |

### 工程规范 `engineering/`

| 文档 | 内容 |
| --- | --- |
| [代码规范设计说明](engineering/code-standards.md) | `AGENTS.md` 规则的分层与取舍、已知现状、工具落地计划 |
| [Patch 与 Plugin 规范](engineering/patch-plugin-contract.md) | 按能力选择扩展方式、slot 契约、插件可卸载性、补丁最小范围、组合验证 |
| [源码与构建产物规范](engineering/source-build-contract.md) | 唯一维护入口、生成物进入构建链路、安装顺序不成环 |

### Harness `harness/`

| 文档 | 内容 |
| --- | --- |
| [补丁清单](harness/patch-inventory.md) | 35 个补丁的职责、回归入口、移除条件 |
| [Harness 升级记录](harness/upgrade-history.md) | 升级固定流程、各版本破坏性变化、稳定性修复 F01–F08 |

### 功能 `features/`

| 文档 | 内容 |
| --- | --- |
| [PPT 功能总览](features/ppt.md) | 组成、预览链路、已定位的转换根因、模板来源；下设 [个人 PPT 模板](features/ppt-personal-templates.md) 与 [转模板能力审查](features/ppt-conversion-review.md) |
| [Word / Excel 案例模板](features/office-templates.md) | 7 个外显案例、交互、执行路径、业务方法来源 |
| [Office 运行时](office-runtime.md) | 离线 Python 与 LibreOffice Kit、资源位置、PPT 模式的技能调用策略、Word 原生模板写入 |
| [手机连接与配对](features/mobile-pairing.md) | 扫码直连与隧道 PIN、Cloudflare / Pinggy、未来的中转方案 |
| [从网页版导入数据](features/web-import.md) | 首次启动导入 `~/.dsh`、复制清单、与官方 Desktop 的对照 |
| [工作台](features/workbenches.md) | 身份、状态、模式与会话归属、市场安装边界、规范文档 |
| [Preset 包格式](preset-packages.md) | `.dshpreset` 结构、导入导出流程、在线 Skill 接口 |
| [本地模型自动启动](features/local-model.md) | `local-model.json` 配置与 Strata 启动行为 |
| Liquid Glass 主题（含推理等级滑条） | 见 [`packages/dsh-desktop-theme/README.md`](../packages/dsh-desktop-theme/README.md) |
| 启动动画 | 见 [`packages/dsh-startup-screen/README.md`](../packages/dsh-startup-screen/README.md) |
| 影像生成（生图，以及 GrsAI 生视频与文本生成） | 见 [`packages/dsh-image-generation/README.md`](../packages/dsh-image-generation/README.md) |
| PPT 运行时包 | 见 [`packages/ppt-runtime/README.md`](../packages/ppt-runtime/README.md) |

### 平台 `platform/`

| 文档 | 内容 |
| --- | --- |
| [Windows 平台说明](platform/windows.md) | Electron Node 模式、标题栏与菜单、打包要点、安装器、签名与更新 |
| [macOS 平台说明](platform/macos.md) | 当前不发布；保留的窗口铬栏与 DMG 背景代码说明 |

## 3. 架构速览

```text
Electron Main ──启动──> Harness 子进程（Electron Node 模式）──> Web UI @ 127.0.0.1:随机端口
     │                                                              ▲
     ├─ 主窗口（沙箱、Context Isolation）── preload 窄 IPC ──────────┘
     ├─ userData/harness = DSH_HOME（Profile、会话、设置、插件）
     ├─ 手机配对 Bridge（局域网 / Cloudflare / Pinggy 隧道）
     └─ 更新管理（GitHub Releases）、崩溃上报、本地模型启动器
```

- 启动：单实例锁 → 中立的 `launch-root` → 启动页 → Profile 一致性检查与修复 → 启动 Harness → 健康检查通过后载入主窗口 → 手机 Bridge 与更新管理。
- 插件加载分五个阶段验收：Profile 组合 → 后端加载 → 客户端发现 → HTML 引导 → 客户端激活，前一阶段成功不能代替后一阶段。
- Safe Mode 使用只含官方核心 bundle 的隔离 Profile，用户数据保持可用。
- 详细内容见 [运行架构](architecture.md)。

## 4. 代码结构

| 目录 | 职责 |
| --- | --- |
| `src/main/` | 主进程：生命周期、`runtime/`（Harness 进程与本地模型）、`state/`（Profile、迁移、恢复、Safe Mode）、`update/`、`mobile/`、`desktop-service/`（崩溃上报与更新检查） |
| `src/preload/` | 窄 IPC 桥、Windows 标题栏与菜单、更新与关于弹窗 |
| `src/shared/` | 跨进程数据契约与纯逻辑 |
| `packages/` | 12 个内置包与 1 个遗留目录（见下表） |
| `patches/` | 35 个可重放补丁（见 [补丁清单](harness/patch-inventory.md)） |
| `build/` | Profile 组合层 `*.patch.yml`、Harness 入口、恢复页 / 安全模式页 / 启动页 HTML、图标、NSIS 脚本 |
| `scripts/` | 构建、打包门禁、PPT / Office / 主题生成器、验证脚本 |
| `test/` | 约 230 个测试文件（行为、契约与真实子进程回归） |

| 内置包 | 作用 |
| --- | --- |
| `dsh-desktop-client-ui` | 占用 Harness 品牌 slot 的 Desktop 品牌组件与界面接缝 |
| `dsh-desktop-theme` | Liquid Glass 主题（云母与兼容模式）与设置页 |
| `dsh-startup-screen` | Harness 启动动画 |
| `dsh-desktop-onboarding` | 首次启动提示：测试声明、项目介绍和模型设置入口 |
| `dsh-desktop-workbenches` | 工作台宿主、市场与导航 |
| `dsh-desktop-office` | Word / Excel 案例与业务方法 |
| `ppt-runtime`（`dsh-ppt`、`dsh-ppt-composer`） | PPT 制作、模板与个人模板 |
| `dsh-image-generation` | 影像生成：生图，以及 GrsAI 生视频与文本生成（默认关闭） |
| `dsh-desktop-market-installer` | dsh-market 插件市场安装入口 |
| `dsh-desktop-preset-transfer` | `.dshpreset` 导入导出路由 |
| `dsh-desktop-log-bridge` | 把 Harness 运行时日志桥接到 `harness.log` |
| `dsh-desktop-hmr-fallback` | 打包态缺少 Node 内部 loader 时的配置监听兜底 |
| `dsh-plugin-gis` | 只剩一个遗留的 `client/client.js.map`，未被依赖或加载 |

## 5. 开发约定速查

完整规则在根目录 `AGENTS.md` 和各子目录的 `AGENTS.md`，最常用的几条：

- 版本号独立维护；升级 Harness 不改 Desktop 版本；每次发版写 CHANGELOG 并同步 GitHub Release 正文。
- 日常开发不打包；只有明确要求时才运行 `package:*`。
- Windows 打包复用 `node_modules/electron/dist`，不重新下载 Electron。
- 提交前：`npm test`、`npm run typecheck`、`npm run build`、`git diff --check`。仓库没有 lint / format 脚本。
- 不暴露通用 IPC、不放宽 renderer 权限；宿主插件只用 `--dsw-alias-*` 主题变量，文案通过 `ctx.locale` 同时提供中英文。

## 6. 已知遗留问题

以下是代码中仍然残留的、来自本项目前身的内容。本次整理只改文档，没有动代码，这些问题保留待处理：

| 问题 | 位置 | 影响 |
| --- | --- | --- |
| 崩溃报告上传到前身的服务地址 | `src/main/desktop-service/service.ts` 的 `SERVICE_URL`、`desktop-service/index.ts` 的确认弹窗文案、`scripts/configure-rollout.mjs` | 用户同意后，报告会发往本项目不运营的服务器 |
| 工作台在线市场依赖前身的服务 | `packages/dsh-desktop-workbenches/catalog.mjs`（`DEFAULT_CATALOG_URL`）、`client.js`（`WORKBENCH_MARKET_REPO`、`DEVELOPMENT_*_URL`）、`submission-status.mjs`（`MARKET_REPOSITORY`）、`scripts/build-workbench-guide.mjs`、`docs/workbench-*.md` | 市场目录、投稿状态与规范链接指向外部服务 |
| 首次启动引导与修复提示中的链接 | `packages/dsh-desktop-onboarding/client.js`（`officialSiteUrl`、GitHub 链接）、`src/main/repair-agent.ts`（源码链接） | 界面上会显示前身的官网与仓库地址 |
| 恢复页、安全模式页的社区入口 | `build/plugin-recovery.html`、`build/safe-mode.html`、`build/community-wechat-qr.png`、`scripts/recovery-ui-smoke.ts` | 页面上显示前身的微信群二维码与 Discord |
| 包元信息 | 根 `package.json` 的 `author`、`homepage`、`repository`、`bugs`；`packages/dsh-image-generation/package.json`、`packages/ppt-runtime/{core,adapter}/package.json` 的 `repository` | 元信息指向前身仓库 |
| 继承的 CI 与签名工具 | `.github/workflows/`、`.github/scripts/`、`scripts/sign-windows-unpacked.mjs`、`scripts/jsign-windows-hook.mjs`、`scripts/electron-builder-windows.mjs` 中的 Jsign 分支 | 依赖本项目没有的签名硬件、镜像仓库与通知 Webhook，不在当前发布流程中使用 |
| 测试断言绑定前身的官网 | `test/release.test.ts` 中 “routes stable downloads through the website” 要求 README 链接前身官网 | README 已去掉该链接，此用例会失败，需要同步修改测试 |
| 版权声明 | 根 `LICENSE`、`packages/dsh-desktop-theme/LICENSE`、`packages/dsh-image-generation/LICENSE` | MIT 许可要求保留原版权声明，不能直接删除；根 `LICENSE` 已追加本项目的版权行 |
| 0.0.3 原生启动页导航验收报 `UnknownVizError` | 开发环境 | 尚未解决，0.0.4 未重新验证 |

除前身残留外，当前还有这些已知问题：

| 问题 | 位置 | 影响 |
| --- | --- | --- |
| Liquid Glass 的“modal caption”用例失败 | `test/desktop-theme.test.ts` 中 “covers the caption under modals and glazes the surfaces the audit found bare” | 用例仍在找 0.0.4 样式审计前的右侧停靠区选择器 `[data-dsh-desktop-float] [data-sidebar-right-panel] [data-dockkit-host='dock']`；全量 `npm test` 因此固定有这一项失败，需要按现行样式更新断言 |
| 部分电脑上插件市场激活失败 | `dshmarket` 客户端 | 根因未确认（本机全新 Profile、含中文和空格的数据路径都正常）；0.0.5 起安装器会保留入口并提供“重启 Harness / 移除插件市场”，需要对方 `harness.log` 中含 `dsh-market` 的行才能继续定位 |
| 打包审批集成测试在 Windows 上失败 | `test/generation-build-approval.integration.test.js` | Git Bash 自带的 `tar` 把 `C:` 解析为远程主机；全量 `npm test` 因此固定有这一项失败，与产品代码无关 |
| 0.0.3 无法自动更新到 0.0.4 | 0.0.3 安装包自带的 `app-update.yml` | 仍校验前身发行者的签名，会拒绝未签名的 0.0.4；用户需手动安装一次，之后可正常自动更新 |
| 轨迹“助手”角色标签对比度偏低 | 上游 Harness 样式 | 10px 紫色小标签约 2.3～2.8:1，只能靠打包生成的类名定位，主题没有覆盖 |
| 影像生成的 GrsAI 未做真实付费请求 | `packages/dsh-image-generation/` | 接口按文档和本机模拟服务验证；对话内不预览视频，视频不支持参考图、首尾帧和参考音频 |

## 7. 当前进展（2026-10-30）

接手开发前先看这一节，再看 [CHANGELOG.md](../CHANGELOG.md) 的最新条目。

- **分支**：0.0.4 与 0.0.5 的改动都在 `feat/liquid-glass` 上开发，已快进合并到 `main`；新工作从 `main` 开分支。
- **发布**：GitHub Release `v0.0.5` 已发布并标记为 Latest，注释标签指向提交 `add3ecc`（现已在 `main` 上）。资产为安装包、`.blockmap` 和 `latest.yml`，安装包 SHA-256 与 CHANGELOG 记录一致。
- **打包版验收方式**：在 `dist/win-unpacked` 的副本上把数据目录改为独立名称后启动（同长度替换 `app.asar` 里的 userData 名），不运行安装程序，避免覆盖本机正式安装和 `dsh-desktop` 数据。
- **未执行的验收**：安装程序本身的安装与覆盖升级、全新机器安装、真实模型请求、真实 GrsAI Key 的付费生成、macOS 构建。
- **主题实测方法**：Liquid Glass 在 8 种组合下的检查方式见 [`packages/dsh-desktop-theme/README.md`](../packages/dsh-desktop-theme/README.md) 的 “Visual audit” 一节。

## 8. 文档维护规则

- 新文档放进对应的子目录，并在开头链接回本页、在本页“文档地图”中登记。
- 以下路径被测试或脚本引用，**不要移动或改名**：`docs/architecture.md`、`docs/development.md`、`docs/release-runbook.md`、`docs/preset-packages.md`、`docs/office-runtime.md`、`docs/workbench-*.md`（6 份）。
- 6 个语言的 README 要一起改。`test/readme-parity.test.ts` 会检查每份都包含当前 Harness 版本、`DOCX`、`PPTX`、`XLSX`、`--safe-mode`、`Cloudflare Quick Tunnel`、`NSIS`、`docs/development.md`、`docs/architecture.md`，并检查上述文档中的相对链接都能找到文件。
- 只改文档时，检查差异、链接和命令的真实性即可，不需要启动应用或重装依赖。
- 临时调研、本地报告和内部工作记录放在被忽略的 `doc/` 目录，不进入 `docs/`。
