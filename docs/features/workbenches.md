# 工作台

本文是 [文档总览](../README.md) 的功能子文档。实现位于 `packages/dsh-desktop-workbenches/`。

## 工作台是什么

工作台是一种 DSH 插件：它首先是合格的 Harness bundle（`dsh.bundle.patch` + `cordis.patch.yml`），再通过客户端的 `desktopWorkbenches.register()` 向 Desktop 注册业务面板，并遵守工作台与会话、工作区的交互规则。完整的开发规则见随产品分发的规范文档（见下文“规范文档”）。

## 宿主插件的职责

- **身份**：每个工作台只有一个身份，即由 GitHub `repository` URL 派生的小写 `owner/repository`。注册描述里自带的 ID 会被拒绝；Cordis 识别出的调用方客户端包、市场分发信息或安装记录必须与这个身份一致，否则不暴露该工作台。
- **状态**：`<DSH_HOME>/desktop-workbenches/state.json`（版本 1）记录已添加、置顶、收藏的工作台，前台工作台，会话归属，最近会话和笔记。移除工作台会保留它的会话、项目文件、笔记和收藏。
- **模式与会话归属**：侧栏顶部的单一模式切换器在“原生会话”与已添加的工作台之间切换。工作台模式下只显示该工作台的会话，新建会话或切换工作区时只创建或打开当前 owner 的会话，并在显示前持久化归属；不会收编普通会话或其他工作台的会话。全局“新建会话”和显式打开普通会话会离开工作台模式。
- **安装**：市场安装、更新、卸载都通过与 dshmarket 相同的隔离 generation 边界（`desktopPnpm.installWorkbenchGeneration`）执行，并锁定目录给出的来源：npm 精确版本且 integrity 一致、GitHub Release 包的 SHA-256 / 大小（8 MiB 以内）/ 版本一致，或固定到指定提交的源码。校验失败即安装失败，不会改用其他来源。安装记录写在 `desktop-workbenches/market-installs.json`，所有变更在重启 Harness 后生效。

## 在线市场与投稿

市场目录、投稿 PR 状态查询和“制作我的工作台”引导中的规范链接，目前都指向本项目前身维护的在线服务，本项目没有运营这些服务，代码暂时原样保留。具体位置见 [已知遗留问题](../README.md#已知遗留问题)。

## 规范文档

下列 6 份文档是随产品分发的工作台规范，`scripts/build-workbench-guide.mjs` 会把中文版复制到 `packages/dsh-desktop-workbenches/` 作为 Desktop 内的离线副本，`test/workbench-guide-sync.test.mjs` 检查两份内容一致。它们的路径和内容与代码绑定，**整理文档时保持原位、原样**：

| 文档 | 用途 |
| --- | --- |
| [workbench-standard.zh.md](../workbench-standard.zh.md) / [en](../workbench-standard.en.md) | 工作台开发规范 |
| [workbench-market-acceptance.zh.md](../workbench-market-acceptance.zh.md) / [en](../workbench-market-acceptance.en.md) | 工作台市场验收规范 |
| [workbench-quickstart.zh.md](../workbench-quickstart.zh.md) / [en](../workbench-quickstart.en.md) | 六步速览 |

修改规范源文件后运行 `node scripts/build-workbench-guide.mjs` 更新离线副本，`--check` 可检查是否一致。

## 回归入口

```sh
npx vitest run test/workbench-catalog.test.mjs test/workbench-client.test.mjs test/workbench-state.test.mjs test/workbench-navigation.test.mjs
```
