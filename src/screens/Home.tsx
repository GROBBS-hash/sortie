import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { getLoadouts, launchLoadout } from '../api'
import type { LoadoutsFile, Loadout, LaunchProgress } from '../types'

interface LaunchRowState {
  running: boolean
  current: number
  total: number
  label: string
  failures: number
  finishedAt: number | null
}

interface HomeProps {
  data: LoadoutsFile
  onChange: (data: LoadoutsFile) => void
  onEdit: (loadoutId: string) => void
  onToast: (title: string, message: string) => void
}

function newLoadout(): Loadout {
  return {
    id: crypto.randomUUID(),
    name: 'New Loadout',
    icon: '🎮',
    createdAt: new Date().toISOString(),
    lastLaunchedAt: null,
    launchCount: 0,
    items: [],
  }
}

export default function Home({ data, onChange, onEdit, onToast }: HomeProps) {
  const [launchStates, setLaunchStates] = useState<Record<string, LaunchRowState>>({})
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    const unlisten = listen<LaunchProgress>('launch-progress', (event) => {
      const p = event.payload
      setLaunchStates((prev) => {
        const existing = prev[p.loadoutId] ?? {
          running: false,
          current: 0,
          total: 0,
          label: '',
          failures: 0,
          finishedAt: null,
        }
        if (p.status === 'launching') {
          return {
            ...prev,
            [p.loadoutId]: {
              running: true,
              current: p.index,
              total: p.total,
              label: p.label,
              failures: existing.failures,
              finishedAt: null,
            },
          }
        }
        const isLast = p.index === p.total
        const failures = existing.failures + (p.status === 'ok' ? 0 : 1)
        if (p.status !== 'ok' && p.message) {
          onToast(p.label, p.message)
        }
        if (isLast) {
          getLoadouts().then(onChange).catch(() => {})
        }
        return {
          ...prev,
          [p.loadoutId]: {
            running: !isLast,
            current: p.index,
            total: p.total,
            label: p.label,
            failures,
            finishedAt: isLast ? Date.now() : null,
          },
        }
      })
    })
    return () => {
      unlisten.then((f) => f())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLaunch = (id: string) => {
    setLaunchStates((prev) => ({
      ...prev,
      [id]: { running: true, current: 0, total: 0, label: '', failures: 0, finishedAt: null },
    }))
    launchLoadout(id).catch(() => {})
  }

  const handleCreate = () => {
    const loadout = newLoadout()
    onChange({ ...data, loadouts: [...data.loadouts, loadout] })
    onEdit(loadout.id)
  }

  const handleDuplicate = (loadout: Loadout) => {
    const clone: Loadout = {
      ...loadout,
      id: crypto.randomUUID(),
      name: `${loadout.name} (copy)`,
      createdAt: new Date().toISOString(),
      lastLaunchedAt: null,
      launchCount: 0,
      items: loadout.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
    }
    const index = data.loadouts.findIndex((l) => l.id === loadout.id)
    const loadouts = [...data.loadouts]
    loadouts.splice(index + 1, 0, clone)
    onChange({ ...data, loadouts })
    setOpenMenuId(null)
  }

  const handleDelete = (loadout: Loadout) => {
    setOpenMenuId(null)
    if (!window.confirm(`Delete "${loadout.name}"?`)) return
    onChange({ ...data, loadouts: data.loadouts.filter((l) => l.id !== loadout.id) })
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8">
      <h1 className="text-2xl font-semibold mb-6">
        Load<span className="text-violet-400">Out</span>
      </h1>

      {data.loadouts.length === 0 && (
        <p className="text-neutral-500 mb-4">No loadouts yet — create one to get started.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.loadouts.map((loadout) => {
          const state = launchStates[loadout.id]
          return (
            <div
              key={loadout.id}
              className="relative rounded-lg border border-neutral-800 bg-neutral-900 p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl">{loadout.icon}</div>
                  <div className="font-medium text-lg">{loadout.name}</div>
                  <div className="text-sm text-neutral-500">
                    {loadout.items.length} item{loadout.items.length === 1 ? '' : 's'}
                    {loadout.launchCount > 0 ? ` · launched ${loadout.launchCount}x` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === loadout.id ? null : loadout.id)}
                  className="text-neutral-500 hover:text-neutral-200 px-2"
                  aria-label="Loadout menu"
                >
                  ⋮
                </button>
                {openMenuId === loadout.id && (
                  <div className="absolute right-2 top-10 z-10 rounded border border-neutral-700 bg-neutral-800 shadow-lg text-sm">
                    <button
                      type="button"
                      className="block w-full text-left px-4 py-2 hover:bg-neutral-700"
                      onClick={() => {
                        setOpenMenuId(null)
                        onEdit(loadout.id)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="block w-full text-left px-4 py-2 hover:bg-neutral-700"
                      onClick={() => handleDuplicate(loadout)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="block w-full text-left px-4 py-2 hover:bg-neutral-700 text-red-400"
                      onClick={() => handleDelete(loadout)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={state?.running}
                onClick={() => handleLaunch(loadout.id)}
                className="rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 font-semibold text-white"
              >
                {state?.running
                  ? state.total > 0
                    ? `Launching ${state.current}/${state.total}…`
                    : 'Launching…'
                  : 'LAUNCH'}
              </button>

              {!state?.running && state?.finishedAt && (
                <div className={`text-sm ${state.failures > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {state.failures > 0
                    ? `Launched with ${state.failures} issue${state.failures === 1 ? '' : 's'}`
                    : 'Launched'}
                </div>
              )}
            </div>
          )
        })}

        <button
          type="button"
          onClick={handleCreate}
          className="rounded-lg border border-dashed border-neutral-700 p-4 flex items-center justify-center text-neutral-500 hover:text-neutral-200 hover:border-neutral-500 min-h-[140px]"
        >
          + New Loadout
        </button>
      </div>
    </div>
  )
}
