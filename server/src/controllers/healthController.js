import mongoose from 'mongoose'

const connectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
}

export function getHealth(_request, response) {
  const database = connectionStates[mongoose.connection.readyState] || 'unknown'
  const healthy = database === 'connected'

  response.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    services: {
      api: 'up',
      database,
    },
    timestamp: new Date().toISOString(),
  })
}
