import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getLoadouts, saveLoadouts, refreshTrayMenu } from './api'
import type { LoadoutsFile } from './types'
import Home from './screens/Home'
import Editor from './screens/Editor'
import FirstRun from './screens/FirstRun'
import Toasts, { type Toast } from './components/Toasts'

type Screen = { name: 'home' } | { name: 'editor'; loadoutId: string }

function App() {
  const [data, setData] = useState<LoadoutsFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [skipFirstRun, setSkipFirstRun] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getLoadouts()
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])

  const handleChange = (next: LoadoutsFile) => {
    setData(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveLoadouts(next)
        .then(refreshTrayMenu)
        .catch((e) => setError(String(e)))
    }, 300)
  }

  const pushToast = (title: string, message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, title, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 6000)
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-red-400 flex items-center justify-center p-8">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-500 flex items-center justify-center">
        Loading…
      </div>
    )
  }

  let content: ReactNode

  if (screen.name === 'editor') {
    content = (
      <Editor
        data={data}
        loadoutId={screen.loadoutId}
        onChange={handleChange}
        onBack={() => setScreen({ name: 'home' })}
      />
    )
  } else if (data.loadouts.length === 0 && !skipFirstRun) {
    content = (
      <FirstRun
        data={data}
        onChange={handleChange}
        onEdit={(loadoutId) => setScreen({ name: 'editor', loadoutId })}
        onSkip={() => setSkipFirstRun(true)}
      />
    )
  } else {
    content = (
      <Home
        data={data}
        onChange={handleChange}
        onEdit={(loadoutId) => setScreen({ name: 'editor', loadoutId })}
        onToast={pushToast}
      />
    )
  }

  return (
    <>
      {content}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}

export default App
