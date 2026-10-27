export type StartupSplashReason = 'normal-launch' | 'safe-mode' | 'web-import'

/**
 * The normal Profile renders the bundled startup animation from the Harness
 * page. Showing the native splash first would produce two startup screens in
 * sequence. Recovery and import flows still need a local page while Harness is
 * unavailable or being replaced.
 */
export function shouldShowNativeSplash(reason: StartupSplashReason): boolean {
  return reason !== 'normal-launch'
}
