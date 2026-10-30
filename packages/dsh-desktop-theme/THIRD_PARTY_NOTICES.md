# Third-party notices

The glass-theme implementation is derived from
`WYH66666666/DSH-Transparent-UI-Plugin` (Aqua), with permission from the
rights holder to modify and use it commercially in DSH Desktop.

The original project was published under the MIT license and later changed its
repository license file to AGPL-3.0. The authorization above is the basis for
using this derived implementation here. This notice does not change the
license of DSH Desktop or of the upstream project.

## Reasoning effort slider

`src/client/effort-slider/slider.js` is adapted from
[`Microqian2th/dsh-codex-effort-slider`](https://github.com/Microqian2th/dsh-codex-effort-slider)
v1.1.4 (commit `fc5a994`). DSH Desktop runs it as part of this theme, stores its
settings with the theme, removes the right-click settings panel, routes its copy
through `ctx.locale`, restyles it after the Codex slider (pill track, round
knob, blue below the top level and a violet nebula at the top level), and adds
a Claude Code style whose pixel field (`pixel-field.ts`) is written for DSH
Desktop. The file header lists the changes. It is used under the following
license:

```text
MIT License

Copyright (c) 2026 dsh-codex-effort-slider contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
