import { useRef, useState } from 'react'
import type { Item, Loadout, LoadoutsFile } from '../types'
import ItemPicker from '../components/ItemPicker'

const EMOJI_PRESETS = ['🎮', '🗡️', '🏆', '🔫', '🧙', '🏰', '🚀', '⚔️', '🎯', '🃏', '🛡️', '🐉']

interface EditorProps {
  data: LoadoutsFile
  loadoutId: string
  onChange: (data: LoadoutsFile) => void
  onBack: () => void
}

function itemSummary(item: Item): string {
  switch (item.type) {
    case 'app':
      return item.path
    case 'steam':
      return `steam://rungameid/${item.steamAppId}`
    case 'url':
      return item.url
  }
}

export default function Editor({ data, loadoutId, onChange, onBack }: EditorProps) {
  const loadout = data.loadouts.find((l) => l.id === loadoutId)
  const [pickerOpen, setPickerOpen] = useState(false)
  const dragIndex = useRef<number | null>(null)

  if (!loadout) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8">
        <p>Loadout not found.</p>
        <button type="button" onClick={onBack} className="text-violet-400 underline mt-4">
          Back
        </button>
      </div>
    )
  }

  const updateLoadout = (patch: Partial<Loadout>) => {
    onChange({
      ...data,
      loadouts: data.loadouts.map((l) => (l.id === loadoutId ? { ...l, ...patch } : l)),
    })
  }

  const updateItems = (items: Item[]) => updateLoadout({ items })

  const updateItem = (itemId: string, patch: Partial<Item>) => {
    updateItems(
      loadout.items.map((item) => (item.id === itemId ? ({ ...item, ...patch } as Item) : item)),
    )
  }

  const removeItem = (itemId: string) => {
    updateItems(loadout.items.filter((item) => item.id !== itemId))
  }

  const addItems = (newItems: Item[]) => {
    updateItems([...loadout.items, ...newItems])
    setPickerOpen(false)
  }

  const handleDrop = (targetIndex: number) => {
    const from = dragIndex.current
    dragIndex.current = null
    if (from === null || from === targetIndex) return
    const items = [...loadout.items]
    const [moved] = items.splice(from, 1)
    items.splice(targetIndex, 0, moved)
    updateItems(items)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8">
      <button type="button" onClick={onBack} className="text-neutral-500 hover:text-neutral-200 mb-6">
        ← Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <select
          value={loadout.icon}
          onChange={(e) => updateLoadout({ icon: e.target.value })}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-2 text-xl"
        >
          {(EMOJI_PRESETS.includes(loadout.icon) ? EMOJI_PRESETS : [loadout.icon, ...EMOJI_PRESETS]).map(
            (emoji) => (
              <option key={emoji} value={emoji}>
                {emoji}
              </option>
            ),
          )}
        </select>
        <input
          value={loadout.name}
          onChange={(e) => updateLoadout({ name: e.target.value })}
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-xl font-medium"
          placeholder="Loadout name"
        />
      </div>

      <div className="space-y-2 mb-4">
        {loadout.items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => {
              dragIndex.current = index
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className="flex items-center gap-3 rounded border border-neutral-800 bg-neutral-900 px-3 py-2 cursor-move"
          >
            <span className="text-neutral-600">⠿</span>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(e) => updateItem(item.id, { enabled: e.target.checked })}
              title="Enabled"
            />
            <span className="text-xs uppercase text-neutral-500 w-12">{item.type}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate">{item.label}</div>
              <div className="truncate text-xs text-neutral-500">{itemSummary(item)}</div>
            </div>
            <label className="flex items-center gap-1 text-xs text-neutral-500">
              delay
              <input
                type="number"
                min={0}
                step={500}
                value={item.delayAfterMs}
                onChange={(e) =>
                  updateItem(item.id, { delayAfterMs: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-20 bg-neutral-800 border border-neutral-700 rounded px-2 py-1"
              />
              ms
            </label>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-neutral-500 hover:text-red-400 px-2"
              aria-label="Remove item"
            >
              ✕
            </button>
          </div>
        ))}

        {loadout.items.length === 0 && (
          <p className="text-neutral-600 text-sm py-6 text-center">No items yet. Add one below.</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-4 py-2"
      >
        + Add item
      </button>

      {pickerOpen && <ItemPicker onAdd={addItems} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
