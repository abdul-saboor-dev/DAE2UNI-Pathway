import cors from 'cors'
import express from 'express'
import adminRoutes from './routes/adminRoutes.js'
import authRoutes from './routes/authRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import programRoutes from './routes/programRoutes.js'
import studentRoutes from './routes/studentRoutes.js'
import setupRoutes from './routes/setupRoutes.js'
import universityRoutes from './routes/universityRoutes.js'
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
app.use('/api/auth', authRoutes)
app.use('/api/setup', setupRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/universities', universityRoutes)
app.use('/api/programs', programRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
