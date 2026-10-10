import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { getCampusMapUrl } from '../src/utils/campusMap.js'
import { buildUniversityPayload } from '../src/utils/adminCatalogue.js'
import { buildOpenStreetMapSearchUrl } from '../src/services/openStreetMapApi.js'

const read = (path) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8')
let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function equal(actual, expected, message) { assertions += 1; assert.deepEqual(actual, expected, message) }

const picker = read('src/components/CampusLocationPicker.jsx')
const form = read('src/pages/admin/AdminUniversityFormPage.jsx')
const directory = read('src/components/CampusDirectory.jsx')

for (const contract of ['MapContainer', 'TileLayer', 'useMapEvents', 'draggable', 'latlng', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', 'OpenStreetMap', 'searchOpenStreetMap', 'Location search results']) {
  check(picker.includes(contract), `Location picker retains ${contract}`)
}
check(!picker.includes('carto.com') && !picker.includes('cartocdn.com'), 'Picker has no CARTO tile dependency')
check(form.includes('<CampusLocationPicker') && form.includes('latitude={campus.latitude}') && form.includes('longitude={campus.longitude}'), 'Each campus owns its saved picker coordinates')
check(directory.includes('View on Google Maps') && directory.includes('target="_blank" rel="noopener noreferrer"'), 'Public coordinate link is clearly labelled and opens safely')
check(!picker.includes('google') && !picker.includes('apiKey'), 'Picker uses no Google map service or API key')
check(!picker.includes('<form') && picker.includes('role="search"'), 'Picker avoids nesting a search form inside the university form')
const searchUrl = new URL(buildOpenStreetMapSearchUrl('University of Example, Lahore'))
equal(searchUrl.origin + searchUrl.pathname, 'https://nominatim.openstreetmap.org/search', 'Search uses the OpenStreetMap Nominatim endpoint')
equal(searchUrl.searchParams.get('countrycodes'), 'pk', 'Search is scoped to Pakistan')
equal(searchUrl.searchParams.get('limit'), '10', 'Search results are broader but bounded')
equal(new URL(buildOpenStreetMapSearchUrl('University of Example', { broad: true })).searchParams.get('countrycodes'), null, 'Explicit broader search removes only the country restriction')
equal(buildOpenStreetMapSearchUrl(' '), null, 'Blank searches are rejected before a request')

equal(getCampusMapUrl({ latitude: 31.5204, longitude: 74.3587 }),
  'https://www.google.com/maps/search/?api=1&query=31.5204%2C74.3587', 'Google Maps link uses encoded coordinates')
equal(getCampusMapUrl({ address: 'Legacy address only' }), null, 'Legacy campuses without coordinates keep working without a map link')
equal(getCampusMapUrl({ latitude: 91, longitude: 74 }), null, 'Out-of-range coordinates do not become links')

const payload = buildUniversityPayload({
  name: 'Synthetic University', slug: 'synthetic-university', sector: 'public', institutionType: 'general',
  provinceOrTerritory: 'Punjab', charterAuthority: 'provincial', hecRecognitionStatus: 'unverified', hecProfileUrl: '',
  campuses: [
    { name: 'First Campus', city: 'Lahore', province: 'Punjab', latitude: 31.5, longitude: 74.3, isMainCampus: true, isActive: true },
    { name: 'Legacy Campus', city: 'Multan', province: 'Punjab', latitude: null, longitude: null, isMainCampus: false, isActive: true },
  ],
  recordStatus: 'draft', source: { officialUrl: 'https://example.edu', verificationStatus: 'pending_review', lastVerifiedAt: '' },
  abbreviation: '', establishedYear: '', recognitionBodies: '', contact: {},
}, null, true)
equal(payload.campuses[0].latitude, 31.5, 'Campus latitude is allowlisted into the admin payload')
equal(payload.campuses[0].longitude, 74.3, 'Campus longitude is allowlisted into the admin payload')
check(!Object.hasOwn(payload.campuses[1], 'latitude') && !Object.hasOwn(payload.campuses[1], 'longitude'), 'Missing coordinates are omitted for backward compatibility')

process.stdout.write(`Validated ${assertions} campus-location frontend safeguards.\n`)
