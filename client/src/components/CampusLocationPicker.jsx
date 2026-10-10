import { useEffect, useRef, useState } from 'react'
import { icon } from 'leaflet'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { searchOpenStreetMap } from '../services/openStreetMapApi.js'
import 'leaflet/dist/leaflet.css'

const pakistanCenter = [30.3753, 69.3451]
const campusMarkerIcon = icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function MapInteraction({ position, focusPosition, onChange }) {
  const map = useMap()
  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => cancelAnimationFrame(frame)
  }, [map])
  useEffect(() => {
    if (focusPosition) map.flyTo(focusPosition.position, 16)
  }, [focusPosition, map])
  useMapEvents({ click: ({ latlng }) => onChange([latlng.lat, latlng.lng]) })

  if (!position) return null
  return (
    <Marker
      draggable
      eventHandlers={{ dragend: (event) => {
        const point = event.target.getLatLng()
        onChange([point.lat, point.lng])
      } }}
      icon={campusMarkerIcon}
      position={position}
    />
  )
}

export default function CampusLocationPicker({ campusName, initialSearchQuery, latitude, longitude, onChange }) {
  const dialogRef = useRef(null)
  const openerRef = useRef(null)
  const searchControllerRef = useRef(null)
  const savedPosition = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? [latitude, longitude]
    : null
  const [isOpen, setIsOpen] = useState(false)
  const [draftPosition, setDraftPosition] = useState(savedPosition)
  const [focusPosition, setFocusPosition] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchState, setSearchState] = useState('idle')
  const [searchMessage, setSearchMessage] = useState('')
  const [broadSearch, setBroadSearch] = useState(false)

  useEffect(() => {
    if (isOpen && !dialogRef.current?.open) dialogRef.current?.showModal()
  }, [isOpen])

  useEffect(() => () => searchControllerRef.current?.abort(), [])

  function openPicker() {
    setDraftPosition(savedPosition)
    setFocusPosition(null)
    setSearchQuery((initialSearchQuery || campusName || '').slice(0, 160))
    setSearchResults([])
    setSearchState('idle')
    setSearchMessage('')
    setBroadSearch(false)
    setIsOpen(true)
  }

  function closePicker() {
    searchControllerRef.current?.abort()
    dialogRef.current?.close()
    setIsOpen(false)
    openerRef.current?.focus()
  }

  function saveLocation() {
    if (!draftPosition) return
    onChange({ latitude: draftPosition[0], longitude: draftPosition[1] })
    closePicker()
  }

  async function search() {
    if (searchState === 'loading') return
    const normalized = searchQuery.trim()
    if (normalized.length < 2) {
      setSearchState('error')
      setSearchMessage('Enter at least 2 characters to search.')
      return
    }
    searchControllerRef.current?.abort()
    const controller = new AbortController()
    searchControllerRef.current = controller
    setSearchState('loading')
    setSearchMessage('Searching OpenStreetMap…')
    setSearchResults([])
    try {
      const results = await searchOpenStreetMap(normalized, controller.signal, { broad: broadSearch })
      setSearchResults(results)
      setSearchState('ready')
      setSearchMessage(results.length ? `${results.length} location${results.length === 1 ? '' : 's'} found.` : `No matching locations found. Try a shorter official name${broadSearch ? ' or a nearby landmark' : ', or enable broader search'}.`)
    } catch (error) {
      if (error.name === 'AbortError') return
      setSearchState('error')
      setSearchMessage(error.message || 'Location search is temporarily unavailable.')
    }
  }

  function chooseResult(result) {
    const position = [result.latitude, result.longitude]
    setDraftPosition(position)
    setFocusPosition({ position })
    setSearchMessage('Location selected. Confirm the marker position or drag it to adjust.')
  }

  return (
    <div className="min-w-0">
      <button ref={openerRef} type="button" className="action-secondary w-full sm:w-auto" onClick={openPicker}>
        Select location on map
      </button>
      {savedPosition && <p className="mt-2 break-all text-xs text-[var(--ui-muted)]">Saved coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>}
      {isOpen && (
        <dialog
          ref={dialogRef}
          className="campus-location-dialog"
          aria-labelledby="campus-location-title"
          onCancel={(event) => { event.preventDefault(); closePicker() }}
          onClose={() => setIsOpen(false)}
        >
          <div className="min-w-0 p-4 sm:p-6">
            <h2 id="campus-location-title" className="section-title text-2xl text-navy">Select campus location</h2>
            <p className="body-copy mt-2 text-sm">Search for the university or campus, select a result, then drag the marker for precise adjustment{campusName ? ` for ${campusName}` : ''}.</p>
            <div className="mt-5 min-w-0" role="search">
              <label htmlFor="campus-location-search" className="field-label">Search university or campus</label>
              <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row">
                <input id="campus-location-search" className="site-input min-w-0 flex-1" maxLength="160" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search() } }} autoComplete="off" />
                <button type="button" className="action-primary shrink-0" disabled={searchState === 'loading'} onClick={search}>{searchState === 'loading' ? 'Searching…' : 'Search'}</button>
              </div>
              <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--ui-muted)]">
                <input type="checkbox" checked={broadSearch} onChange={(event) => setBroadSearch(event.target.checked)} />
                Broader worldwide search
              </label>
              <p className="text-xs text-[var(--ui-muted)]">Pakistan-only search is recommended. Use broader search when OpenStreetMap has not classified the institution under Pakistan.</p>
            </div>
            <p role={searchState === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mt-2 min-h-5 text-sm ${searchState === 'error' ? 'font-semibold text-red-800' : 'text-[var(--ui-muted)]'}`}>{searchMessage}</p>
            {searchResults.length > 0 && <ul className="campus-location-results mt-2 max-h-40 space-y-1 overflow-y-auto border-y border-[var(--ui-border)] py-2" aria-label="Location search results">
              {searchResults.map((result) => <li key={result.id}><button type="button" className="w-full px-3 py-2 text-left text-sm font-semibold text-navy hover:bg-bluewash focus-visible:outline-3" onClick={() => chooseResult(result)}>{result.label}</button></li>)}
            </ul>}
            <div className="campus-location-map mt-4 overflow-hidden border border-[var(--ui-border)]">
              <MapContainer center={savedPosition || pakistanCenter} zoom={savedPosition ? 15 : 5} scrollWheelZoom className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapInteraction position={draftPosition} focusPosition={focusPosition} onChange={setDraftPosition} />
              </MapContainer>
            </div>
            <p className="mt-2 text-xs text-[var(--ui-muted)]">Search results and map data © OpenStreetMap contributors.</p>
            <p aria-live="polite" className="mt-3 min-h-5 text-sm text-[var(--ui-muted)]">
              {draftPosition ? `Selected: ${draftPosition[0].toFixed(6)}, ${draftPosition[1].toFixed(6)}` : 'No location selected yet.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" className="action-secondary" onClick={closePicker}>Cancel</button>
              <button type="button" className="action-primary" disabled={!draftPosition} onClick={saveLocation}>Use selected location</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
