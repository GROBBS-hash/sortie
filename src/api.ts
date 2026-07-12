import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { LoadoutsFile, DetectedApp, SteamGame } from './types'

export const getLoadouts = () => invoke<LoadoutsFile>('get_loadouts')

export const saveLoadouts = (data: LoadoutsFile) => invoke<void>('save_loadouts', { data })

export const refreshTrayMenu = () => invoke<void>('refresh_tray_menu')

export const launchLoadout = (loadoutId: string) => invoke<void>('launch_loadout', { loadoutId })

export const detectInstalledApps = () => invoke<DetectedApp[]>('detect_installed_apps')

export const listSteamGames = () => invoke<SteamGame[]>('list_steam_games')

export const browseForExe = async (): Promise<string | null> => {
  const result = await open({
    multiple: false,
    directory: false,
    filters: [{ name: 'Executable', extensions: ['exe'] }],
  })
  return typeof result === 'string' ? result : null
}
