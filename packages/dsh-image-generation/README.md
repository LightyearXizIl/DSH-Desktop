# dsh-image-generation

DSH/Cordis 公共影像生成插件，提供 `image_generate`、`video_generate`、`text_generate` 三个工具、`generate-image` Skill 和「设置 → 内置插件 → 影像生成」卡片。PPT、Word 和普通对话共用同一份配置与图片、视频资产。

## 使用

DSH Desktop 默认关闭内置影像生成插件。需要使用内置版本时，在「设置 → 内置插件 → 影像生成」启用内置插件并重启 Harness（内置插件开启后，这个页签由影像生成自己的配置卡片接替）；启用前须先停用同名市场版本。启用后，在影像生成卡片选择 Seedream、OpenAI、GrsAI、Agnes AI 或「OpenAI 兼容」，填写该平台的 API Key 并保存。生图模型支持预设选择或自定义输入，API 地址可在高级设置中修改（「OpenAI 兼容」没有默认地址，地址放在 Key 上方必填）。卡片里的「图片参数」「视频参数」设置默认比例、分辨率和质量，见下文[生成参数](#生成参数)。

生图模型使用下拉选择。OpenAI 的「获取模型」用当前填写或已保存的 Key 发起一次 `GET /models`，筛选 Images API 支持的 GPT Image 模型；获取过程只更新候选列表，配置在点击保存时生效。查询来源保留在接口中，界面显示候选模型、空列表和查询错误。字节的管理接口使用独立签名凭据，因此 API Key 模式提供内置选项和自定义模型/接入点 ID。

Seedream 预设按 [火山方舟模型列表](https://docs.volcengine.com/docs/82379/1330310) 的图片生成能力核对（2026-09-10）：

| 模型 | 模型 ID |
| --- | --- |
| Seedream 5.0 Pro | `doubao-seedream-5-0-pro-260628` |
| Seedream 5.0 | `doubao-seedream-5-0-260128` |
| Seedream 5.0 Lite | `doubao-seedream-5-0-lite-260128` |
| Seedream 4.5 | `doubao-seedream-4-5-251128` |
| Seedream 4.0 | `doubao-seedream-4-0-250828` |

官方目录明确同时支持 5.0 和 5.0 Lite 两个 ID。预设表示插件支持的型号，实际可用性取决于账户开通情况；自定义入口用于填写其他模型或接入点 ID。

API 地址同时接受基础地址和控制台提供的完整 `/images/generations` 地址。保存时统一为基础地址，实际请求只添加一次接口路径。

| 服务商 | 默认模型 | 默认 API 地址 |
| --- | --- | --- |
| 字节 / 火山方舟 | `doubao-seedream-4-5-251128` | `https://ark.cn-beijing.volces.com/api/v3` |
| OpenAI | `gpt-image-1.5` | `https://api.openai.com/v1` |
| GrsAI | `nano-banana-fast`（视频 `minimax-h3`，文本 `gemini-3.1-pro`；三个下拉都从 GrsAI 在线拉取） | `https://grsai.dakka.com.cn` |
| Agnes AI | `agnes-image-2.5-flash`（视频 `agnes-video-2.5`） | `https://api.agnes-ai.cn/v1`（中国站；国际站 `https://apihub.agnes-ai.com/v1`） |
| OpenAI 兼容 | 由用户填写 | 由用户填写 |

保存自动发起一次非生图校验请求，界面显示校验中、保存成功或具体错误。失败保留输入及之前的有效配置。Key 更换后立即生效；各服务商分别保存配置和 Key。更换 API 地址的域名时需要重新填写 Key。

- OpenAI：`GET /models/{model}`，检查凭据和模型元数据访问。Key 需要允许读取该模型信息。
- Agnes AI：`GET /models/{model}`。国际站网关对任意 Key 都返回模型列表，所以读取所选模型的元数据，两个站点都会以 401 拒绝无效 Key。
- OpenAI 兼容：`GET /models`。服务返回 404 或 405（没有模型列表接口）时照常保存，记为「未校验」，卡片提示 Key 在第一次生成时确认；401/403 等照常报错。
- GrsAI：`POST /client/openapi/getAPIKeyCredits`，查询该 Key 的积分额度，不提交生成任务；填写了账户 Token 时再用 `POST /client/openapi/getCredits` 校验 Token。
- 字节：`POST /images/generations`，请求体仅含 `model`，省略必填 `prompt`。只将明确的 prompt 缺参错误识别为连接校验成功，其他错误正常报错。该请求进入参数检查，不提交生图任务。采用此方式是因为 Ark 官方运行时 SDK 没有可依赖的模型列表接口。

校验结果与实际生图成功分别记录。生图权限、余额、内容审核和输出效果在真正调用时确认。本插件没有生成测试图按钮。

提示词示例：「为这份 PPT 生成一张留出左侧标题空间的科技插画，风格沿用当前模板。」Agent 加载 Skill 后调用 `image_generate`，按当前 Host 权限策略直接执行，将图片保存到工作区 `.workbuddy/generated-images/<sha256>.png`。工具返回路径、尺寸、字节数、哈希、服务商和模型。图片可保留透明通道，标题、表格和简单图表继续使用 Office 原生对象。

本期支持文生图，每次生成一张图片；文档按实际返回尺寸等比放置或裁剪。编辑图、参考图、批量生图和本地模型留待后续版本。

字节请求采用 Seedream 4.5 / 5.0 Pro 共用的单图字段，由服务端默认单图模式执行。自定义接入点 ID 也使用这一契约。组图控制属于独立能力，5.0 Pro 的单图请求省略 `sequential_image_generation` 及其 options。模型能力和画布范围参考 [BytePlus 官方 Seedream 能力表](https://docs.byteplus.com/api/docs/ModelArk/1824121)。

## 生成参数

卡片的「图片参数」「视频参数」列出当前所选模型实际支持的取值，选择随配置一起保存并传入真实请求。可选值来自 `lib/options.js` 的能力表，卡片通过 `POST /api/image-generation.options` 按服务商和模型读取（不需要 Key），切换模型后菜单随之更新。

- **默认比例**：工具调用（对话、PPT、Word）指定了 `aspect_ratio` 时以调用为准，没有指定时用这里的默认值。工具可用的比例是 `1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`、`21:9`；视频是 `16:9`、`9:16`、`1:1`、`4:3`、`3:4`、`21:9`，具体以模型为准。
- **分辨率 / 质量**：只列模型支持的档位，第一项是默认值。「默认（不指定）」表示不发送该字段，由服务商使用自己的默认值。
- 保存时拒绝当前模型不提供的取值（错误码 `OPTION`），不发请求；已保存的取值在换模型后若不再适用，生成时回退到该模型的默认值，卡片上也显示为默认值，下次保存时不再提交。

| 服务商 / 模型 | 比例 | 分辨率 → 请求字段 | 质量 |
| --- | --- | --- | --- |
| Seedream 4.0 / 4.5 / 5.0 / 5.0 Lite | 8 种 | 2K、4K → `size` 像素值（2K：16:9 为 2560×1440 等；4K 为 2K 各边翻倍，不超过 4096×4096 的总像素上限） | 无 |
| Seedream 5.0 Pro、自定义接入点 | 8 种 | 2K（5.0 Pro 总像素上限约 462 万；接入点 ID 看不出型号，按保守档位） | 无 |
| OpenAI GPT Image 2 / 2.5 | 8 种 | 1K、2K、4K → `size`（16:9 为 1280×720 / 2048×1152 / 3840×2160；边长为 16 的倍数，最长 3840，比例不超过 3:1，总像素 655,360–8,294,400） | `auto`、`low`、`medium`、`high` |
| OpenAI GPT Image 1 / 1.5 / mini | 8 种，映射到 1024×1024、1536×1024、1024×1536 三种画布 | 1K | `auto`、`low`、`medium`、`high` |
| GrsAI Nano Banana | 8 种 → `aspectRatio` | 1K、2K、4K → `imageSize`；名称带 `-2k-` / `-4k-` 的渠道只用对应档位 | 无 |
| GrsAI GPT Image 2 / 2.5 | 8 种 → `aspectRatio` | 只有 1K（不发送分辨率） | 无（GrsAI 文档仅支持 `auto`） |
| GrsAI GPT Image VIP / Flare / Sunburst | 8 种 | 1K、2K、4K → `aspectRatio` 像素值（GrsAI 文档的 1K/2K/4K 对照表） | Flare：`low`/`medium`/`high`；Sunburst：再加 `xhigh`/`max`；VIP：不发送 |
| Agnes AI 生图 | 8 种 → `ratio` | 1K、2K、3K、4K → `size` | 无 |
| OpenAI 兼容 | 8 种 | GPT Image 画布（1024/1536）、DALL·E 3 画布（1024/1792）或不发送 `size` | 默认（不发送）、`auto`、`low`、`medium`、`high`、`standard`、`hd` |

| 视频模型 | 比例 | 分辨率（第一项为默认） | 时长 |
| --- | --- | --- | --- |
| GrsAI MiniMax H3 | `16:9`、`9:16`（发送 `landscape` / `portrait`） | `768p`、`480p`、`1080p` | 1–15 秒，1080p 最多 10 秒 |
| GrsAI Agnes Video 2.5 | 6 种 | `720p`、`1080p`、`2k` | 4–12 秒 |
| GrsAI Wan 3.0 | 6 种 | `720p`、`480p`、`1080p` | 2–30 秒 |
| GrsAI Veo 3.1 | `16:9`、`9:16` | 不可选 | 固定 |
| Agnes AI Video 2.5 | 6 种 | `720P`、`1080P`、`2K` | 4–12 秒 |
| Agnes AI Video 2.5 Flash | 6 种 | 只有 `720P` | 4–12 秒 |

视频默认取较低档位，因为费用随分辨率上升；MiniMax 保持此前的 768p。GrsAI 在线清单里出现、插件还不认识的视频模型只发送比例和时长，参数不合适时由 GrsAI 报错。

## GrsAI：生图、生视频与文本生成

[GrsAI](https://grsai.ai/zh) 用一个 Key 聚合多家生图、生视频和文本模型，它们都是生成式接口，不作为 Agent 的对话模型接入，而是由本插件以工具形式提供。接口按 GrsAI 控制台文档和[新版 API 文档](https://qmy27nhsd9.apifox.cn/452392911e0)核对（2026-10-29）。地址只填主机：默认国内直连 `https://grsai.dakka.com.cn`，海外网络改为 `https://grsaiapi.com`；粘贴带 `/v1/...` 的完整接口地址时，保存时统一为主机地址。请求头为 `Authorization: Bearer <Key>`。

| 能力 | 模型 | 接口 | 关键参数 |
| --- | --- | --- | --- |
| 生图 · Nano Banana | `nano-banana-fast`、`nano-banana-2`、`nano-banana-2.1`、`nano-banana-pro` 及其 `-lite`、`-cl`、`-vip` 变体 | `POST /v1/api/generate` | `aspectRatio` 取 `16:9` 等比例，`imageSize` 取设置的 1K/2K/4K（默认 1K） |
| 生图 · GPT Image | `gpt-image-2`、`gpt-image-2.5` | 同上 | `aspectRatio` 取比例 |
| 生图 · GPT Image VIP | `gpt-image-2-vip`、`gpt-image-2.5-flare`、`gpt-image-2.5-sunburst` | 同上 | `aspectRatio` 只接受像素值，按设置的 1K/2K/4K 取 GrsAI 对照表（1K 默认：方图 1024×1024，16:9 为 1280×720）；Flare、Sunburst 可另选 `quality` |
| 生视频 · Veo 3.1 | `veo3.1-fast`、`veo3.1-pro`（GrsAI 模型清单已不再列出，仅保留给已保存的选择） | `POST /v1/video/veo`（旧版接口，新版文档未收录） | `aspectRatio` 取 `16:9` 或 `9:16`，时长固定 |
| 生视频 · MiniMax H3 | `minimax-h3` | `POST /v1/api/generate` | `aspectRatio` 取 `landscape` / `portrait`，`resolution` 取 `480p`/`768p`/`1080p`（默认 768p），`duration` 1–15 秒（默认 6，1080p 最多 10） |
| 生视频 · Agnes Video 2.5 | `agnes-video-2.5` | 同上 | `aspectRatio` 取 `16:9`、`9:16`、`21:9`、`4:3`、`1:1`、`3:4`，`resolution` 取 `720p`/`1080p`/`2k`（默认 720p），`duration` 4–12 秒（默认 5） |
| 生视频 · Wan 3.0 | `wan-3.0` | 同上 | 比例同上，`resolution` 取 `480p`/`720p`/`1080p`（默认 720p），`duration` 2–30 秒（默认 5） |
| 生视频 · 之后新增的模型 | 在线清单里出现、插件还不认识的视频模型 | `POST /v1/api/generate` | 只发统一接口的通用字段：`aspectRatio` 取六种比例之一，给了 `duration` 才带上，不带分辨率；参数不合适时由 GrsAI 报错 |
| 文本生成 | `gemini-3.1-pro`、`gpt-5.6-sol` 等 | `POST /v1/chat/completions` | OpenAI 兼容格式，`stream: false` |

比例、分辨率和质量的可选值见[生成参数](#生成参数)。

### 在线拉取模型

生图、视频和文本三个下拉都从 GrsAI 在线拉取，网站上新增或下架的模型会直接反映在这里。打开卡片里的 GrsAI 区域时自动拉取一次，「刷新模型列表」可以重新拉取，不需要 Key：

1. 首选 GrsAI 公开的「模型大全」页面（`https://grsai.ai/zh/dashboard/models`，带 `RSC: 1` 请求头取 Next.js 页面数据）。只有它给每个模型标了类型（`text` / `image` / `video`）并且列出视频模型；`closeModel` 为真的已下架模型不进下拉。这是网站页面而非公开 API，解析时只认 `{ models: [{ name, type }] }` 结构，找不到就换下一个来源。
2. 页面打不开时，用公开的 `GET <主机>/v1/models` 取生图和文本模型（按名称区分），视频退回内置列表。
3. 两者都失败时使用内置列表（与 2026-10-29 的在线清单一致），卡片会提示正在使用内置列表。

已保存的模型即使不在新列表里也保留在下拉中，不会被自动改掉；尚未保存过 GrsAI 时，拉取后默认选中清单里实际在售的模型。2026-10-29 的清单中视频模型只有 `minimax-h3` 和 `agnes-video-2.5`，所以默认视频模型改为 `minimax-h3`。

### 任务与下载

新版统一接口提交时带 `replyType: "async"`，服务端立即返回 `{ id, status }`；插件随后轮询 `GET /v1/api/result?id=<id>`，状态为 `running`、`succeeded`、`failed` 或 `violation`，失败和违规以 HTTP 400 携带任务体返回。Veo 走旧版接口：提交时带 `webHook: "-1"`，轮询 `POST /v1/draw/result`。两种轮询的间隔都从 0.5 秒逐步放宽到图片 2.5 秒、视频 5 秒；图片最长等 3 分钟，视频最长等 14 分钟；任务刚提交时暂查不到（新版 HTTP 404、旧版 `code: -22`）最多容忍 5 次。`violation` 和旧版的 `input_moderation` / `output_moderation` 报内容审核错误，其他失败报服务商错误；服务商的原始错误文本可能回显提示词，不透传给模型。

GrsAI 返回的是 2 小时内有效的结果链接。厂商返回的结果链接（GrsAI 的图片和视频、Agnes AI 的视频、Agnes AI 或 OpenAI 兼容服务以 URL 返回的图片）共用同一下载规则（`lib/download.js`）：只接受 HTTPS（本机回环开发服务允许 HTTP），不带 Key；可以跟随 CDN 重定向，但最终地址仍须是 HTTPS，下载超时 2 分钟，图片受原有体积和像素上限约束，视频最大 200 MB。

### 生视频

保存了 GrsAI 或 Agnes AI 的 Key 后，系统提示切换为允许调用 `video_generate`；都未保存时提示模型不要调用，并引导用户到设置页。生视频的服务商这样选：当前生图服务商本身能生视频（GrsAI 或 Agnes AI）时用它；否则用已保存的 GrsAI，再其次用已保存的 Agnes AI。所以仍可以用 Seedream 生图、同时用 GrsAI 生视频。

`video_generate` 参数为 `prompt`、可选 `style_context`、`aspect_ratio`（不填时用设置里的默认比例，初始为 `16:9`）和 `duration`（秒）。比例或时长超出所选模型的范围时，在提交任务、消耗积分之前就报错并说明该模型支持的范围。工具超时 15 分钟。下载结果必须以 ISO 媒体 `ftyp` 头开头，随后通过与图片相同的沙箱写入子进程保存到工作区 `.workbuddy/generated-videos/<sha256>.mp4`，返回路径、字节数、哈希、服务商和模型。本期为文生视频；参考图、首尾帧、参考音频和对话内的视频预览留待后续版本，视频需在工作区中打开。

### 文本生成

`text_generate` 把一个提示词发给 GrsAI 配置里的文本模型，返回模型回复。参数为 `prompt`、可选 `instructions`（作为 system 消息）和 `max_output_tokens`（1–32768）。被调用的模型看不到当前对话，所以提示词需要自带所需材料。它不替代 Agent 自己的模型：系统提示让 Agent 只在用户要求该模型的输出、第二个模型的草稿或批量文案时调用，普通回复仍由 Agent 自己完成。工具返回的文本前带一行 `[grsai <模型>, finish_reason=…]`；回复为空且 `finish_reason` 为 `content_filter` 时报内容审核错误。提示词和回复都不写入 Host 日志。文本模型下拉列出 GrsAI 公开模型列表中的文本模型，列表随在线清单更新，旧列表中保存过的模型仍保留可选。

### 积分余额

GrsAI 控制台「在线体验/文档 → 其他接口」记录了两个余额接口（2026-11-02 核对，地址都在主机根下，不带 `/v1`）：

| 接口 | 请求体 | 返回 |
| --- | --- | --- |
| `POST /client/openapi/getAPIKeyCredits`（获取 APIKey 积分余额） | `{ "apiKey": "sk-..." }` | `{ code: 0, data: { credits }, msg }` |
| `POST /client/openapi/getCredits`（获取账户积分余额） | `{ "token": "..." }`，token 在控制台「用户信息」里获取 | 同上 |

GrsAI 的 Key 分「不限额」（type 0，直接扣账户余额）和「限额」（type 1，有自己的积分额度）两种，创建 Key 默认是不限额。第一个接口返回的是这个 Key 自己的额度，不限额 Key 的额度字段就是 0，所以之前卡片只调第一个接口时，账户里有积分也始终显示「0 积分」，刷新也一样。另外旧代码用 `Number(data.credits)` 解析，`null` 或空值也会变成 0。

现在：

- 卡片 GrsAI 区域的「Key 额度」显示第一个接口的结果。为 0 且 GrsAI 没有说明 Key 类型时，卡片下方说明「不限额 Key 不单独计额度所以是 0，限额 Key 为 0 表示额度已用完」，并提示填写账户 Token。返回里带 `type` 字段（文档未列出）时按它显示「不限额」。
- 填写可选的「账户 Token」后，同时用第二个接口读取「账户余额」。Token 能管理该账户下的 API Key，所以与 Key 一样只存在 Host 凭据记录里，接口和卡片只告诉界面「已保存」，不回传；可以勾选清除，更换 API 地址的域名时会丢弃，需要重新填写。保存时 Token 会被校验一次，无效则整次保存失败并保留原配置。
- 读取失败时显示原因，不再显示 0：`credits` 不是数字时报「GrsAI 返回的数据里没有积分」；业务错误显示对应分类和 GrsAI 的简短原文（例如「Key 无效或不存在 · GrsAI：apikey不存在」）；HTTP 错误附带状态码。原文只在不超过 120 字、不含链接或标记、不含 Key/Token 时才透传（`providerDetail`），否则只显示分类。账户 Token 读取失败时，Key 额度照常显示，账户余额一行显示失败原因。
- 已保存 Key 时，余额在打开该区域和每次保存后通过 `GET /api/image-generation.credits` 读取一次，可以手动刷新；还没保存时，填好 Key（或在已保存的 Key 旁填好 Token）后点「查询余额」，通过 `POST /api/image-generation.credits` 查一次，输入的内容不会被保存。不定时轮询，因为每次读取都是一次对 GrsAI 的请求。接口返回 `{ key: { credits, unlimited? }, account: { credits } | { error } | null }`。

余额显示在 API Key 输入框下方：Key 在这里配置，余额与它直接对应；上游的「账号与余额」页属于 DeepSeek 账号，没有扩展插槽。

## Agnes AI：生图与生视频

[Agnes AI](https://platform.agnes-ai.cn/) 的网关兼容 OpenAI 风格，一个 Key 同时用于生图和生视频。接口按官方文档核对（2026-11-02，[中国站文档](https://wiki.agnes-ai.cn/zh-Hans/docs/overview)，与[国际站文档](https://wiki.agnes-ai.com/zh-Hans/docs/overview)协议一致）：

- 地址：中国站 `https://api.agnes-ai.cn/v1`（默认，对应 platform.agnes-ai.cn），国际站 `https://apihub.agnes-ai.com/v1`；请求头 `Authorization: Bearer <Key>`。
- 生图：`POST /v1/images/generations`，请求体 `{ model, prompt, size: "1K" | "2K" | "3K" | "4K", ratio, return_base64: true }`，读取 `data[0].b64_json`；返回 URL 时下载 `data[0].url`。文档要求 `response_format` 不能放在顶层，所以不发送。预设模型 `agnes-image-2.5-flash`、`agnes-image-2.1-flash`、`agnes-image-2.0-flash`，「获取模型」用 Key 读取 `GET /v1/models`，按名称中的 `image` / `video` 分组。
- 生视频：`POST /v1/videos`，请求体 `{ model, prompt, mode: "text", seconds: "5", size: "720P", aspect_ratio }`（`seconds` 是字符串）。用返回的 `video_id` 轮询 `GET <主机>/agnesapi?video_id=...&model_name=...`（在 `/v1` 之外），`status` 为 `completed` 时下载顶层 `url`，`failed` 报服务商错误（不透传 `error.message`）。轮询间隔 1 秒起逐步放宽到 5 秒，最长 14 分钟；视频模型 `agnes-video-2.5`、`agnes-video-2.5-flash`（Flash 只支持 720P）。旧的 `agnes-video-v2.0` 已于 2026-09-25 下线，未接入。
- 错误：HTTP 401 报 Key 无效，402 报余额或额度不足，400/422 报参数错误，429 报限流；错误正文不透传。

## OpenAI 兼容

用于接入任何实现 OpenAI Images API 的服务（自建网关、聚合平台等）。需要填写 API 地址（通常以 `/v1` 结尾；粘贴完整的 `/images/generations` 地址时保存为基础地址）、API Key 和模型名，「获取模型」读取 `GET /models` 并列出全部模型。

请求为 `POST <地址>/images/generations`，请求体 `{ model, prompt, n: 1, size?, quality? }`：`size` 按[生成参数](#生成参数)里的画布选择生成或不发送，`quality` 默认不发送。不发送 `response_format`，因为 GPT Image 模型会拒绝它；响应里有 `b64_json` 就解码，只有 `url` 时按结果链接规则下载（HTTPS、不带 Key、受体积和像素上限约束）。错误按 HTTP 状态分类，与 OpenAI 相同。只支持生图，不提供生视频和文本生成。

插件的普通日志不进入 Desktop 的 `harness.log`（日志桥只记录警告和错误），所以余额查询、模型清单、保存和三个生成工具的失败都以 warn 级别记录，内容为错误码、HTTP 状态和服务商错误码，不含 Key、提示词或回复。

生图失败时，工具和 Host 日志保留 HTTP 状态、服务商错误码、参数名及请求编号。错误响应最多读取 64 KB，仅提取受限格式的诊断字段；服务商原始错误文本可能回显 Key 或提示词，因此留在 Host 处理。模型根据具体原因反馈，参数错误交由插件修正。

对话直接展示生成图片，点击缩略图可放大，Esc 或点击背景关闭。已有成功生图记录也能预览。预览接口通过 Host 鉴权，按会话中成功的工具结果授权读取对应 PNG，并校验目录、文件类型、体积和 SHA-256；访问留有审计日志。图片以文本资产信息返回给聊天模型，界面预览与模型视觉能力分别处理。

## 独立分发

该目录是可公开分发的 MIT npm 包，包含 Host、Client、Skill 和 `dsh.bundle.patch`。npm registry 发布为单独操作。

在仓库根目录打包：

```sh
npm pack ./packages/dsh-image-generation --pack-destination /absolute/output/directory
```

在具有匹配 Harness 服务的独立 DSH 安装中，可通过 `dsh plugin --profile web add /absolute/path/dsh-image-generation-0.1.0.tgz` 安装。要求 Harness `0.1.2-rc.1` 对应的 settings、credentials、connection、tools、skills、systemPrompt、sandboxPolicy、sandbox、subprocess 和 sessionController 服务。在 Desktop 使用内置版本时，需要先从插件设置启用。

## 凭据与执行边界

配置通过经过 Host 鉴权和 Origin 检查的 `/api/image-generation.settings`、`/api/image-generation.save` 路由读写。API 响应使用 `no-store`，读取接口仅返回 Key 是否已配置。

服务商、模型、地址和 Key 在 `ctx.credentials` 的 `dsh-image-generation/configuration` 私有记录中一次提交。凭据服务的跨进程锁和修订检查防止并发保存覆盖；失败保存保持整个旧记录。使用同一记录使一次工具调用读到一致的配置。通用 settings 仅注册卡片命名空间。Agent 参数、图片、日志和工作区均不携带 Key。

生图通过标准工具执行和审计流程，使用已保存配置直接调用；部署级工具策略继续生效。请求前及落盘前读取当前会话的 sandboxPolicy，要求工作区写权限；输出目录和目标文件拒绝符号链接。实际写入由 `ctx.sandbox` 包装的 `ctx.subprocess` 子进程执行，使用工作区写权限；仅通过 stdin 接收图片字节，清除继承环境，Key 留在 Host。PNG 使用临时文件、原子创建和内容哈希校验，避免并发生图产生半个文件。HTTP 禁止重定向，只接受 HTTPS 地址（本机回环开发服务允许 HTTP），约束超时、响应大小和解码像素；厂商返回的远程 URL 只按上文的结果链接规则下载（GrsAI、Agnes AI、OpenAI 兼容服务），OpenAI 和 Seedream 只接受 base64。系统沙箱的跨平台执行能力以部署环境为准，本期本地验收环境为 macOS arm64。

macOS Desktop 的 Host 运行在 Electron utility process 中；写图子进程显式设置 `ELECTRON_RUN_AS_NODE=1`，使同一可执行文件执行 Node 脚本。该启动常量与 Windows 的 SystemRoot 按需保留，凭据和 NODE_OPTIONS 继续清除。回归同时覆盖普通 Node 和真实 Electron utility process。

## 验证

```sh
npx vitest run test/image-generation.test.mjs test/image-generation-grsai.test.mjs test/image-generation-providers.test.mjs test/image-generation-settings-ui.test.mjs test/desktop-plugin-closure.test.ts
node scripts/verify-image-generation.mjs
node scripts/verify-image-electron.mjs
npm run typecheck
npm test
```

测试使用本机模拟服务和真实 Harness 凭据存储、工具执行管线，覆盖三个服务商、单请求保存、成功/失败、修订冲突、凭据隔离、PNG 落盘、取消、体积限制和目录越界；`test/image-generation-grsai.test.mjs` 用按 GrsAI 任务契约实现的本机模拟服务，覆盖余额校验与积分接口（含未保存 Key 的查询）、在线模型清单的解析与两级回退、坏 Key、新版统一接口与 Veo 旧接口的请求体和轮询、各视频模型的比例与时长、内容审核失败、`video_generate` 落盘 MP4、`text_generate` 请求与错误分类，以及系统提示切换；还覆盖两个余额接口的真实字段（不限额 Key 的 0 额度与账户 Token 余额、`credits` 为 `null` 时报错而非 0、GrsAI 原因透传与回显 Key 时的屏蔽、HTTP 状态）、账户 Token 的保存/保留/清除与校验失败，以及各模型分辨率、质量和默认比例的请求字段。`test/image-generation-providers.test.mjs` 用按 Agnes AI 文档实现的本机网关和一个通用 Images API 服务，覆盖 Agnes 的 Key 校验、模型列表、生图请求体（档位 + 比例 + base64、无顶层 `response_format`）与 URL 回退、`/v1/videos` 加 `/agnesapi` 轮询落盘 MP4，OpenAI 兼容的地址必填、`GET /models` 校验与无模型接口时的「未校验」、请求体的画布与质量、base64 与 URL 两种响应，以及 options 路由和视频服务商的选择。`test/image-generation-settings-ui.test.mjs` 在 jsdom 中覆盖 0 额度说明、账户余额行、失败原因、参数菜单与保存内容。Host smoke 启动隔离实例，验证插件启用后的 Client 入口、鉴权、Origin 及保存结果。真实付费模型与 Office 文档视觉验收需要单独进行。

只按文档或模拟服务验证的部分（没有可用的真实 Key）：

- GrsAI：余额接口的路径、请求体和 `{ data: { credits } }` 字段按控制台文档核对，并用无效 Key 对真实接口确认了 `getAPIKeyCredits` 返回 `apikey不存在`、`getCredits` 用无效 Token 返回 `用户不存在`；有效 Key 下不限额 Key 返回 0、账户 Token 返回真实余额是按文档（创建不限额 Key 时 `credits` 为 0）推断的，未用真实账户确认。各模型的分辨率、质量取值按 apifox 文档，未发起付费生成。
- Agnes AI：生图、生视频请求和返回格式按官方文档，用本机模拟网关验证；用无效 Key 对真实的 `api.agnes-ai.cn` 确认保存校验返回 401 并显示为 Key 无效。未发起真实生成。
- OpenAI 兼容：只用本机模拟服务验证，不同服务对 `size`、`quality` 的接受程度以实际服务为准。
- OpenAI GPT Image 2 / 2.5 的 2K、4K 画布按 OpenAI 的尺寸规则（GrsAI 文档的 VIP 对照表与之相同）计算；Seedream 4K 画布按文档像素范围计算。均未发起付费请求。

接口参考：[OpenAI Images API](https://developers.openai.com/api/reference/resources/images/methods/generate)、[OpenAI 模型列表](https://developers.openai.com/api/reference/resources/models/methods/list)、[火山方舟生图 API](https://www.volcengine.com/docs/82379/1541523)、[火山方舟官方运行时 SDK](https://github.com/volcengine/volcengine-python-sdk/tree/master/volcenginesdkarkruntime/resources/images)、[火山管理接口及签名鉴权](https://github.com/volcengine/volcengine-python-sdk/blob/master/volcenginesdkark/api/ark_api.py)、[GrsAI](https://grsai.ai/zh)（接口文档在登录后的控制台中，新版接口见 [apifox](https://qmy27nhsd9.apifox.cn/llms.txt)）、[Agnes AI 文档](https://wiki.agnes-ai.cn/zh-Hans/docs/overview)（[生图](https://wiki.agnes-ai.cn/zh-Hans/docs/agnes-image-25-flash)、[生视频](https://wiki.agnes-ai.cn/zh-Hans/docs/agnes-video-25)）。
