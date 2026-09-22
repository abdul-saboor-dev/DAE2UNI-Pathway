import StudentProfile from '../models/StudentProfile.js'
import ApiError from '../utils/ApiError.js'

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function applyDefinedUpdates(document, updates, prefix = '') {
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue

    const path = prefix ? `${prefix}.${key}` : key
    if (isPlainObject(value)) {
      applyDefinedUpdates(document, value, path)
    } else {
      document.set(path, value)
    }
  }
}

export async function getProfileForUser(userId) {
  const profile = await StudentProfile.findOne({ user: userId })
  if (!profile) {
    throw new ApiError(404, 'Student profile has not been created yet.', 'PROFILE_NOT_FOUND')
  }
  return profile
}

export async function updateProfileForUser(userId, updates) {
  let profile = await StudentProfile.findOne({ user: userId })

  if (!profile) {
    profile = new StudentProfile({ user: userId })
  }

  applyDefinedUpdates(profile, updates)
  await profile.save()
  return profile
}
