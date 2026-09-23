import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import AdminSetupState from '../src/models/AdminSetupState.js'
import User from '../src/models/User.js'
import { emailSchema, passwordSchema } from '../src/validation/authValidation.js'

async function main() {
  const [mode, rawEmail, confirmation, extra] = process.argv.slice(2)
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.')
  if (extra) throw new Error('Use one explicit recovery mode and exact target email.')
  const emailResult = emailSchema.safeParse(rawEmail)
  if (!emailResult.success) throw new Error('A valid exact target email is required.')
  const email = emailResult.data
  const recovery = mode === '--recover-owner' && confirmation === undefined
  const migration = mode === '--migrate-legacy-admin' && confirmation === '--confirm-legacy-migration'
  if (!recovery && !migration) throw new Error('Choose --recover-owner or explicitly confirmed --migrate-legacy-admin.')

  let password
  if (recovery) {
    const parsed = passwordSchema.safeParse(process.env.DAE2UNI_OWNER_PASSWORD)
    if (!parsed.success) throw new Error('Set a strong DAE2UNI_OWNER_PASSWORD in this process for recovery.')
    password = parsed.data
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  await User.init()
  if (recovery) {
    const owner = await User.findOne({ role: 'owner' }).select('+ownerMarker')
    if (!owner || owner.email !== email || owner.ownerMarker !== 'permanent_owner') {
      throw new Error('Exact existing Owner account was not found. No account was changed.')
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const result = await User.collection.updateOne(
      { _id: owner._id, role: 'owner', ownerMarker: 'permanent_owner' },
      { $set: { passwordHash, accountStatus: 'active' } },
    )
    if (result.matchedCount !== 1) throw new Error('Owner recovery could not be completed.')
    process.stdout.write('Existing Owner password reset and account activated.\n')
    return
  }

  if (await User.exists({ role: 'owner' })) throw new Error('An Owner already exists. No account was changed.')
  const target = await User.findOne({ email, role: 'admin', accountStatus: 'active' })
  if (!target) throw new Error('Exact active legacy Admin account was not found. No account was changed.')
  try {
    const updated = await User.findOneAndUpdate({ _id: target._id, role: 'admin', accountStatus: 'active' },
      { $set: { role: 'owner', ownerMarker: 'permanent_owner' } }, { new: true, runValidators: true })
    if (!updated) throw new Error('Legacy Owner migration could not be completed.')
  } catch (error) {
    if (error.code === 11000) throw new Error('An Owner already exists. No account was changed.')
    throw error
  }
  await AdminSetupState.updateOne({ _id: 'first-administrator' },
    { $set: { state: 'completed', owner: target._id }, $unset: { claimId: '', leaseUntil: '' } }, { upsert: true })
  process.stdout.write('Selected legacy Admin migrated to permanent Owner.\n')
}

try {
  await main()
} catch (error) {
  const safe = ['MONGODB_URI', 'Use one explicit', 'A valid exact', 'Choose --', 'Set a strong',
    'Exact existing', 'Owner recovery', 'An Owner already', 'Exact active legacy', 'Legacy Owner']
  process.stderr.write(`${safe.some((prefix) => error.message.startsWith(prefix)) ? error.message : 'Owner recovery failed. Check configuration and database connectivity.'}\n`)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
