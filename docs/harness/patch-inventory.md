# 补丁清单

本文是 [文档总览](../README.md) 的 Harness 子文档，列出 `patches/` 目录下全部 34 个 `patch-package` 补丁的职责、回归入口和移除条件。补丁的选型与维护规则见 [Patch 与 Plugin 规范](../engineering/patch-plugin-contract.md) 和 `patches/AGENTS.md`；升级历史见 [Harness 升级记录](upgrade-history.md)。

- 基线：`@deepseek-ai/dsh@0.2.1-rc.4`（219 个直接 Harness 依赖、锁文件中 304 个 `@deepseek-ai/dsh*` 包版本一致），Electron `43.0.0`。
- 组成：29 个 Harness 补丁 + 5 个非 Harness 补丁。
- 补丁随 `npm ci` 的 `postinstall`（`patch-package`）重放。每次升级 Harness 都必须对照“旧版原始包 / 旧版打补丁后 / 新版原始包”三份输入重新生成，不能只改文件名。
- 一个补丁文件可以同时包含上游缺陷修复和 Desktop 扩展接缝；移除其中一个 hunk 不代表整个文件可以删除。
- 测试通过 `test/patch-path.ts` 按包名定位补丁，要求每个包恰好一个补丁文件。

## Harness 补丁（`@deepseek-ai/*@0.2.1-rc.4`）

