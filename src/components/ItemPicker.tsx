import { useEffect, useState } from 'react'
import { browseForExe, detectInstalledApps, listSteamGames } from '../api'
import type { DetectedApp, Item, SteamGame } from '../types'

type Tab = 'apps' | 'steam' | 'url'

interface ItemPickerProps {
  onAdd: (items: Item[]) => void
  onClose: () => void
}

function newId() {
  return crypto.randomUUID()
}

export default function ItemPicker({ onAdd, onClose }: ItemPickerProps) {
  const [tab, setTab] = useState<Tab>('apps')
  const [detected, setDetected] = useState<DetectedApp[] | null>(null)
  const [steamGames, setSteamGames] = useState<SteamGame[] | null>(null)
  const [steamError, setSteamError] = useState<string | null>(null)
  const [steamFilter, setSteamFilter] = useState('')
  const [url, setUrl] = useState('')
  const [urlLabel, setUrlLabel] = useState('')

  useEffect(() => {
    detectInstalledApps().then(setDetected).catch(() => setDetected([]))
    listSteamGames()
      .then(setSteamGames)
      .catch((e) => setSteamError(String(e)))
  }, [])

  const addApp = (app: DetectedApp) => {
    onAdd([
      {
        type: 'app',
        id: newId(),
        label: app.label,
        path: app.path,
        args: app.args,
        delayAfterMs: 0,
        enabled: true,
      },
    ])
  }

  const handleBrowse = async () => {
    const path = await browseForExe()
    if (!path) return
    const label = path.split('\\').pop() ?? path
    onAdd([
      {
        type: 'app',
        id: newId(),
        label,
        path,
        args: '',
        delayAfterMs: 0,
        enabled: true,
      },
    ])
  }

  const addSteamGame = (game: SteamGame) => {
    onAdd([
      {
        type: 'steam',
        id: newId(),
        label: game.name,
        steamAppId: game.appId,
        delayAfterMs: 0,
        enabled: true,
      },
    ])
  }

  const addUrl = () => {
    if (!url.trim()) return
    const normalized = /^https?:\/\//i.test(url) ? url.trim() : `https://${url.trim()}`
    onAdd([
      {
        type: 'url',
        id: newId(),
        label: urlLabel.trim() || normalized,
        url: normalized,
        delayAfterMs: 0,
        enabled: true,
      },
    ])
  }

  const filteredSteamGames = (steamGames ?? []).filter((g) =>
    g.name.toLowerCase().includes(steamFilter.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-20" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex border-b border-neutral-800">
          {(['apps', 'steam', 'url'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-3 font-medium ${
                tab === t ? 'text-violet-400 border-b-2 border-violet-400' : 'text-neutral-500'
              }`}
            >
              {t === 'apps' ? 'Apps' : t === 'steam' ? 'Steam games' : 'Website'}
            </button>
          ))}
          <button type="button" onClick={onClose} className="px-4 text-neutral-500 hover:text-neutral-200">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {tab === 'apps' && (
            <div className="space-y-3">
              {detected === null && <p className="text-neutral-500">Scanning for installed apps…</p>}
              {detected?.length === 0 && (
                <p className="text-neutral-500">No known apps detected on this machine.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {detected?.map((app) => (
                  <button
                    key={app.key}
                    type="button"
                    onClick={() => addApp(app)}
                    className="rounded-full border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 text-sm"
                  >
                    {app.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleBrowse}
                className="w-full rounded border border-dashed border-neutral-700 hover:border-neutral-500 px-4 py-3 text-neutral-400 hover:text-neutral-200"
              >
                Browse for .exe…
              </button>
            </div>
          )}

          {tab === 'steam' && (
            <div className="space-y-3">
              {steamError && <p className="text-amber-400 text-sm">{steamError}</p>}
              {steamGames === null && !steamError && (
                <p className="text-neutral-500">Scanning Steam library…</p>
              )}
              {steamGames && (
                <input
                  value={steamFilter}
                  onChange={(e) => setSteamFilter(e.target.value)}
                  placeholder="Search your Steam library…"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
                />
              )}
              {steamGames && steamGames.length === 0 && (
                <p className="text-neutral-500 text-sm">No Steam games found in your library.</p>
              )}
              {steamGames && steamGames.length > 0 && filteredSteamGames.length === 0 && (
                <p className="text-neutral-500 text-sm">No games match "{steamFilter}".</p>
              )}
              <div className="space-y-1">
                {filteredSteamGames.map((game) => (
                  <button
                    key={game.appId}
                    type="button"
                    onClick={() => addSteamGame(game)}
                    className="block w-full text-left rounded px-3 py-2 hover:bg-neutral-800"
                  >
                    {game.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'url' && (
            <div className="space-y-3">
              <input
                value={urlLabel}
                onChange={(e) => setUrlLabel(e.target.value)}
                placeholder="Label (optional)"
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={(e) => setUrl(e.clipboardData.getData('text'))}
                placeholder="https://…"
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={addUrl}
                disabled={!url.trim()}
                className="w-full rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 font-semibold text-white"
              >
                Add website
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
