/**
 * Lowest dshmarket this Harness baseline is known to run with.
 *
 * Builds before 1.67.0 declare `@deepseek-ai/dsh-settings` peers that stop at
 * 0.1.x, so `dsh plugin install` on Harness 0.2 rejects them, and their only
 * way in is a settings section Desktop hides; 1.67.0 adds the Harness 0.2 peer
 * range, its own Built-in plugins tab and the sidebar panel. 1.71.1 is the
 * build exercised against 0.2.1-rc.4. Raise this with every Harness upgrade
 * that changes the market's peer range, together with
 * RECOMMENDED_MARKET_VERSION in dsh-desktop-market-installer.
 *
 * Kept apart from market-baseline.ts so the generation migration can read it
 * without importing the upgrade path, which already imports the migration.
 */
export const VERIFIED_MARKET_BASELINE = '1.71.1'
