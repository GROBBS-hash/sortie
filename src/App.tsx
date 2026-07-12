import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { LoadoutsFile, LaunchProgress } from './types'

function App() {
  const [data, setData] = useState<LoadoutsFile | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    invoke<LoadoutsFile>('get_loadouts')
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    const unlisten = listen<LaunchProgress>('launch-progress', (event) => {
      const p = event.payload
      const line =
        p.status === 'launching'
          ? `Launching ${p.index}/${p.total}: ${p.label}...`
          : `${p.label} — ${p.status}${p.message ? ` (${p.message})` : ''}`
      setLog((prev) => [...prev, line])
    })
    return () => {
      unlisten.then((f) => f())
    }
  }, [])

  const handleLaunch = async (loadoutId: string) => {
    setLog([])
    setError(null)
    try {
      await invoke('launch_loadout', { loadoutId })
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8">
      <h1 className="text-2xl font-semibold mb-6">
        LoadOut <span className="text-violet-400">— milestone 2</span>
      </h1>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!data && !error && <p className="text-neutral-500">Loading loadouts…</p>}

      {data?.loadouts.map((loadout) => (
        <div key={loadout.id} className="mb-6 rounded-lg border border-neutral-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="mr-2">{loadout.icon}</span>
              <span className="font-medium">{loadout.name}</span>
              <span className="ml-2 text-sm text-neutral-500">
                {loadout.items.length} items · launched {loadout.launchCount}x
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleLaunch(loadout.id)}
              className="rounded bg-violet-600 hover:bg-violet-500 px-4 py-2 font-semibold text-white"
            >
              LAUNCH
            </button>
          </div>
          <ul className="text-sm text-neutral-400 space-y-1">
            {loadout.items.map((item) => (
              <li key={item.id}>
                [{item.type}] {item.label}
                {item.delayAfterMs > 0 ? ` (+${item.delayAfterMs}ms)` : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {log.length > 0 && (
        <pre className="rounded bg-neutral-900 p-4 text-sm text-neutral-300 whitespace-pre-wrap">
          {log.join('\n')}
        </pre>
      )}
    </div>
  )
}

export default App
