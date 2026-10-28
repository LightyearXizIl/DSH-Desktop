export const THEME_RUNTIME_STYLES = String.raw`
[data-dsh-desktop-theme] body { background: transparent; }
[data-dsh-desktop-theme] [data-dsh-desktop-conversation],
[data-dsh-desktop-theme] [data-dsh-desktop-conversation] [data-conversation-scroll],
[data-dsh-desktop-theme] [data-dsh-desktop-conversation] [data-dsh-desktop-inputbar] {
  background: transparent;
}
[data-dsh-desktop-theme] {
  --dsh-desktop-glass-card-light: color-mix(in srgb, rgb(255 255 255) calc(42% * var(--dsh-desktop-frost, 1)), transparent);
  --dsh-desktop-glass-card-dark: color-mix(in srgb, rgb(34 38 47) calc(50% * var(--dsh-desktop-frost, 1)), transparent);
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
[data-dsh-desktop-theme] [data-dsh-desktop-ambient]::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(0, 0, 0, var(--dsh-desktop-brightness-black, 0));
  box-shadow: inset 0 0 0 100vmax rgba(255, 255, 255, var(--dsh-desktop-brightness-white, 0));
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
  background: rgba(0, 0, 0, var(--dsh-desktop-video-dim, 0));
  box-shadow: inset 0 0 0 100vmax rgba(255, 255, 255, var(--dsh-desktop-wallpaper-frost, 0));
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

[data-dsh-desktop-float] [data-dsh-desktop-new-session] {
  border-radius: var(--dsw-radius-md);
  background: color-mix(in srgb, rgb(255 255 255) calc(62% * var(--dsh-desktop-surface-frost, 1)), transparent);
  border: 1px solid rgba(19, 45, 83, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(var(--dsh-desktop-blur, 14px));
}
[data-dsh-desktop-float] body[data-ds-dark-theme] [data-dsh-desktop-new-session] {
  background: color-mix(in srgb, rgb(42 46 56) calc(62% * var(--dsh-desktop-surface-frost, 1)), transparent);
  border-color: rgba(148, 180, 220, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
/* Keep the upstream brand geometry and colors; only the content is visible. */
[data-dsh-desktop-float] [data-dsh-desktop-brand] {
  background: none;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
}
/* Chat bubbles are not a stable public seam. The generic compat token layer
   still glassifies them; mica mode leaves their stock shape intact. */
[data-dsh-desktop-float] [data-composer-card] {
  position: relative;
  z-index: 8;
  border-radius: var(--dsw-radius-panel);
  background: var(--dsh-desktop-glass-card-light);
  border: 1px solid rgba(19, 45, 83, 0.26);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 10px 36px rgba(19, 45, 83, 0.16);
  backdrop-filter: blur(var(--dsh-desktop-blur, 14px));
}
[data-dsh-desktop-float] body[data-ds-dark-theme] [data-composer-card] {
  background: var(--dsh-desktop-glass-card-dark);
  border-color: rgba(148, 180, 220, 0.32);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 10px 36px rgba(2, 6, 14, 0.5);
}
[data-dsh-desktop-float] header {
  margin: 12px 16px 0;
  padding: 10px 16px 8px;
  border: 1px solid rgba(19, 45, 83, 0.26);
  border-bottom-color: transparent;
  border-radius: var(--dsw-radius-xl);
  background: var(--dsh-desktop-glass-card-light);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 10px 34px rgba(19, 45, 83, 0.16);
  backdrop-filter: blur(var(--dsh-desktop-blur, 14px));
}
[data-dsh-desktop-float] body[data-ds-dark-theme] header {
  border-color: rgba(148, 180, 220, 0.32);
  border-bottom-color: transparent;
  background: var(--dsh-desktop-glass-card-dark);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 8px 30px rgba(2, 6, 14, 0.32);
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
  border: 1px solid rgba(19, 45, 83, 0.26);
  border-right: 1px solid rgba(150, 190, 245, 0.65);
  border-radius: var(--dsw-radius-xl);
  background: var(--dsh-desktop-glass-card-light);
  backdrop-filter: blur(var(--dsh-desktop-blur, 14px));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 10px 34px rgba(19, 45, 83, 0.16);
  overflow: hidden;
}
[data-dsh-desktop-float] [data-dsh-desktop-sidebar] > [data-dsh-sidebar-root] {
  padding: 10px 12px 14px;
}
[data-dsh-desktop-float] body[data-ds-dark-theme] [data-dsh-desktop-sidebar] {
  border-color: rgba(148, 180, 220, 0.32);
  border-right-color: rgba(148, 180, 220, 0.2);
  background: var(--dsh-desktop-glass-card-dark);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 8px 30px rgba(2, 6, 14, 0.32);
}
[data-dsh-desktop-float] [data-dsh-desktop-frame][data-sidebar-collapsed] [data-dsh-desktop-sidebar] {
  box-sizing: border-box;
  margin: 12px -12px 12px 12px;
  padding: 0;
  border-radius: var(--dsw-radius-lg);
  transition: margin 150ms var(--ds-ease-in-out), border-radius 150ms var(--ds-ease-in-out), transform 0.1s ease-out;
}
[data-dsh-desktop-float] [data-dsh-desktop-frame]:not([data-sidebar-collapsed]) [data-dsh-sidebar-root] {
  width: 100% !important;
}
[data-dsh-desktop-float] [data-dsh-desktop-inputbar] { padding-bottom: 12px; }
[data-dsh-desktop-float] [data-composer-card] textarea::placeholder { color: rgb(55 64 84 / 0.5); }
[data-dsh-desktop-float] body[data-ds-dark-theme] [data-composer-card] textarea::placeholder { color: rgb(205 216 234 / 0.52); }

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
[data-dsh-desktop-theme][data-dsh-desktop-float] [data-dsh-desktop-sidebar]:has([role='dialog']) { backdrop-filter: none; }
[data-dsh-desktop-float][data-dsh-desktop-press] [data-dsh-desktop-spot] { transition: transform 0.1s ease-out; }
[data-dsh-desktop-theme] body [role='dialog'] {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(50px);
}
[data-dsh-desktop-theme] body[data-ds-dark-theme] [role='dialog'] { background: rgba(17, 26, 39, 0.55); }
[data-dsh-desktop-float] [role='treeitem'][aria-selected='true'] {
  box-shadow: inset 2px 0 0 var(--dsw-specific-sidebar-nav-item-active-accent), 0 0 16px rgba(110, 155, 232, 0.14);
}
[data-dsh-desktop-float] [data-dsh-desktop-spot] button:hover:not(:disabled),
[data-dsh-desktop-float] [role='menuitem']:hover:not(:disabled) {
  box-shadow: 0 0 12px rgba(110, 155, 232, 0.16), inset 0 0 0 1px rgba(148, 180, 220, 0.22);
}
[data-dsh-desktop-float] [data-dsh-desktop-add] > button {
  background: color-mix(in srgb, rgb(255 255 255) calc(40% * var(--dsh-desktop-frost, 1)), transparent);
  border: 1px solid rgba(19, 45, 83, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(var(--dsh-desktop-blur, 14px));
}
[data-dsh-desktop-float] body[data-ds-dark-theme] [data-dsh-desktop-add] > button {
  background: color-mix(in srgb, rgb(42 46 56) calc(40% * var(--dsh-desktop-frost, 1)), transparent);
  border-color: rgba(148, 180, 220, 0.25);
}
[data-dsh-desktop-float] [role='menu'] {
  background: color-mix(in srgb, rgb(255 255 255) calc(62% * var(--dsh-desktop-frost, 1)), transparent);
  backdrop-filter: blur(var(--dsh-desktop-blur, 14px));
}
[data-dsh-desktop-float] body[data-ds-dark-theme] [role='menu'] {
  background: color-mix(in srgb, rgb(28 32 42) calc(68% * var(--dsh-desktop-frost, 1)), transparent);
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
[data-dsh-desktop-theme] [data-conversation-scroll] { text-shadow: 0 0 1px rgba(0, 0, 0, 0.4); }
[data-dsh-desktop-theme] body:not([data-ds-dark-theme]) [data-conversation-scroll] {
  text-shadow: 0 0 1px rgba(255, 255, 255, 0.55), 0 1px 2px rgba(19, 45, 83, 0.08);
}
[data-dsh-desktop-float] [data-phase='hero'] { animation: dsh-desktop-hero-in 0.32s var(--ds-ease-in-out); }
[data-dsh-desktop-float] [data-phase='active'] { animation: dsh-desktop-active-in 0.3s var(--ds-ease-in-out); }
[data-dsh-desktop-float] [role='dialog'] { animation: dsh-desktop-dialog-in 0.24s var(--ds-ease-in-out); }
@keyframes dsh-desktop-hero-in { from { opacity: 0; } }
@keyframes dsh-desktop-active-in { from { opacity: 0; } }
@keyframes dsh-desktop-dialog-in { from { opacity: 0; transform: translateY(8px) scale(0.985); } }
[data-dsh-desktop-compat] [role='menu'],
[data-dsh-desktop-compat] [role='dialog'],
[data-dsh-desktop-compat] [role='tooltip'] { backdrop-filter: blur(12px); }
@media (prefers-reduced-motion: reduce) {
  [data-dsh-desktop-float] [data-phase='hero'],
  [data-dsh-desktop-float] [data-phase='active'],
  [data-dsh-desktop-float] [role='dialog'],
  [data-dsh-desktop-theme] [data-dsh-desktop-ambient],
  [data-dsh-desktop-theme] [data-desktop-theme-critter] { animation: none; }
  [data-dsh-desktop-theme] [data-desktop-theme-critter='bubble'] { opacity: 0; }
}
`
