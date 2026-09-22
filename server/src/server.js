import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'
import connectDatabase from './config/database.js'

const port = Number(process.env.PORT) || 5000
let httpServer
let isShuttingDown = false

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured. Copy .env.example to .env.')
  }

  await connectDatabase(process.env.MONGODB_URI)

  httpServer = app.listen(port, () => {
    console.log(`DAE2UNI API listening on http://localhost:${port}`)
  })
}

async function shutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`${signal} received. Closing application connections...`)

  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()))
    })
  }

  await mongoose.connection.close()
  console.log('Application shut down cleanly.')
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    shutdown(signal)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Error during shutdown:', error.message)
        process.exit(1)
      })
  })
}

startServer().catch((error) => {
  console.error('Unable to start the API:', error.message)
  process.exitCode = 1
})
