import { useEffect, useState } from 'react'
import { detectInstalledApps } from '../api'
import type { DetectedApp, Item, Loadout, LoadoutsFile } from '../types'

interface FirstRunProps {
  data: LoadoutsFile
  onChange: (data: LoadoutsFile) => void
  onEdit: (loadoutId: string) => void
  onSkip: () => void
}

export default function FirstRun({ data, onChange, onEdit, onSkip }: FirstRunProps) {
  const [detected, setDetected] = useState<DetectedApp[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    detectInstalledApps()
      .then(setDetected)
      .catch(() => setDetected([]))
  }, [])

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const createLoadout = () => {
    const items: Item[] = (detected ?? [])
      .filter((app) => selected.has(app.key))
      .map((app) => ({
        type: 'app',
        id: crypto.randomUUID(),
        label: app.label,
        path: app.path,
        args: app.args,
        delayAfterMs: 0,
        enabled: true,
      }))

    const loadout: Loadout = {
      id: crypto.randomUUID(),
      name: 'My Loadout',
      icon: '🎮',
      createdAt: new Date().toISOString(),
      lastLaunchedAt: null,
      launchCount: 0,
      items,
    }

    onChange({ ...data, loadouts: [...data.loadouts, loadout] })
    onEdit(loadout.id)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-semibold mb-2">
        Welcome to <span className="text-violet-400">Sortie</span>
      </h1>
      <p className="text-neutral-500 mb-8 max-w-md">
        Let's build your first loadout. Pick anything you found below, or start from scratch.
      </p>

      <div className="w-full max-w-lg">
        {detected === null && <p className="text-neutral-500 mb-6">Scanning for installed apps…</p>}

        {detected?.length === 0 && (
          <p className="text-neutral-500 mb-6">
            Didn't find any known apps on this machine. No worries — add items manually instead.
          </p>
        )}

        {detected && detected.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {detected.map((app) => {
              const isSelected = selected.has(app.key)
              return (
                <button
                  key={app.key}
                  type="button"
                  onClick={() => toggle(app.key)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'border-violet-500 bg-violet-600 text-white'
                      : 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  {isSelected ? '✓ ' : ''}
                  {app.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 items-center">
          <button
            type="button"
            onClick={createLoadout}
            disabled={selected.size === 0}
            className="rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 font-semibold text-white w-full max-w-xs"
          >
            Create my first loadout
          </button>
          <button type="button" onClick={onSkip} className="text-neutral-500 hover:text-neutral-300 text-sm">
            Skip — I'll set it up myself
          </button>
        </div>
      </div>
    </div>
  )
}
