# dsh-desktop-theme

DSH Desktop's built-in Liquid Glass theme, with a mica mode (floating glass
panes) and a compatibility mode (native layout on glass surfaces).

The source lives in `src/client/`. `scripts/build-desktop-theme.mjs` bundles it
into the ignored `lib/` directory as the single runtime entry `lib/client.js`.
The generated file is not a second source tree.

- `settings.ts`: Plugins settings page copy and controls
- `settings-model.ts`: persisted settings schema, defaults and range clamping
- `settings-page.ts`: the Liquid Glass tab in Plugins settings
- `theme-css.ts`: the scoped Liquid Glass stylesheet
- `theme.ts`: theme lifecycle, token overrides, wallpaper and settings application
- `tokens.ts`: light/dark alias-token palettes and the glass material tokens
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
root. Seam stamping uses `paintBox` to skip `display: contents` slot wrappers;
the inner root fills the card and supplies content padding. When collapsed,
the zero-width sidebar column clears its card styles and backdrop-filter so
fixed-position caption controls remain visible and unclipped.

Glass panes paint their material on a `::before` plate and the hover tilt
writes `--dsh-desktop-tilt`, which only the plate applies. Never put a
`backdrop-filter` or `transform` on a pane that has fixed-position descendants:
it becomes their containing block and throws tooltips, the Windows caption
toggle and the settings overlay off their anchors. The sidebar tilts like the
other panes, rests while the settings overlay is open, and never tilts as the
collapsed rail.

The material lives in theme override tokens (`--dsh-desktop-glass-*`, halo and
switch colours) with light and dark values; do not add `body[data-ds-dark-theme]`
branches for glass surfaces. Pane opacity starts at a legibility floor and the
frost setting only adds to it. `test/desktop-theme-contrast.test.ts` checks the
text tokens against every fluid bloom; keep it passing when retuning colours.

Behind the conversation the center column stays transparent so the fluid
backdrop remains visible, with a text halo for legibility. Every other center
view floats on one content pane in mica mode; compatibility mode gives the
sidebar and center column full-bleed glass. Center pages, settings sections,
sub-tab panels and modal dialogs share an opacity-only enter animation that
`prefers-reduced-motion` disables.
The layout patch adds only the `data-dsh-desktop-center` marker used to remove
the center divider and shadow; it does not override upstream column geometry.
Theme unmount must never strip `data-dsh-desktop-center`.

Deep surfaces also expose the fluid backdrop: the trajectory view
(`[data-dsh-desktop-trajectory]`) and right sidebar (`[data-sidebar-right-session]`)
have their `--dsw-alias-bg-layer-1` and base backgrounds scoped to transparent.
The Chat heading matches the Workspace heading: no leading glyph, a quiet title,
and actions ordered as search, collapse, and new session at the end.

Update and About dialogs (preload-owned, `src/preload/desktop-update-ui.ts`)
are mounted under `document.body` so they inherit
Harness design tokens. In mica mode they use the theme's glass material,
official panel radius and blur; compatibility mode and the disabled theme keep
the official solid card. Progress copy, ARIA values and the visual progress
fill must all use the same rounded percentage from `updatePercent()`.

Run `npm run theme:build` after client source changes, and
`npm run typecheck` from the repository root to check both the desktop host
code and this package's strict TypeScript sources.
