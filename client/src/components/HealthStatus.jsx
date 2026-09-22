import { useEffect, useState } from 'react'
import { getHealth } from '../services/api.js'

const initialHealth = {
  state: 'loading',
  label: 'Checking services…',
  detail: 'Contacting the DAE2UNI API',
}

function HealthStatus() {
  const [health, setHealth] = useState(initialHealth)

  useEffect(() => {
    const controller = new AbortController()

    async function checkHealth() {
      try {
        const response = await getHealth(controller.signal)
        const databaseConnected = response.services.database === 'connected'

        setHealth({
          state: databaseConnected ? 'healthy' : 'warning',
          label: databaseConnected ? 'All systems operational' : 'API is up; database unavailable',
          detail: databaseConnected ? 'Backend and MongoDB are connected' : 'Check the local MongoDB service',
        })
      } catch (error) {
        if (error.name !== 'CanceledError') {
          setHealth({
            state: 'error',
            label: 'Backend unavailable',
            detail: 'Start the server to restore the connection',
          })
        }
      }
    }

    checkHealth()
    return () => controller.abort()
  }, [])

  const dotStyles = {
    loading: 'bg-amber-400 animate-pulse',
    healthy: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink/8 bg-cream/70 p-4" aria-live="polite">
      <span className={`size-3 shrink-0 rounded-full shadow-[0_0_0_5px_rgba(47,143,115,0.12)] ${dotStyles[health.state]}`} />
      <div>
        <p className="font-semibold">{health.label}</p>
        <p className="mt-0.5 text-sm text-ink/55">{health.detail}</p>
      </div>
    </div>
  )
}

export default HealthStatus
