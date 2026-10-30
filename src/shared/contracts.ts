import type { PluginStartupFailure } from './plugin-startup-failure'

export type RuntimePhase =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'stopping'
  | 'failed'

export interface RuntimeSnapshot {
  phase: RuntimePhase
  message: string
  launchDirectory?: string
  logs: string[]
  url?: string
  /** Per-process launch token; only `GET /?token=` exchanges it for a session cookie. */
  authToken?: string
  pluginFailures?: PluginStartupFailure[]
  /** Desktop-owned failure classification; Harness-reported causes stay in `message`/`pluginFailures`. */
  failureReason?: 'startup-timeout'
}

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error'
  | 'unsupported'

export interface UpdateStatus {
  phase: UpdatePhase
  currentVersion: string
  availableVersion?: string
  percent?: number
  message?: string
  manual: boolean
  source?: 'startup' | 'runtime' | 'manual'
  /** Changes only when the user explicitly requests another presentation. */
  presentationId?: number
  locale?: 'en' | 'zh'
  /** Plain text only; render without interpreting HTML from update metadata. */
  releaseNotes?: string
  /** The GitHub Release page for the offered version. */
  releaseUrl?: string
  /** Set while an explicitly chosen older version is being installed. */
  downgrade?: boolean
}

/** One past release the user may install or roll back to, from the update index. */
export interface AvailableRelease {
  version: string
  tag: string
  archiveUrl: string
  prerelease?: boolean
}

/** Published notes of the running Desktop version, for the About page. */
export interface CurrentReleaseNotes {
  version: string
  /** Markdown body of the GitHub Release; absent when the version has none or was never published. */
  notes?: string
  /** The GitHub Release page for this version. */
  url: string
}
