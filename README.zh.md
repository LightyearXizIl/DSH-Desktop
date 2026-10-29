<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="DSH Desktop Logo" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop</strong> 是面向 Windows 的 DeepSeek Harness 社区桌面客户端，由 NullPointer 独立维护。<br />
  开源仓库：<a href="https://github.com/LightyearXizIl/DSH-Desktop">LightyearXizIl/DSH-Desktop</a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

<p align="center"><strong>使用 DeepSeek 官方模型或主流第三方模型，管理可移植的 Agent Preset，在手机上继续 Harness 会话，并将材料生成可继续编辑的 PPTX。</strong></p>

DSH Desktop 把本地 DeepSeek Harness 封装为可安装的桌面应用。它会自动启动 Harness，把 Profile、插件、工作区、模型配置和会话保存在应用安装目录之外，并在本地 Runtime 就绪后直接进入完整 Harness 界面。

> [!IMPORTANT]
> DSH Desktop 当前处于早期预览阶段，基于仍在快速迭代的 `@deepseek-ai/dsh@0.2.1-rc.4`。Windows x64 安装包是未签名的社区构建，首次运行时 Windows SmartScreen 可能给出提示。本项目不是 DeepSeek 官方产品。

## 下载安装

在 [GitHub Releases](https://github.com/LightyearXizIl/DSH-Desktop/releases) 下载最新的 `dsh-desktop-windows-x64-setup.exe`。标记为 **Pre-release** 的版本用于尝鲜，可能与部分社区插件不兼容。

安装版会在启动后及每六小时从 GitHub Releases 检查更新。发现新版本时，DSH Desktop 会先询问用户并展示该版本的更新日志；同意后才开始下载，只有选择“重新启动并安装”后才会进入安装。你也可以在“设置 → 关于”中手动检查，或跳过当前版本而不影响后续版本提示。

## DSH Desktop 带来了什么

DeepSeek Harness 已经提供 Agent Runtime 与 Web UI。DSH Desktop 在此基础上补齐桌面宿主能力：

- 自动启动和停止 Harness，不需要另开 CLI 或浏览器标签页
- 通过系统原生目录选择器添加和管理项目工作区
- 支持 DeepSeek 官方模型与主流第三方模型提供方
- 将完整的自定义 Agent Preset 导入或导出为便携的 [`.dshpreset` 压缩包](docs/preset-packages.md)，安装前检查命名冲突并提示信任风险
- 通过内置 PPT 模式将材料生成并交付为可继续编辑的 PPTX
- 自带 Python 及 Office 库，支持离线生成和检查 DOCX、PPTX、XLSX
- 应用升级时保留 Profile、插件、工作区、会话和模型配置
- 识别 Harness 启动或前端插件故障，把诊断写入 `harness.log` 并提供引导恢复入口
- 提供不破坏用户数据的安全模式，临时屏蔽第三方插件
- 让已配对的手机通过局域网或可选的临时公网隧道继续会话
- 内置 Liquid Glass 主题（云母与兼容模式）、启动动画，以及可选的本地模型自动启动
- 在应用内检查桌面更新，并由用户决定是否下载和安装

## PPT 生成

点击 **PPT** 按钮，选择模板，再描述你想制作的内容。内置 **16 套模板、192 种版式**，可输出可继续编辑的 PPTX。模板预览统一使用英文，生成内容支持中文和英文，并配有对应字体设置；预览语言不决定输出语言。

PPT 功能保持预装，相关自动提示词仅在选中 PPT 按钮的会话中生效。模板、校验和参考来源详见 [PPT 说明](packages/ppt-runtime/README.md)。

## 手机连接

从 `Harness` 菜单选择“连接手机…”，再扫描配对二维码。

- WiFi 下扫码即可连接。
- 互联网隧道需要再输入电脑上显示的 6 位连接密码。默认是 5 分钟、只存在内存里的临时密码；只有在「连接手机」窗口勾选同意后，才会在本机生成长效密码。

Harness 本身始终运行在随机的 `127.0.0.1` 端口。手机访问由独立的配对 Bridge 提供。Cloudflare Quick Tunnel 是常态长连接路径；免费 Pinggy 是 Cloudflare 不可用时（如中国大陆）的备用通道，大约 60 分钟后失效。桌面端断开连接后，手机会话随即失效。

Cloudflare 启动失败时会尝试 Pinggy。若已显示 Cloudflare 配对链接，但手机无法打开，可点击“**扫码打不开？换一条线路**”切换到 Pinggy。

## 安全模式与故障恢复

如果第三方插件导致启动或页面渲染异常，DSH Desktop 会结合 Runtime 与前端证据定位相关插件，并打开引导式恢复界面。

从 `Harness` 菜单选择“以安全模式重启…”，应用会使用只包含官方核心 Bundle 的隔离 Profile 启动。正常 Profile 中的第三方插件会被屏蔽，但 Agent、会话、模型配置和工作区仍然可用。你可以从页面顶部的安全模式提示卸载选中的问题插件，或恢复正常启动。恢复页面会检查插件是否有兼容更新，安全模式还支持批量升级。

当正常界面无法进入时，也可以通过 `--safe-mode` 启动，例如在 PowerShell 中：

```powershell
& "$env:LOCALAPPDATA\Programs\DSH Desktop\DSH Desktop.exe" --safe-mode
```

（如果安装时选择了其他目录，请替换为实际路径。）

## 本地数据与安全边界

- Harness Web UI 只运行在随机回环端口。
- Renderer 不具备 Node.js 权限，并启用 Context Isolation 与 Sandbox。
- WebView、不可信站内跳转和非预期权限请求会被阻止。
- 外部网页链接交给系统浏览器打开。
- Profile 与会话保存在 Electron 的用户级应用数据目录，不在安装目录内。
- 手机访问需要短时配对 Token。WiFi 扫码即连；互联网隧道还需要电脑上显示的连接密码。

## 平台支持

| 平台 | 分发形式 | 状态 |
| --- | --- | --- |
| Windows x64 | 未签名的 NSIS 安装包 | 支持 |
| macOS | 源码保留构建脚本，暂不发布安装包 | 未发布 |
| Windows ARM64 / Linux | — | 当前不支持 |

Harness 包含目标平台原生依赖，因此每一种安装包都要在对应操作系统与架构上构建。

## 开发与架构

完整的项目文档从 [文档总览](docs/README.md) 开始，常用的几份：

- [开发指南](docs/development.md) — 本地环境、验证、补丁维护与原生平台打包
- [运行架构](docs/architecture.md) — 启动流程、持久化数据、安全边界、故障恢复、手机连接与更新
- [发布手册](docs/release-runbook.md) — 版本号、打包与 GitHub Release 发布
- [Preset 包格式](docs/preset-packages.md) — 可移植 Agent Preset 契约

提交修改前请运行 `npm test`、`npm run typecheck` 和 `npm run build`，并实际操作受影响的应用流程。请勿在 Issue、日志、截图或测试数据中提交真实 API Key。

## 相关项目

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — DeepSeek 官方 Agent 框架，本项目的运行时与 Web UI 来源。
- [dsh-market](https://github.com/dsh-market/dsh-market) — DeepSeek Harness 社区插件市场，可在 Harness 界面中浏览、安装和更新插件。

## 许可证

DSH Desktop 采用 [MIT License](LICENSE) 开源。

DeepSeek Harness 及其依赖仍遵循各自的上游许可证与商标规则。DSH Desktop 是独立的社区桌面应用，与 DeepSeek 官方无隶属关系。
