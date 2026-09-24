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
    loading: 'bg-amber-700 animate-pulse',
    healthy: 'bg-[#145b42]',
    warning: 'bg-amber-700',
    error: 'bg-[#8b2525]',
  }

  return (
    <div className="flex items-center gap-4 border-l-4 border-gold bg-cream p-4" aria-live="polite">
      <span className={`size-3 shrink-0 rounded-full ${dotStyles[health.state]}`} aria-hidden="true" />
      <div>
        <p className="font-semibold">{health.label}</p>
        <p className="mt-0.5 text-sm text-ink/55">{health.detail}</p>
      </div>
    </div>
  )
}

export default HealthStatus
