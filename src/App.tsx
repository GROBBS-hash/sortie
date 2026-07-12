import { useEffect, useRef, useState } from 'react'
import { getLoadouts, saveLoadouts } from './api'
import type { LoadoutsFile } from './types'
import Home from './screens/Home'
import Editor from './screens/Editor'

type Screen = { name: 'home' } | { name: 'editor'; loadoutId: string }

function App() {
  const [data, setData] = useState<LoadoutsFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
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
      saveLoadouts(next).catch((e) => setError(String(e)))
    }, 300)
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

  if (screen.name === 'editor') {
    return (
      <Editor
        data={data}
        loadoutId={screen.loadoutId}
        onChange={handleChange}
        onBack={() => setScreen({ name: 'home' })}
      />
    )
  }

  return <Home data={data} onChange={handleChange} onEdit={(loadoutId) => setScreen({ name: 'editor', loadoutId })} />
}

export default App
