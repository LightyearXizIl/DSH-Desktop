# dsh-startup-screen

DSH Desktop 内置的 Harness 启动动画。源码来自
[6shenhonghong9/dsh-startup-screen](https://github.com/6shenhonghong9/dsh-startup-screen)
的 `1.1.2` 版本，并按 Desktop 的宿主插件结构整理。

- `index.js`：Harness 宿主侧，注册启动动画、音频和配置路由。
- `client.js`：「设置 → 内置插件 → 启动动画」子页签，使用官方 Switch 和设置页的行式布局。
- `splash.js`、`splash.css`、`assets/`：浏览器侧动画与音频。
- 配置默认写入 `$DSH_HOME/dsh-startup.json`。
- 默认身份资料：身份名称 `NullPointer`、身份编号 `007`、权限等级 `01`。

该插件只在普通 Desktop Profile 中组合；Safe Mode 不加载它。

## 来源与素材边界

上游 README 说明音频和视觉风格来自第三方作品，MIT 仅覆盖作者原创的代码与文案。
本仓库保留其 `LICENSE` 和 README 中的权利说明。若对外分发或商业使用，需要先
确认第三方素材授权。
