# 发布手册

本文是 [文档总览](README.md) 的子文档，记录 DSH Desktop 当前实际使用的发布流程：在 Windows x64 本机打包，以 GitHub Release 资产的形式发布。开发环境与打包命令的细节见 [开发指南](development.md)，客户端如何发现更新见 [运行架构](architecture.md#updates)。

## 1. 版本号

- Desktop 版本以根 `package.json` 的 `version` 为准，改版本时同步根 `package-lock.json`。
- Desktop 版本与上游 Harness 版本**独立维护**：升级 `@deepseek-ai/*` 依赖不改 Desktop 版本号，Harness 版本以依赖声明和锁文件为准。
- 只有用户明确要求发版或改版本号时才修改版本。
- Git tag 使用 `v` 前缀加完整 SemVer，例如 `v0.0.4`；预览版使用预发布后缀，例如 `v0.0.4-rc.1`。客户端只识别 `v` 开头、能解析为 SemVer 的 tag。

## 2. 更新日志

每次发布都要在根 [`CHANGELOG.md`](../CHANGELOG.md) 新增对应版本条目，写清实际的功能、修复、验证和已知限制，不用占位文字。GitHub Release 正文与 CHANGELOG 条目保持一致，风格参考根目录的 [`RELEASE_NOTES.md`](../RELEASE_NOTES.md)。客户端会把 Release 正文原样展示在更新弹窗和“关于”页中。

## 3. 打包（仅在明确要求时执行）

日常开发不打包。只有明确要求“打包”或“出安装包”时才执行以下步骤，且必须在 Windows x64 机器上进行：

```powershell
# 1. 目标平台检查：Electron Node 模式能加载 Harness 原生 loader
node scripts/verify-target.mjs win32 x64

# 2. 确认本地 Electron 与锁定版本一致（当前为 43.0.0）
Get-Content node_modules/electron/dist/version

# 3. 构建并复用本地 Electron，不重新下载
npm run build
node scripts/electron-builder-windows.mjs --win --x64 --publish never `
  "--config.electronDist=$PWD/node_modules/electron/dist"
```

本地 Electron 版本与锁定版本不一致时不得继续打包，也不得换用其他 Electron 版本来避免下载。

打包成功后 `dist/` 下应有：

| 文件 | 用途 |
| --- | --- |
| `dsh-desktop-windows-x64-setup.exe` | NSIS 安装包 |
| `dsh-desktop-windows-x64-setup.exe.blockmap` | 差分下载索引 |
| `latest.yml` | 客户端更新元数据，`version` 必须等于本次版本 |

## 4. 验收

- `afterPack` 门禁会在打包阶段自动检查：ASAR 原生文件布局与解包清单、生产依赖清单、临时 Safe Mode Harness 启动、认证后的 HTML 与 bootstrap 注册、node-pty 与语音原生模块、PPT 模块，以及 Office DOCX/PPTX/XLSX 生成、重读和 PDF 转换。门禁失败即打包失败。
- 打包门禁不代表界面可用：发布前至少实际安装一次、启动并进入主界面。
- 在交付说明中分别写明：已执行的检查、安装包大小与 SHA-256、`latest.yml` 版本，以及未执行的验收（例如全新机器安装、真实模型请求、插件组合）。

## 5. 发布到 GitHub Release

`dist/` 被 `.gitignore` 忽略，`git push` 不会上传安装包，必须用 GitHub CLI 创建 Release：

```powershell
gh release create v0.0.4 `
  dist/dsh-desktop-windows-x64-setup.exe `
  dist/dsh-desktop-windows-x64-setup.exe.blockmap `
  dist/latest.yml `
  --repo LightyearXizIl/DSH-Desktop `
  --title "DSH Desktop v0.0.4 — <一句话主题>" `
  --notes-file <本次更新日志.md>
```

- 预览版加 `--prerelease`。已安装的稳定版会忽略预发布 Release。
- 三个资产缺一不可：缺少 `latest.yml` 的 Release 不会被客户端当作可更新版本。
- 推送 tag 与源码提交是单独的操作，按需要另行执行。

## 6. 代码签名

本项目的 Windows 安装包是**未签名的社区构建**，不做 Authenticode 签名，用户首次运行时 SmartScreen 可能提示。

自动更新不做签名校验：`package.json` 中 `win.verifyUpdateCodeSignature` 为 `false`，也不声明 `signtoolOptions.publisherName`，打包后的 `resources/app-update.yml` 不含发行者名称。更新包完整性依赖 `latest.yml` 中的 `sha512` 与 GitHub 的 HTTPS 下载。

## 7. 继承的 CI 工作流

`.github/workflows/` 与 `.github/scripts/` 中的发布工作流继承自本项目的前身，依赖本项目没有的签名硬件、镜像仓库与通知 Webhook，**不属于当前发布流程**，不要以它们的运行结果作为发布依据。这些文件属于代码，目前原样保留，见 [已知遗留问题](README.md#已知遗留问题)。