| 包 | 职责 | 主要回归入口 | 移除条件 |
| --- | --- | --- | --- |
| `dsh` | CLI 启动失败时保留退出码；把 Desktop 宿主包（`dsh-desktop-*`、`dsh-ppt-composer`、`dsh-image-generation` 等）注入 `@deepseek-ai/dsh` 的依赖闭包，使 Profile 能解析到它们 | `desktop-plugin-closure`、`release` | 上游提供宿主依赖组合声明和等价退出语义 |
| `dsh-api-remotes` | 会话删除 RPC 的 Remote 描述符（Zod codec） | `session-delete-remote` | 上游原生提供删除 RPC |
| `dsh-api-session-controller` | 会话删除、上传文件授权路径、旧 preset 恢复、handle 清理；技能目录查询携带 Session ID，覆盖 Agent 尚未激活的冷会话 | `session-delete-remote`、`session-delete-retry`、`file-preview`、`session-create-remote-event-patch` | 上游提供删除、附件路径与 handle 生命周期契约 |
| `dsh-app-boot` | Desktop 包开关与归属、工作台故障隔离、插件 Harness 版本声明改为告警；Safe Mode 通过 `Symbol.for("dsh.desktop.host-module-base-url")` 发布宿主解析 anchor | `host-disabled-plugins`、`plugin-version-policy`、`plugin-startup-failure`、`safe-mode-host-resolved` | 上游提供相同的宿主策略、归属接口与解析 anchor |
| `dsh-client-file-upload` | 按 attachmentId 查找当前 Agent 尚未发送的暂存文件 | `file-preview` | 上游提供等价的授权文件路径能力 |
| `dsh-client-modules` | 客户端发现沿用 Profile 解析基准、消费 Safe Mode anchor、可选工作台加载失败隔离、组合加载缓存 | `client-modules-resolution-patch`、`client-modules-failure-isolation`、`client-modules-combo-perf-patch`、`safe-mode-runtime` | 上游支持宿主解析与可选贡献项隔离 |
| `dsh-client-shortcuts` | `data-dsh-desktop-web-shortcuts=true` 时使用 Web 快捷键运行时（Desktop 没有官方原生快捷键桥） | `macos-window-chrome` | 接入完整原生快捷键桥后连同标记一起删除 |
| `dsh-client-ui-agent-preset` | 预设导入/导出、搜索、预设入口 | `preset-transfer-patch`、`preset-toolbar`、`legacy-preset-migration` | 上游公开相同扩展点和操作 |
| `dsh-client-ui-attachment` | ready 状态附件的打开回调，失败不伪装成功 | `file-preview` | 上游暴露授权附件打开动作 |
| `dsh-client-ui-chat` | 上传附件打开、PPT footer（首个人类消息只挂载一次）、额度/权限错误文案、解码速度显示 | `file-preview`、`local-path-links`、`ppt-integration`、`provider-error-patch` | 上游提供附件动作、消息 footer 及相同文件路由 |
| `dsh-client-ui-conversation` | `conversation.hero.modeActions`、`conversation.hero.dock`、输入附件接缝、`desktop.workbench.frame`，同时保留上游的 `hero.options`、`input.accessory` 与 More 菜单；首页工作区选择“不在工作区”时把草稿带到新的聊天会话，聊天会话的工作区标签显示“不在工作区” | `workbench-patch-slots`、`ppt-integration`、`conversation-input-css`、`patch-runtime-compatibility`、`no-workspace-picker-patch` | 上游提供这些独立 slot，布局及生命周期等价；上游首页支持无工作区会话 |
| `dsh-client-ui-deliverables` | 识别回答中的本地路径/文件夹并提供打开入口，排除包名、邮箱等误识别 | `local-path-links`、`file-preview` | 上游原生识别相同路径并保留打开语义 |
| `dsh-client-ui-layout` | 在 `CenterColumn` 上渲染 `data-dsh-desktop-center` 标记，供 Liquid Glass 主题去掉中间列分隔线与阴影、挂载页面玻璃面板 | `desktop-theme` | 上游提供稳定的中间列标记或主题变量 |
| `dsh-client-ui-primitives` | Markdown mention 支持 `folder` 类型及文件夹图标 | `local-path-links` | 上游支持目录 mention 契约 |
| `dsh-client-ui-settings-account` | 桌面端账号登录在系统浏览器打开授权页，不在 Harness 内跳转 `dsh://` | `settings-account-launcher` | 上游的桌面登录流程不再依赖协议回跳 |
| `dsh-client-ui-settings-general` | 设置导航可滚动；调整 onboarding 的激活条件；“关于”使用信息图标而不是回退的齿轮 | `onboarding-patch`、`safe-mode`、`no-workspace-picker-patch` | 上游暴露等价的设置布局接缝；设置区注册可自带图标 |
| `dsh-client-ui-settings-models` | 服务商选择与搜索、模型目录搜索、容量编辑、视觉开关（关闭时同时清除图片限制字段）、任意 reasoning 映射、服务商地址校验 | `model-picker-patch`、`model-reasoning-efforts-patch`、`model-settings-catalog-ux-patch`、`model-settings-render`、`model-endpoint-settings` | 原生编辑器覆盖任意映射、旧配置迁移及 Desktop 目录交互 |
| `dsh-client-ui-sidebar` | 宿主导航与设置操作接缝、`sidebar.quickSwitcher`、聊天标题行、Windows 折叠行为，同时声明上游的面板固定与注入钩子 | `windows-sidebar-collapse`、`workbench-patch-slots`、`desktop-theme` | 上游有等价导航与布局 API |
| `dsh-client-ui-trajectory` | 额度/权限错误的中英文提示；`data-dsh-desktop-trajectory` 标记供主题透出背景 | `provider-error-patch`、`query-rail-patch` | 上游采用同等错误文案与稳定标记 |
| `dsh-client-ui-workspace` | 会话/工作区可见性过滤、打开/重用/删除注册接口、未读标记、在资源管理器中打开、无工作区的聊天会话；首页工作区选择器的“不在工作区”选项 | `workspace-unread-patch`、`session-delete-patch`、`workbench-patch-slots`、`open-in-finder`、`workbench-navigation`、`no-workspace-picker-patch` | 上游提供这些公开管理接口 |
| `dsh-deepseek-account-platform` | 桌面登录完成后显示本地回调页，不跟随 `dsh://` 回跳，避免被其他安装实例接管 | 账号组合回归（`settings-account-launcher`） | 上游提供不依赖协议注册的回跳方式 |
| `dsh-llm-deepseek` | 区分 AUTH / QUOTA / FORBIDDEN，403 不误判为认证失败 | `provider-error-patch` | 上游采用同等错误分类 |
| `dsh-llm-pi-ai` | 三种协议的 session 请求头、配置头覆盖、服务商错误上下文 | `pi-ai-session-headers`、`provider-error-patch`、`pi-ai-terminal-replay` | 上游提供同等身份头和错误上下文 |
| `dsh-plugin-manager` | 安装/卸载转入 Desktop 的 generation 后端（commit/rollback）、包开关、兼容性告警 | `plugin-manager-switch`、`plugin-version-policy` | 上游提供宿主事务 backend 与开关策略 |
| `dsh-session-persistence` | 持久化层的删除接口与类型 | `session-delete-patch` | 上游原生实现删除契约 |
| `dsh-session-persistence-jsonl` | JSONL 磁盘删除（沿用写入的独占路径与跨进程锁） | `session-delete-patch`、`session-corrupt-log-patch` | 上游提供同等磁盘删除能力 |
| `dsh-settings` | `configEditor` 持久化前校验 DeepSeek / pi-ai 的 baseURL，防止写入导致下次启动失败的地址 | `model-endpoint-settings` | 上游写入边界有等价校验 |
| `dsh-skill` | `skills/invocation` waterfall：按会话控制模型可调用性，PPT 模式下关闭 `office-pptx` 的自动调用 | `ppt-activation` | 上游提供目录与正文加载共用的动态调用策略接缝 |
| `dsh-workspace` | 删除会话后清理 workspace 索引与关联 | `session-delete-patch` | 上游公开同等管理接口 |

