# Word / Excel 案例模板

本文是 [文档总览](../README.md) 的功能子文档。Office 运行时（Python、LibreOffice Kit、资源位置与 Word 原生模板写入）见 [Office 运行时](../office-runtime.md)。

## 外显案例

| 格式 | 案例 |
| --- | --- |
| Word | 公文写作 · 通知、会议纪要 · 发布会筹备、中国现制咖啡市场调研报告、小米汽车研究报告 |
| Excel | 年度经营与客户分析、青岚港货物流向与作业效率、荧光酶活性筛选与批次质控 |

共 7 个案例、55 页预览。案例以原生 DOCX/XLSX、设计说明和登记的输入材料为权威源；预览、清单与缓存在构建时由 `npm run office:prepare` 生成到被忽略的 `.build/`，dev、build、pretest、package 都会调用。

## 交互

- 模式入口按 slot 顺序显示 PPT、Word、Excel。点击案例卡片直接选用，左上角小眼睛打开完整预览，预览内支持翻页和“做同款”。
- Word 预览采用双页并排，每次翻两页，奇数末页居中；Excel 同样双页，并按工作表的准确起始页切换，每页标注工作表名称与页码。
- 预览弹窗最大 1280×900，支持键盘翻页、Esc 关闭和焦点循环；点击遮罩关闭，点击弹窗内留白不关闭。
- 模板选择随会话保存；Word、Excel、PPT 共用 Host 状态与审计层，切换输出格式时清理上一格式的选择。绑定会话的 PPT 模式切换要等 Host 确认成功后才替换模板区，避免两块区域同时出现。
- 发送后，首条用户消息的 footer 展示所选案例名称和文件图标，可打开阅读模式的预览。

## 执行路径

- `dsh-desktop-office` 保留官方的 `office-docx`、`office-xlsx`、`office-pptx` 技能，通过独立的 `dsh-desktop-office-business` provider 加入业务方法。
- 客户端只用公开的 Slots、Locale、Connection；Host 在已鉴权的 Connection 通道注册 Office 路由。模板目录保留完整 SHA-256 与版本，预览和选择都会校验当前版本。
- Agent 每一步从当前会话恢复格式和案例上下文，覆盖压缩、恢复与任务中途选择。
- `office_template` 工具校验所选版本、当前工作区写入策略与取消信号，通过官方 Sandbox/Subprocess 执行固定的资源复制器，复制完成后核对哈希并记录审计。
- Word 案例返回稳定的段落 ID 与原生文字样式 ID，由 `office_template_write` 按原段落替换内容并沿用源件版式；`present` 前重新校验当前 DOCX 字节。Excel 由官方技能、安装级 Python 和 Kit 制作与复核。
- 归一化脚本统一 ZIP 顺序、时间和元数据，并把 Kit 随机分配的图表轴 ID 映射为稳定的局部 ID，保证重复重算的哈希一致。

## 业务方法与来源

| 业务方法 | 来源与许可 |
| --- | --- |
| `meeting-recap` | 用户提供的业务技能归档，MIT（署名 meeting-minutes contributors）；正文与结构校验器按 DSH 需求重写 |
| `gov-doc-writing` | 用户授权的本地公文写作技能 2.0.4 及参考资源，沿用原资源说明和条款 |
| `research-writer` | 来自 ComposioHQ/awesome-claude-skills 的 content-research-writer，Apache-2.0 |
| `saas-metrics-coach`、`dataset-health-audit`、`data-viz-gen` | 用户提供的技能归档，各自保留 MIT 许可与归属文件 |
| `work-report-writer` | 用户提供的技能归档，MIT；日报、周报与阶段总结规则按 DSH 需求重写 |

- 会议纪要案例原件 SHA-256 为 `b6183bbe83637defb3efe220fbfba6ddc9e5070a1e42aacf1168f9040f0deb5a`，保存在 `sources/curated/meeting-minutes/example.docx`，含五个议题与十五项行动记录；“做同款”先取当前修订的原生副本，再用用户材料替换全部示例事实。
- 公文案例的红头原本是嵌入图片，Writer 编辑视图会显示图片边框，因此 Word 预览统一使用 Kit 导出的 PDF 页面；工作副本准备阶段会把固定的机构图片转为可编辑的红色文字。
- 受限字体环境曾导致中文标题导出为空白，构建会在缓存发布前及每次复用时检查已认可标题的字形覆盖率（最低 0.14）。

## 验收边界

真实模型生成质量、原生 Word / WPS / Excel 中编辑保存重开、Windows 字体环境下的版式，需要单独验收。
