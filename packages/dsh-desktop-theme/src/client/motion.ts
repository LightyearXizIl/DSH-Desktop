/**
 * One answer to "should the theme hold still?", shared by every animated layer
 * and mirrored in CSS by the same root attribute.
 *
 * By default it follows the system's reduced-motion request. Windows raises
 * that request whenever "Animation effects" is off, which many machines set
 * for performance rather than accessibility; the theme then froze its backdrop
 * on one frame and read as broken. The "Always play" theme setting lets the
 * user overrule the request on purpose; nothing overrules it silently.
 */
export const MOTION_ALWAYS_ATTRIBUTE = 'data-dsh-desktop-motion-always'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** The system's request alone, before the theme setting. */
export function systemPrefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches
}

/** Whether animated layers should render still frames right now. */
export function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.hasAttribute(MOTION_ALWAYS_ATTRIBUTE)) {
    return false
  }
  return systemPrefersReducedMotion()
}

/**
 * Call `listener` when the system request flips (the user toggles Windows
 * "Animation effects" while the app is open).
 * @returns the unsubscribe.
 */
export function onSystemMotionChange(listener: () => void): () => void {
  if (typeof matchMedia !== 'function') return () => {}
  const query = matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
