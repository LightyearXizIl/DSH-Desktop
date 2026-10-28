# dsh-desktop-theme

DSH Desktop's built-in glass theme.

The source lives in `src/client/`. `scripts/build-desktop-theme.mjs` bundles it
into the ignored `lib/` directory as the single runtime entry `lib/client.js`.
The generated file is not a second source tree.

- `settings.ts`: Plugins settings page copy and controls
- `settings-model.ts`: persisted settings schema, defaults and range clamping
- `settings-page.ts`: the Glass theme tab in Plugins settings
- `theme-css.ts`: the scoped glass-theme stylesheet
- `theme.ts`: theme lifecycle, token overrides, wallpaper and settings application
- `tokens.ts`: light/dark alias-token palettes
- `ambient.ts`: stable DOM seams, fixed background, wallpaper media and critters
- `image-file.ts`: compact image data URLs for picture wallpapers
- `effects.ts`: orchestration for fluid, whale, mesh and pointer effects
- `fluid.ts` / `fluid-interactions.ts` / `fluid-tones.ts`: WebGL fluid background,
  pointer interaction and button ripples
- `whale.ts`: particle whale
- `mesh.ts`: interactive dot mesh
- `spotlight.ts` / `spot-core.ts`: cursor glow and hover tilt
- `index.ts`: client plugin entry

The host half persists settings in the authenticated credential store and
keeps video wallpapers under the Profile's `desktop-theme` directory. Every
mounted effect owns a disposer. Turning the theme off removes the root
attributes, token layer, injected styles, ambient nodes, wallpapers and
animation loops. The settings-page stylesheet follows the plugin lifetime
instead, so the full configuration stays legible while the appearance is off.
Spotlight styling must preserve the upstream sticky position of the active
composer seat; otherwise the input card scrolls away with the transcript.
The generated client bundle follows the same ModuleLoader protocol as the
other in-repo desktop plugins.

Preserve the original Aqua particle whale and small-fish effects. Do not replace
them with a goldfish or a different background scene. The settings page should
reuse Harness's official switches, segmented controls, buttons and design
tokens. Do not add global button, menu, dialog or border-radius overrides that
change unrelated settings panels.

Keep the upstream sidebar geometry: the glass wrapper must not override the
sidebar column's width, margin, padding or collapse position. The brand row is
not a glass surface, and the New Session button only changes its material while
retaining the upstream `100cqw` centering content. Chat controls live on the
Chat heading row and remain visible without hover.

The floating card belongs on the layout's sidebar column, not the inner sidebar
root. The inner root fills that card and supplies its content padding; the
center column stays transparent so the whole fluid backdrop remains visible.

Run `npm run theme:build` after client source changes, and
`npm run typecheck` from the repository root to check both the desktop host
code and this package's strict TypeScript sources.
