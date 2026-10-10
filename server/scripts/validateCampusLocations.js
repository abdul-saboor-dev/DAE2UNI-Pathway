import assert from 'node:assert/strict'
import process from 'node:process'
import University from '../src/models/University.js'
import { createUniversityRequestSchema } from '../src/validation/catalogueValidation.js'
import { toAdminUniversity, toPublicUniversity } from '../src/utils/catalogueSerializers.js'

let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function equal(actual, expected, message) { assertions += 1; assert.deepEqual(actual, expected, message) }

const universityBody = (campuses) => ({
  name: 'Campus Location Validation University',
  slug: 'campus-location-validation-university',
  sector: 'public',
  institutionType: 'general',
  campuses,
  source: { officialUrl: 'https://example.edu/location-source', verificationStatus: 'pending_review' },
  recordStatus: 'draft',
})
const campus = (overrides = {}) => ({
  name: 'Main Campus', city: 'Lahore', province: 'Punjab', isMainCampus: true, isActive: true, ...overrides,
})
const request = (body) => ({ body, params: {}, query: {} })

check(createUniversityRequestSchema.safeParse(request(universityBody([campus({ latitude: 31.5204, longitude: 74.3587 })]))).success, 'Strict create validation accepts a coordinate pair')
check(createUniversityRequestSchema.safeParse(request(universityBody([campus()]))).success, 'Legacy campus payload remains valid without coordinates')
check(!createUniversityRequestSchema.safeParse(request(universityBody([campus({ latitude: 31.5204 })]))).success, 'Latitude cannot be supplied without longitude')
check(!createUniversityRequestSchema.safeParse(request(universityBody([campus({ longitude: 74.3587 })]))).success, 'Longitude cannot be supplied without latitude')
check(!createUniversityRequestSchema.safeParse(request(universityBody([campus({ latitude: 91, longitude: 74 })]))).success, 'Out-of-range latitude is rejected')
check(!createUniversityRequestSchema.safeParse(request(universityBody([campus({ latitude: 31, longitude: 181 })]))).success, 'Out-of-range longitude is rejected')
check(!createUniversityRequestSchema.safeParse(request(universityBody([campus({ location: { latitude: 31, longitude: 74 } })]))).success, 'Unknown nested coordinate fields remain rejected')

const document = new University(universityBody([
  campus({ latitude: 31.5204, longitude: 74.3587 }),
  campus({ name: 'Second Campus', city: 'Rawalpindi', latitude: 33.5651, longitude: 73.0169, isMainCampus: false }),
]))
await document.validate()
equal(document.campuses[0].latitude, 31.5204, 'Model stores first campus latitude independently')
equal(document.campuses[1].longitude, 73.0169, 'Model stores second campus longitude independently')

const admin = toAdminUniversity(document)
const publicRecord = toPublicUniversity(document)
equal(admin.campuses.map(({ latitude, longitude }) => [latitude, longitude]), [[31.5204, 74.3587], [33.5651, 73.0169]], 'Admin serialization preserves per-campus coordinates')
equal(publicRecord.campuses.map(({ latitude, longitude }) => [latitude, longitude]), [[31.5204, 74.3587], [33.5651, 73.0169]], 'Public serialization exposes only the safe coordinate pair')

const legacy = new University(universityBody([campus()]))
await legacy.validate()
const legacyCampus = toPublicUniversity(legacy).campuses[0]
check(!Object.hasOwn(legacyCampus, 'latitude') && !Object.hasOwn(legacyCampus, 'longitude'), 'Legacy serialization omits absent coordinates')

const incomplete = new University(universityBody([campus({ latitude: 31.5204 })]))
await assert.rejects(incomplete.validate(), /latitude and longitude must be provided together/i)
assertions += 1

process.stdout.write(`Validated ${assertions} campus-location backend safeguards.\n`)
