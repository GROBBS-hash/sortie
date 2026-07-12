export interface Toast {
  id: string
  title: string
  message: string
}

interface ToastsProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export default function Toasts({ toasts, onDismiss }: ToastsProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-lg border border-amber-700/50 bg-neutral-900 shadow-lg p-3 flex items-start gap-3"
        >
          <span className="text-amber-400 mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-neutral-200 text-sm">{toast.title}</div>
            <div className="text-neutral-400 text-xs break-words">{toast.message}</div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-neutral-600 hover:text-neutral-300"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
