# dsh-desktop-workbenches

Desktop host plugin for the Awesome DSH Workbench market, local workbench state, navigation and the native conversation frame.

Market metadata comes exclusively from the published Awesome protocol v2 index. Runtime providers register their own component and runtime ID. A provider that wants to be recognized as the installed form of an Awesome entry must include the canonical GitHub URL in its registration descriptor's `repository` field.

The host does not bundle a separate catalog or third-party workbench packages. It installs, updates and uninstalls catalog entries on the user's request through Desktop's isolated-generation boundary (`desktopPnpm.installWorkbenchGeneration`) and records them in `market-installs.json`; see [docs/features/workbenches.md](../../docs/features/workbenches.md).

## 规范文档

开发和上架分成两份规范，内容不重复。Desktop 内附两份规范的中文离线副本：

| 文档 | 来源 | Desktop 离线副本 | 何时需要 |
|---|---|---|---|
| 工作台开发规范 | `docs/workbench-standard.zh.md` | `development-guide.zh.md`，`/api/desktop-workbenches/author-guide`（兼容别名 `/development-guide`） | 开发并在本机自测；只自己用时只需要这一份 |
| 工作台市场验收规范 | `docs/workbench-market-acceptance.zh.md` | `market-acceptance.zh.md`，`/api/desktop-workbenches/market-acceptance` | 想上架到工作台市场时 |

修改来源后运行 `node scripts/build-workbench-guide.mjs` 更新离线副本，`--check` 检查是否一致；生成副本不要单独修改。脚本另有 `--site` / `--site-check` 选项，用于把规范发布到网站仓库。

规范正文与“制作我的工作台”引导中的在线链接，以及市场目录地址，目前仍指向本项目前身的在线服务，代码未改，见 [文档总览的已知遗留问题](../../docs/README.md#已知遗留问题)。功能说明见 [docs/features/workbenches.md](../../docs/features/workbenches.md)。
