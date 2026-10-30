export const THEME_RUNTIME_STYLES = String.raw`
[data-dsh-desktop-theme] body { background: transparent; }
[data-dsh-desktop-theme] [data-dsh-desktop-conversation],
[data-dsh-desktop-theme] [data-dsh-desktop-conversation] [data-conversation-scroll],
[data-dsh-desktop-theme] [data-dsh-desktop-conversation] [data-dsh-desktop-inputbar] {
  background: transparent;
}
/* The trajectory split, toolbar and table all paint from the layer-1 token.
   Re-point it inside the view so the same mica backdrop shows through; the
   module's hashed classes are not a public seam. */
[data-dsh-desktop-theme] [data-dsh-desktop-trajectory] {
  --dsw-alias-bg-layer-1: transparent;
  background: transparent;
}
/* The transcript stays on the bare backdrop (no pane, no text shadow); user
   bubbles are its only filled surface and take the raised glass. */
[data-dsh-desktop-float] [data-phase] {
  --dsw-specific-bubble: var(--dsh-desktop-glass-raised);
  --dsw-specific-bubble-highlight: var(--dsh-desktop-glass-raised);
}
/* Delivered-file cards fill with upstream's static neutral greys, which read
   as solid slabs on the glass transcript; they take the raised glass the user
   bubbles use, with a faint hover tint over it. */
[data-dsh-desktop-theme] [data-presented-file] {
  --deliverable-fill: var(--dsh-desktop-glass-raised);
  --deliverable-hover: color-mix(in srgb, var(--dsh-desktop-glass-raised), var(--dsw-alias-label-primary) 6%);
  border-color: var(--dsh-desktop-glass-stroke);
}
/* Upstream's modal mask starts below the Windows caption row, leaving the
   caption unmasked; over the backdrop that cuts a hard seam across the window.
   Run the mask to the top edge. The caption's drag area is already released
   while a dialog is open, and the native window buttons draw above the page. */
[data-dsh-desktop-theme] :has(> [data-shortcut-modal]) {
  --dsh-frame-chrome-top: 0px;
}
/* The trajectory view floats on its own glass pane, inset to line up with
   the floating header above it. The plate is the view's own, so it ends
   above the composer instead of reaching under it; the timeline plot and
   table bands become tiles on that glass. */
[data-dsh-desktop-float] [data-dsh-desktop-trajectory] {
  position: relative;
  isolation: isolate;
  /* The upstream scroll body keeps a 2px right margin the header does not
     have, so the right inset is 2px short of the header's 16px. */
  margin: 8px 14px 12px 16px;
  /* The view area is a column flexbox; auto width stretches inside the inset
     where the module's own width: 100% would overflow it. */
  width: auto;
  border-radius: var(--dsw-radius-xl);
  --dsw-alias-bg-layer-2: var(--dsh-desktop-glass-tile);
  --dsw-alias-bg-layer-3: var(--dsh-desktop-glass-tile);
}
[data-dsh-desktop-float] [data-dsh-desktop-trajectory]::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  border: 1px solid var(--dsh-desktop-glass-stroke);
  border-radius: inherit;
  background: var(--dsh-desktop-glass-fill);
  backdrop-filter: var(--dsh-desktop-glass-filter);
}
/* The right sidebar dock paints its tab host and guide cards from the layer-1
   token. Scope the token to the Session seat so the mica backdrop and fluid
   canvas show through the whole right column; the dock's hashed classes stay
   untouched. */
[data-dsh-desktop-theme] [data-sidebar-right-session] {
  --dsw-alias-bg-layer-1: transparent;
  --dsw-alias-bg-base: transparent;
}
[data-dsh-desktop-theme] [data-sidebar-right-session] [data-dockkit-pane],
[data-dsh-desktop-theme] [data-sidebar-right-session] [data-sidebar-right-guide-entry] {
  background-color: transparent;
}
/* The chat group is a Desktop addition to the workspace tree. Give it the
   same section-header shape as "工作区": no leading glyph, a quiet title and
   the action cluster on the right. Creation stays the last action. */
[data-dsh-desktop-theme] [data-chat-group] {
  box-sizing: border-box;
  height: 36px;
  padding: 0 0 0 4px;
  border-radius: var(--dsw-radius-md);
  background: transparent;
}
[data-dsh-desktop-theme] [data-chat-group] > span.YDXeBa_projectText {
  flex: 1;
  min-width: 0;
}
[data-dsh-desktop-theme] [data-chat-group] > span.YDXeBa_projectText > span {
  color: var(--dsw-alias-label-tertiary);
  font-size: 14px;
  font-weight: 400;
}
[data-dsh-desktop-theme] [data-chat-group] > span.YDXeBa_rowActions {
  display: inline-flex;
  gap: 4px;
  height: 28px;
  margin-left: auto;
}
[data-dsh-desktop-theme] [data-chat-group] > span.YDXeBa_rowActions button {
  width: 28px;
  height: 28px;
  border-radius: var(--dsw-radius-sm);
}
[data-dsh-desktop-theme] [data-chat-group] > span.YDXeBa_rowActions > *:nth-child(1) {
  order: 1;
}
[data-dsh-desktop-theme] [data-chat-group] > span.YDXeBa_rowActions > *:nth-child(3) {
  order: 2;
}
[data-dsh-desktop-theme] [data-chat-group] > span.YDXeBa_rowActions > *:nth-child(2) {
  order: 3;
}
/* Liquid Glass material. The tint, floor, stroke and shadow are scheme-aware
   theme tokens (tokens.ts) published on body, so these derived values are
   declared there too. Over the fluid, the live floor from glass-floor.ts
   (set on html) replaces the fixed one. Frost only adds opacity above it. */
[data-dsh-desktop-theme] body {
  --dsh-desktop-glass-base: var(--dsh-desktop-glass-floor-live, var(--dsh-desktop-glass-floor, 0.74));
  --dsh-desktop-glass-alpha: calc(var(--dsh-desktop-glass-base) + (0.96 - var(--dsh-desktop-glass-base)) * var(--dsh-desktop-frost-ratio, 0.07));
  --dsh-desktop-glass-fill: rgb(var(--dsh-desktop-glass-tint, 255 255 255) / var(--dsh-desktop-glass-alpha));
  --dsh-desktop-glass-raised: rgb(var(--dsh-desktop-glass-tint, 255 255 255) / calc(var(--dsh-desktop-glass-alpha) + 0.06));
  --dsh-desktop-glass-filter: blur(var(--dsh-desktop-blur, 20px)) saturate(180%);
  --dsh-desktop-glass-lift: inset 0 1px 0 var(--dsh-desktop-glass-edge), var(--dsh-desktop-glass-shadow);
}
[data-dsh-desktop-theme] [data-dsh-desktop-frame],
[data-dsh-desktop-theme] [data-dsh-desktop-center],
[data-dsh-desktop-theme] [data-phase],
[data-dsh-desktop-theme] [data-dsh-desktop-details] { background: transparent; }
[data-dsh-desktop-theme] [data-dsh-desktop-center] {
  border-left: 0;
  box-shadow: none;
}

[data-dsh-desktop-float] [data-phase='active'] header {
  position: relative;
  z-index: 8;
}
/* Keep the stock scroll geometry. The upstream -95px pull is tied to its own
   header spacing and clips content when the Desktop caption row is present. */
[data-dsh-desktop-theme] [data-phase] [data-composer-seat] {
  background: none;
}

[data-dsh-desktop-theme] [data-dsh-desktop-ambient] {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background: var(--dsw-alias-bg-base);
}
[data-dsh-desktop-theme] body[data-ds-dark-theme] [data-dsh-desktop-ambient] {
  background: #070d14;
}
/* The brightness control's veil, raised to the reading wash (glass-floor.ts)
   while a conversation is open: mica leaves its text on the bare fluid. */
[data-dsh-desktop-theme] [data-dsh-desktop-ambient]::after {
  content: '';
  position: absolute;
  inset: 0;
  /* Above the whale (z-index 1, multiply-blended in light), so the wash and
     the brightness veil cover every decoration, not only the fluid. */
  z-index: 2;
  pointer-events: none;
  background: rgba(0, 0, 0, max(var(--dsh-desktop-brightness-black, 0), calc(var(--dsh-desktop-text-wash-black, 0) * var(--dsh-desktop-reading, 0))));
  box-shadow: inset 0 0 0 100vmax rgba(255, 255, 255, max(var(--dsh-desktop-brightness-white, 0), calc(var(--dsh-desktop-text-wash-white, 0) * var(--dsh-desktop-reading, 0))));
  transition: background-color 0.4s ease, box-shadow 0.4s ease;
}
[data-dsh-desktop-theme][data-dsh-desktop-reading] {
  --dsh-desktop-reading: 1;
}
[data-dsh-desktop-theme] body > #root {
  position: relative;
  z-index: 2;
}
[data-dsh-desktop-theme] [data-dsh-desktop-fluid-canvas] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 1;
}
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-layer] {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-layer][data-background='fluid'],
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-layer][data-media='video'] {
  background: transparent;
}
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-img],
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-video] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* Without a source the media must not paint: Chromium frames an empty <img>
   with a 1px silver border, which showed as light strips down both window
   edges over the fluid (the title bar and edge fades hid the top and bottom). */
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-img]:not([src]),
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-video]:not([src]) {
  display: none;
}
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-img] {
  filter: blur(var(--dsh-desktop-wallpaper-blur, 0));
}
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-video] {
  filter: blur(var(--dsh-desktop-video-blur, 0));
}
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-layer]::after {
  content: '';
  position: absolute;
  inset: 0;
  /* The legibility wash (wallpaper-legibility.ts) only ever adds to the user's own. */
  background: rgba(0, 0, 0, max(var(--dsh-desktop-video-dim, 0), var(--dsh-desktop-wallpaper-shade, 0)));
  box-shadow: inset 0 0 0 100vmax rgba(255, 255, 255, max(var(--dsh-desktop-wallpaper-frost, 0), var(--dsh-desktop-wallpaper-veil, 0)));
  pointer-events: none;
}
[data-dsh-desktop-theme] [data-dsh-desktop-wallpaper-layer][data-background='fluid']::after {
  display: none;
}

[data-dsh-desktop-theme] [data-dsh-desktop-whale] {
  position: fixed;
  z-index: 1;
  pointer-events: none;
  transform: translate(-50%, -50%);
  mix-blend-mode: screen;
}
[data-dsh-desktop-theme] [data-dsh-desktop-whale][data-scheme='light'] { mix-blend-mode: multiply; }
[data-dsh-desktop-theme] [data-dsh-desktop-whale] canvas { width: 100%; height: 100%; display: block; }
[data-dsh-desktop-theme] [data-dsh-desktop-ambient][data-background='wallpaper'] [data-dsh-desktop-fluid-canvas] { display: none; }
[data-dsh-desktop-theme] [data-dsh-desktop-mesh] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
[data-dsh-desktop-theme] [data-dsh-desktop-ambient][data-critters='off'] [data-desktop-theme-critter] { display: none; }
[data-dsh-desktop-theme] [data-desktop-theme-critter] {
  position: absolute;
  color: rgba(60, 100, 160, 0.28);
  animation: dsh-desktop-fish-drift 12s ease-in-out infinite;
}
[data-dsh-desktop-theme] body[data-ds-dark-theme] [data-desktop-theme-critter] {
  color: rgba(180, 210, 240, 0.25);
}
[data-dsh-desktop-theme] [data-desktop-theme-critter='fish-left'] {
  transform: scaleX(-1);
  animation-name: dsh-desktop-fish-left;
}
[data-dsh-desktop-theme] [data-desktop-theme-critter='bubble'] {
  color: rgba(160, 200, 235, 0.3);
  animation-name: dsh-desktop-bubble-rise;
}
[data-dsh-desktop-theme] [data-desktop-theme-critter='plankton'] {
  color: rgba(120, 170, 230, 0.6);
  animation: dsh-desktop-plankton 5s ease-in-out infinite;
}
@keyframes dsh-desktop-fish-drift {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-5deg); }
  30% { transform: translate3d(40px, -15px, 0) rotate(4deg); }
  70% { transform: translate3d(52px, -18px, 0) rotate(3deg); }
}
@keyframes dsh-desktop-fish-left {
  0%, 100% { transform: translate3d(0, 0, 0) scaleX(-1) rotate(-5deg); }
  30% { transform: translate3d(-34px, -12px, 0) scaleX(-1) rotate(4deg); }
  70% { transform: translate3d(-44px, -15px, 0) scaleX(-1) rotate(3deg); }
}
@keyframes dsh-desktop-bubble-rise {
  0% { transform: translate3d(0, 0, 0); opacity: 0; }
  10% { opacity: 0.5; }
  100% { transform: translate3d(8px, -150px, 0); opacity: 0; }
}
@keyframes dsh-desktop-plankton {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.38; }
}

/* Controls inside a pane are tiles on that glass, not a second filter. */
[data-dsh-desktop-float] [data-dsh-desktop-new-session] {
  border-radius: var(--dsw-radius-md);
  background: var(--dsh-desktop-glass-tile);
  border: 1px solid var(--dsh-desktop-glass-stroke);
  box-shadow: inset 0 1px 0 var(--dsh-desktop-glass-edge);
}
/* Keep the upstream brand geometry and colors; only the content is visible. */
[data-dsh-desktop-float] [data-dsh-desktop-brand] {
  background: none;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
}
/* Windows pins the sidebar toggle to the caption row with position: fixed,
   which is above the floating card's top edge. Seat it in the brand row ahead
   of the wordmark so it belongs to the card; the collapsed rail keeps its
   upstream caption-row position. */
[data-windows-titlebar][data-dsh-desktop-float]
  [data-dsh-desktop-frame]:not([data-sidebar-collapsed]) [data-dsh-desktop-sidebar] [data-window-drag] {
  flex-direction: row-reverse;
  justify-content: flex-end;
  gap: 6px;
}
[data-windows-titlebar][data-dsh-desktop-float]
  [data-dsh-desktop-frame]:not([data-sidebar-collapsed]) [data-dsh-desktop-sidebar] [data-window-drag] > button:last-child {
  position: static;
  flex: none;
}
/* Chat bubbles are not a stable public seam. The generic compat token layer
   still glassifies them; mica mode leaves their stock shape intact. */
[data-dsh-desktop-float] [data-composer-card] {
  position: relative;
  z-index: 8;
  border: 1px solid transparent;
  border-radius: var(--dsw-radius-panel);
  background: none;
}
/* Compatibility's composer is translucent too, and the transcript scrolls
   behind it; without a blur the passing text reads through the placeholder.
   It takes the same frosted plate as mica, without lift or tilt. */
[data-dsh-desktop-compat] [data-composer-card] {
  position: relative;
  isolation: isolate;
  background: none;
}
[data-dsh-desktop-compat] [data-composer-card]::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
  background: var(--dsh-desktop-glass-raised);
  backdrop-filter: var(--dsh-desktop-glass-filter);
}
/* Only a conversation with a title floats its header. The hero header holds
   nothing but the dock toggle, and page headers sit on the content pane. */
[data-dsh-desktop-float] [data-phase='active'] header {
  margin: 12px 16px 0;
  padding: 10px 16px 8px;
  border: 1px solid transparent;
  border-radius: var(--dsw-radius-xl);
  background: none;
}
/* Floating panes paint their glass on a ::before plate. A backdrop-filter on
   the pane itself would make it the containing block for its fixed
   descendants for good, which threw every tooltip inside the sidebar, header
   and composer far off its anchor. The hover tilt (spotlight.ts) transforms
   the whole pane, text included, only while no tooltip or menu is open in it. */
[data-dsh-desktop-float] [data-dsh-desktop-sidebar]::before,
[data-dsh-desktop-float] [data-phase='active'] header::before,
[data-dsh-desktop-float] [data-composer-card]::before {
  content: '';
  position: absolute;
  inset: -1px;
  z-index: -1;
  pointer-events: none;
  border: 1px solid var(--dsh-desktop-glass-stroke);
  border-radius: inherit;
  background: var(--dsh-desktop-glass-fill);
  backdrop-filter: var(--dsh-desktop-glass-filter);
  box-shadow: var(--dsh-desktop-glass-lift);
}
[data-dsh-desktop-float][data-dsh-desktop-press] [data-dsh-desktop-spot],
[data-dsh-desktop-float][data-dsh-desktop-press] [data-dsh-desktop-sidebar] {
  transition: transform 0.1s ease-out;
}
[data-dsh-desktop-float] [data-composer-card]::before {
  background: var(--dsh-desktop-glass-raised);
}
/* The upstream layout owns the sidebar column; the stable inner root is its
   content. Apply the floating glass to the column itself so the card spans
   the full column and the inner root remains free to fill it. */
[data-dsh-desktop-float] [data-dsh-desktop-sidebar] {
  position: relative;
  z-index: 9;
  box-sizing: border-box;
  margin: 12px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--dsw-radius-xl);
  background: none;
  /* The plate may scale past the column while it tilts. */
  overflow: visible;
}
[data-dsh-desktop-float] [data-dsh-desktop-sidebar] [data-dsh-sidebar-root] {
  padding: 10px 12px 14px;
}
/* Collapsed keeps the upstream icon rail. A zero-width grid track cannot host
   a floating card, and a backdrop-filter on it would become the containing
   block for the fixed rail controls and clip them away. */
[data-dsh-desktop-float] [data-dsh-desktop-frame][data-sidebar-collapsed] [data-dsh-desktop-sidebar] {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  backdrop-filter: none;
  overflow: visible;
}
[data-dsh-desktop-float] [data-dsh-desktop-frame][data-sidebar-collapsed] [data-dsh-desktop-sidebar]::before {
  display: none;
}
[data-dsh-desktop-float] [data-dsh-desktop-frame]:not([data-sidebar-collapsed]) [data-dsh-sidebar-root] {
  width: 100% !important;
}
/* The right sidebar's dock floats as its own glass card beside the header and
   composer, inset like the left sidebar. The card rides on the dock host,
   which is what slides in and out, so it travels with the panel instead of
   the panel sweeping across the center as a bare strip. Compatibility mode
   gives the same hosts full-bleed glass like its other columns. */
[data-dsh-desktop-theme] [data-sidebar-right-panel] [data-dockkit-host='dock'],
[data-dsh-desktop-theme] [data-sidebar-right-panel] [data-dockkit-empty] {
  position: relative;
  isolation: isolate;
}
[data-dsh-desktop-float] [data-sidebar-right-panel] [data-dockkit-host='dock'],
[data-dsh-desktop-float] [data-sidebar-right-panel] [data-dockkit-empty] {
  box-sizing: border-box;
  margin: 12px 12px 12px 0;
  border-radius: var(--dsw-radius-xl);
}
[data-dsh-desktop-theme] [data-sidebar-right-panel] [data-dockkit-host='dock']::before,
[data-dsh-desktop-theme] [data-sidebar-right-panel] [data-dockkit-empty]::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: var(--dsh-desktop-glass-fill);
  backdrop-filter: var(--dsh-desktop-glass-filter);
}
[data-dsh-desktop-float] [data-sidebar-right-panel] [data-dockkit-host='dock']::before,
[data-dsh-desktop-float] [data-sidebar-right-panel] [data-dockkit-empty]::before {
  border: 1px solid var(--dsh-desktop-glass-stroke);
  border-radius: inherit;
  box-shadow: var(--dsh-desktop-glass-lift);
}
/* Inside the card the dock's own column rule and square corners go. */
[data-dsh-desktop-float] [data-sidebar-right-panel] [data-dockkit-host='dock'] > *,
[data-dsh-desktop-float] [data-sidebar-right-panel] [data-dockkit-empty] > * {
  border-left-color: transparent;
  border-radius: inherit;
  overflow: hidden;
}
/* Every center view except the conversation (workbench, plugins, tasks, more)
   floats on one content pane beside the sidebar, so page text never lands on
   the bare backdrop. The pane is a pseudo-element: a filter or transform on
   the column itself would become the containing block for its fixed
   popovers. Page roots that paint the base layer turn clear, and cards on the
   pane become glass tiles. */
[data-dsh-desktop-float] [data-dsh-desktop-center]:not(:has([data-phase])) {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  padding: 12px 12px 12px 0;
  --dsw-alias-bg-base: transparent;
  --dsw-alias-bg-layer-1: var(--dsh-desktop-glass-tile);
}
[data-dsh-desktop-float] [data-dsh-desktop-frame][data-sidebar-collapsed] [data-dsh-desktop-center]:not(:has([data-phase])) {
  padding-left: 4px;
}
[data-dsh-desktop-float] [data-dsh-desktop-center]:not(:has([data-phase]))::before,
[data-dsh-desktop-compat] [data-dsh-desktop-sidebar]::before,
[data-dsh-desktop-compat] [data-dsh-desktop-center]::before {
  content: '';
  position: absolute;
  z-index: -1;
  pointer-events: none;
  background: var(--dsh-desktop-glass-fill);
  backdrop-filter: var(--dsh-desktop-glass-filter);
}
[data-dsh-desktop-float] [data-dsh-desktop-center]:not(:has([data-phase]))::before {
  inset: 12px 12px 12px 0;
  border: 1px solid var(--dsh-desktop-glass-stroke);
  border-radius: var(--dsw-radius-xl);
  box-shadow: var(--dsh-desktop-glass-lift);
}
[data-dsh-desktop-float] [data-dsh-desktop-frame][data-sidebar-collapsed] [data-dsh-desktop-center]:not(:has([data-phase]))::before {
  left: 4px;
}
/* Compatibility keeps the native columns and only swaps their surfaces for
   full-bleed glass, so the stock layout and dividers stay as they are. */
[data-dsh-desktop-compat] [data-dsh-desktop-sidebar],
[data-dsh-desktop-compat] [data-dsh-desktop-center] {
  position: relative;
  isolation: isolate;
}
[data-dsh-desktop-compat] [data-dsh-desktop-sidebar]::before,
[data-dsh-desktop-compat] [data-dsh-desktop-center]::before {
  inset: 0;
}
[data-dsh-desktop-compat] [data-dsh-desktop-center]::before {
  border-left: 1px solid var(--dsh-desktop-glass-stroke);
}
[data-dsh-desktop-compat] [data-dsh-desktop-center] {
  --dsw-alias-bg-base: transparent;
}
/* The workbench market banner multiplies a light illustration over the
   platform tone; once that tone is glass the art shows through bright under
   light text. The banner sits on the glass pane instead. */
[data-dsh-desktop-theme] [data-dsh-desktop-center] .dshWbMarketHeader {
  background: transparent;
}
[data-dsh-desktop-float] [data-dsh-desktop-inputbar] { padding-bottom: 12px; }
[data-dsh-desktop-float] [data-composer-card] textarea::placeholder { color: var(--dsw-alias-label-tertiary); }

[data-dsh-desktop-theme][data-dsh-desktop-spotlight] [data-dsh-desktop-spot] {
  position: relative;
  isolation: isolate;
}
/* Spotlight needs a local stacking context, but the active composer seat is
   the scrollport's sticky footer. Keep the upstream position instead of
   pinning the input to the transcript and scrolling it out of view. */
[data-dsh-desktop-theme][data-dsh-desktop-spotlight]
  [data-phase='active'] [data-dsh-desktop-spot][data-composer-seat] {
  position: sticky;
  bottom: 0;
}
[data-dsh-desktop-theme] [data-dsh-desktop-glow] { display: none; }
[data-dsh-desktop-theme][data-dsh-desktop-spotlight] [data-dsh-desktop-glow] {
  display: block;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}
[data-dsh-desktop-theme][data-dsh-desktop-spotlight] [data-dsh-desktop-spot][data-spot-on] [data-dsh-desktop-glow] { opacity: 1; }
[data-dsh-desktop-theme][data-dsh-desktop-spotlight] [data-dsh-desktop-inputbar][data-dsh-desktop-spot] [data-dsh-desktop-glow] { border-radius: var(--dsw-radius-panel); }
/* Modal panels (settings, confirmations) are raised glass. Non-modal popovers
   that also carry role=dialog keep their stock surface. The modal mask behind
   them darkens the backdrop beyond what the live floor was fitted to, so they
   never drop below the fixed floor. */
[data-dsh-desktop-theme] body [role='dialog'][aria-modal='true'] {
  background: rgb(var(--dsh-desktop-glass-tint, 255 255 255) / calc(max(var(--dsh-desktop-glass-floor, 0.74), var(--dsh-desktop-glass-alpha)) + 0.06));
  backdrop-filter: blur(40px) saturate(160%);
}
[data-dsh-desktop-float] [role='treeitem'][aria-selected='true'] {
  box-shadow: inset 2px 0 0 var(--dsw-specific-sidebar-nav-item-active-accent), 0 0 16px rgba(110, 155, 232, 0.14);
}
[data-dsh-desktop-float] [data-dsh-desktop-spot] button:hover:not(:disabled),
[data-dsh-desktop-float] [role='menuitem']:hover:not(:disabled) {
  box-shadow: 0 0 12px rgba(110, 155, 232, 0.16), inset 0 0 0 1px rgba(148, 180, 220, 0.22);
}
[data-dsh-desktop-float] [data-dsh-desktop-add] > button {
  background: var(--dsh-desktop-glass-tile);
  border: 1px solid var(--dsh-desktop-glass-stroke);
  box-shadow: inset 0 1px 0 var(--dsh-desktop-glass-edge);
}
/* Switches: upstream paints the on track with brand-primary, near-white in
   dark mode under a white thumb, and the off track with a faint border tone
   that disappears on glass. Both keep the stock shape and aria-checked hook. */
[data-dsh-desktop-theme] [role='switch'][aria-checked] {
  background: var(--dsh-desktop-switch-off);
  box-shadow: inset 0 0 0 0.5px var(--dsh-desktop-glass-stroke);
}
[data-dsh-desktop-theme] [role='switch'][aria-checked='true'] {
  background: var(--dsh-desktop-switch-on);
  box-shadow: none;
}
[data-dsh-desktop-theme] [data-dsh-desktop-fade] {
  position: fixed;
  left: 0;
  right: 0;
  height: 13px;
  z-index: 7;
  pointer-events: none;
  backdrop-filter: blur(5px);
  background: rgba(255, 255, 255, 0.2);
}
[data-dsh-desktop-theme] body[data-ds-dark-theme] [data-dsh-desktop-fade] { background: rgba(0, 0, 0, 0.15); }
[data-dsh-desktop-theme] [data-dsh-desktop-fade='top'] {
  top: 0;
  -webkit-mask-image: linear-gradient(180deg, black 0%, transparent 100%);
  mask-image: linear-gradient(180deg, black 0%, transparent 100%);
}
[data-dsh-desktop-theme] [data-dsh-desktop-fade='bottom'] {
  bottom: 0;
  -webkit-mask-image: linear-gradient(0deg, black 0%, transparent 100%);
  mask-image: linear-gradient(0deg, black 0%, transparent 100%);
}
[data-dsh-desktop-theme] :focus-visible {
  outline: 2px solid rgba(110, 155, 232, 0.85);
  outline-offset: 1px;
}
[data-dsh-desktop-theme] ::selection { background: rgba(110, 155, 232, 0.35); }
/* Level changes share one motion language in both modes: the conversation
   phases and every center page fade in (opacity only, so a page never
   becomes a containing block for its fixed popovers mid-flight), settings
   sections follow their tab, and modal panels rise into place. */
[data-dsh-desktop-theme] [data-phase='hero'] { animation: dsh-desktop-hero-in 0.32s var(--ds-ease-in-out); }
[data-dsh-desktop-theme] [data-phase='active'] { animation: dsh-desktop-active-in 0.3s var(--ds-ease-in-out); }
[data-dsh-desktop-theme] [data-dsh-desktop-center] > [data-slot='main'] > *,
[data-dsh-desktop-theme] [role='dialog'][aria-modal='true'] [data-slot='settings.section'] > *,
[data-dsh-desktop-theme] [role='dialog'][aria-modal='true'] [role='tabpanel'] {
  animation: dsh-desktop-page-in 0.22s var(--ds-ease-in-out);
}
[data-dsh-desktop-theme] [role='dialog'][aria-modal='true'] { animation: dsh-desktop-dialog-in 0.24s var(--ds-ease-in-out); }
@keyframes dsh-desktop-hero-in { from { opacity: 0; } }
@keyframes dsh-desktop-active-in { from { opacity: 0; } }
@keyframes dsh-desktop-page-in { from { opacity: 0; } }
@keyframes dsh-desktop-dialog-in { from { opacity: 0; transform: translateY(8px) scale(0.985); } }
[data-dsh-desktop-compat] [role='tooltip'] { backdrop-filter: blur(12px); }
/* The system's reduced-motion request, unless the user chose "Always play" (motion.ts). */
@media (prefers-reduced-motion: reduce) {
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [data-phase='hero'],
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [data-phase='active'],
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [data-dsh-desktop-center] > [data-slot='main'] > *,
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [role='dialog'][aria-modal='true'],
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [role='dialog'][aria-modal='true'] [data-slot='settings.section'] > *,
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [role='dialog'][aria-modal='true'] [role='tabpanel'],
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [data-dsh-desktop-ambient],
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [data-desktop-theme-critter] { animation: none; }
  [data-dsh-desktop-float][data-dsh-desktop-press]:not([data-dsh-desktop-motion-always]) [data-dsh-desktop-spot],
  [data-dsh-desktop-float][data-dsh-desktop-press]:not([data-dsh-desktop-motion-always]) [data-dsh-desktop-sidebar],
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [data-dsh-desktop-ambient]::after { transition: none; }
  [data-dsh-desktop-theme]:not([data-dsh-desktop-motion-always]) [data-desktop-theme-critter='bubble'] { opacity: 0; }
}
`