## 非 Harness 补丁

| 包 | 职责 | 主要回归入口 | 移除条件 |
| --- | --- | --- | --- |
| `@deepseek-ai/cordis-plugin-loader@1.0.6` | 保留 import cause、阶段诊断、初始化超时和失败归属 | `cordis-plugin-loader-patch`、`plugin-startup-failure` | 上游暴露同等失败诊断与恢复接口 |
| `@deepseek-ai/libreoffice-kit@0.1.5` | `renderImages` 增加可选的逐页 `onImage` 回调，PNG 写入并校验后才通知，纳入取消与超时 | `office-image-progress`、`ppt-office-preview-progress` | 上游发布等价进度接口，且取消、背压、失败清理回归通过 |
| `@earendil-works/pi-ai@1.3.0` | 去掉各 provider 对每段工具参数 delta 的重复 JSON 解析，保留结束时的完整解析（版本由 npm override 固定） | `pi-ai-streaming-arguments` | 固定的上游版本包含等价实现 |
| `node-pty@1.2.0-beta.15` | 支持显式/同级 spawn-helper；ConPTY kill 后立即 dispose 输出 worker | `node-pty-asar-layout`、`node-pty-cleanup` | 上游版本包含修复，且 ASAR 与 Windows 原生退出验证通过 |
| `undici@8.11.2` | wrapper 把对象形式的 HTTP/2 响应头与 trailers 转为旧 Fetch 需要的扁平数组 | `undici-legacy-headers` | 上游兼容对象形式的原始 headers/trailers |

## 维护提示

- `test/patch-runtime-compatibility.test.mjs` 会检查补丁修改过的 JS 中是否出现未定义的局部标识符，以及 Desktop 客户端注入的 slot 在当前 Harness 中是否有声明；它不验证贡献项可见性、布局和生命周期。
- `test/patch-hunk-counts.test.ts` 防止补丁 hunk 头与内容不一致。
- 补丁生成后要检查被修改的 `package.json` 仍是合法 JSON（rc.4 升级时曾出现补丁把 `bin.js` 的差异写进 manifest hunk 的问题）。
