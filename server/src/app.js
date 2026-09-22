import cors from 'cors'
import express from 'express'
import healthRoutes from './routes/healthRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js'

const app = express()

app.disable('x-powered-by')
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  }),
)
app.use(express.json({ limit: '10kb' }))

app.use('/api/health', healthRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
