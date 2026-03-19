import { useEffect, useState } from 'react'
import { onConnectivityChange } from '@/services/sync'

function ArrowLeftIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function OnlineBadge() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => onConnectivityChange(() => setOnline(navigator.onLine)), [])
  return (
    <span className={`px-2 py-1 rounded text-xs ${online
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

export default function Header({ onBack, title = 'Inventario', showBack = true }) {
  return (
    <header className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={onBack} title="Volver" className="p-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">
            <ArrowLeftIcon />
          </button>
        )}
        <h2 className="text-xl font-semibold text-black dark:text-white">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        <OnlineBadge />
      </div>
    </header>
  )
}
