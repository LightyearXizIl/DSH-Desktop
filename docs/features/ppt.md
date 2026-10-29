# PPT 功能总览

本文是 [文档总览](../README.md) 的功能子文档，下面还有两份更细的子文档：

| 子文档 | 内容 |
| --- | --- |
| [个人 PPT 模板](ppt-personal-templates.md) | 上传 PPTX 成为个人模板：分片上传、转换、逐页预览、保存与复用、内存隔离 |
| [PPT 转模板能力审查](ppt-conversion-review.md) | PPTX → PPTD → PPTX 的能力矩阵、占位规则与剩余覆盖 |

运行时包本身的构建、模板目录与兼容说明见 [`packages/ppt-runtime/README.md`](../../packages/ppt-runtime/README.md)。

## 组成

- 两个产品包：`dsh-ppt`（制作与导出）和 `dsh-ppt-composer`（PPT 按钮与模板选择器），普通 Profile 由 Desktop 组合层加载 `dsh-ppt-composer`，它再挂载核心包。
- 维护源码与生成器在 `packages/ppt-runtime/` 和 `scripts/ppt/`；`npm run ppt:build` 在被忽略的 `.build/ppt-runtime/` 中生成完整分发目录，再投影到 `node_modules` 并由 Electron Builder 装配，规则见 [源码与构建产物规范](../engineering/source-build-contract.md)。
- 内置 **16 套模板、192 种版式**，每套都有英文与中文示例；预览统一用英文渲染，预览语言不决定输出语言。
- PPT 自动提示词只在开启 PPT 按钮的会话中生效；此时 `dsh-skill` 补丁会关闭 `office-pptx` 的自动调用，关闭 PPT 模式即恢复。普通会话使用上游的 `office-pptx`（python-pptx）。
- 旧的磁盘目录 `kimi-ppt` 与 `/kimi-ppt` RPC 别名为兼容旧会话而保留。

## 预览链路

预览使用实际转换输出：PPTX → LibreOffice PDF → PDFium 页图。首页单独处理，后续最多 8 页一批，两个有界 Office 槽交替导出 PDF 与光栅化，每张 PNG 写好就发布进度；逐页通知依赖 `@deepseek-ai/libreoffice-kit@0.1.5` 补丁（见 [补丁清单](../harness/patch-inventory.md)）。

## 已定位的转换根因

这些问题已修复，作为排查同类问题的参考：

- **字体、字号、颜色丢失**：源文件的样式可能来自 slideLayout／母版占位符的 `lvl1pPr/defRPr`，只读局部 `run/rPr` 会丢失；现在按继承层级合成默认样式，局部显式属性优先。自由文本框按 presentation 默认样式继承，不能继承母版 otherStyle 的对齐和字号。
- **组合对象变形**：`chExt` 描述局部几何坐标，而字号 `rPr.sz` 与线宽 `ln.w` 使用物理单位，三者一起缩放会把 1pt 边框放大成色块；现在只对位置与尺寸做仿射变换。
- **连接符样式缺失**：局部 `ln` 可能只有端点，完整样式来自主题 `lnRef`，需要合成主题样式矩阵并解析 `phClr`。
- **Windows 下苹方字体**：原稿的 `PingFang SC Regular / Semibold` 在 Windows 导入时改用微软雅黑及其原生字重；Mac 字面、其他显式字体及原始坐标保持来源。
- **大文件内存耗尽**：约 81 MiB、57 页的矢量模板曾让 V8 堆达到约 4 GiB；现在逐页处理并在独立的 1536 MiB 预算进程中导入，超时 10 分钟。

## 模板与素材来源

- 实现方案参考了 Kimi Slides 的 PPTD 文档与示例；十套模板按 MIT 许可改编自 Zara Zhang 的 `beautiful-html-templates`（固定提交 `e5e204fb`）；工程蓝图、课程培训两套改编自 Apache-2.0 的 HTML Anything 方向；其余为自建。具体范围与许可证见 `packages/ppt-runtime/core/THIRD_PARTY_NOTICES.md`。
- 历史上曾移除 23 套来源不清的模板和 345 张参考图，`excluded-assets.json` 以哈希形式记录，测试保证它们不会回到分发包中。
- 字体只记录名称与平台回退，不内嵌或分发字体文件。
- 本节是工程来源记录，不构成法律意见；对外商业分发前应自行核实素材授权。

## 验收边界

自动化测试、包内 afterPack 门禁和逐页预览不能代替：真实模型生成、PowerPoint / WPS 中编辑保存重开、Windows 原生字体环境下的视觉对照。
