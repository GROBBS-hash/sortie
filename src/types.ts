export type Item =
  | { type: 'app'; id: string; label: string; path: string; args: string; delayAfterMs: number; enabled: boolean }
  | { type: 'steam'; id: string; label: string; steamAppId: string; delayAfterMs: number; enabled: boolean }
  | { type: 'url'; id: string; label: string; url: string; delayAfterMs: number; enabled: boolean }

export interface Loadout {
  id: string
  name: string
  icon: string
  createdAt: string
  lastLaunchedAt: string | null
  launchCount: number
  items: Item[]
}

export interface Settings {
  launchOnStartup: boolean
  minimizeToTray: boolean
  defaultDelayMs: number
}

export interface LoadoutsFile {
  version: number
  settings: Settings
  loadouts: Loadout[]
}

export interface LaunchProgress {
  loadoutId: string
  index: number
  total: number
  label: string
  status: 'launching' | 'ok' | 'missing' | 'error'
  message: string | null
}
