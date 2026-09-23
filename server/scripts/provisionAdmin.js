import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import User from '../src/models/User.js'
import { registerRequestSchema } from '../src/validation/authValidation.js'

async function main() {
  const [name, email] = process.argv.slice(2)
  const password = process.env.DAE2UNI_ADMIN_PASSWORD
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.')
  if (!password) throw new Error('Set DAE2UNI_ADMIN_PASSWORD in this process only before running the command.')

  const parsed = registerRequestSchema.safeParse({
    body: { name, email, password }, params: {}, query: {},
  })
  if (!parsed.success) {
    const descriptions = [...new Set(parsed.error.issues.map((issue) => issue.message))]
    throw new Error(`Invalid administrator details: ${descriptions.join(' ')}`)
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  const normalizedEmail = parsed.data.body.email
  if (await User.exists({ email: normalizedEmail })) {
    throw new Error('An account with that email already exists. No account was changed.')
  }
  const passwordHash = await bcrypt.hash(parsed.data.body.password, 12)
  await User.create({ name: parsed.data.body.name, email: normalizedEmail, passwordHash, role: 'admin', accountStatus: 'active' })
  process.stdout.write('Active administrator created. Keep the password secure.\n')
}

try {
  await main()
} catch (error) {
  if (error.code === 11000) process.stderr.write('Account already exists. No account was changed.\n')
  else if (error.message.startsWith('Invalid administrator details:') || error.message.startsWith('An account with') || error.message.startsWith('Set DAE2UNI') || error.message.startsWith('MONGODB_URI')) process.stderr.write(`${error.message}\n`)
  else process.stderr.write('Administrator provisioning failed. Check database connectivity and try again.\n')
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
