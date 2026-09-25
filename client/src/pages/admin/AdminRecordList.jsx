import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminHeading, AdminState, ConfirmDialog, StatusBadge, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import Pagination from '../../components/Pagination.jsx'
import useCatalogueList from '../../hooks/useCatalogueList.js'
import { cataloguePageHref } from '../../utils/catalogueQuery.js'
import { getApiErrorMessage } from '../../utils/apiErrors.js'
import { isPublicRecord } from '../../utils/adminCatalogue.js'
import { getAdminUniversity } from '../../services/adminCatalogueApi.js'
import { charterAuthorities, hecRecognitionStatuses, physicalLocations } from '../../utils/geography.js'

const controls = {
  sector: [['', 'All sectors'], ['public', 'Public'], ['private', 'Private']],
  provinceOrTerritory: [['', 'All locations'], ...physicalLocations.map((value) => [value, value])],
  charterAuthority: [['', 'All charter authorities'], ...charterAuthorities.map((value) => [value, value])],
  hecRecognitionStatus: [['', 'All HEC states'], ...hecRecognitionStatuses.map((value) => [value, value.replaceAll('_', ' ')])],
  institutionType: [['', 'All types'], ['general', 'General'], ['engineering', 'Engineering'], ['technology', 'Technology'], ['specialized', 'Specialized']],
  credentialType: [['', 'All credentials'], ['BS', 'BS'], ['BSc', 'BSc'], ['BE', 'BE'], ['BTech', 'BTech'], ['ADP', 'ADP'], ['other', 'Other']],
  degreeLevel: [['', 'All levels'], ['undergraduate', 'Undergraduate']],
  studyMode: [['', 'All modes'], ['morning', 'Morning'], ['evening', 'Evening'], ['weekend', 'Weekend'], ['multiple', 'Multiple']],
  verificationStatus: [['', 'All verification states'], ['unverified', 'Unverified'], ['pending_review', 'Pending review'], ['verified', 'Verified'], ['needs_update', 'Needs update'], ['unavailable', 'Unavailable']],
}
const labels = { sector: 'Sector', provinceOrTerritory: 'Primary location', charterAuthority: 'Charter authority', hecRecognitionStatus: 'HEC recognition', institutionType: 'Institution type', credentialType: 'Credential type', degreeLevel: 'Degree level', studyMode: 'Study mode', verificationStatus: 'Verification', recordStatus: 'Publication status' }

export default function AdminRecordList({ kind, definition, load, remove }) {
  const isUniversity = kind === 'university'
  const plural = isUniversity ? 'universities' : 'programs'
  const base = `/admin/${plural}`
  const list = useCatalogueList({ definition, load, pageSize: 20 })
  const [target, setTarget] = useState(null)
  const [deleted, setDeleted] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [parentRecords, setParentRecords] = useState({})
  const [universityInput, setUniversityInput] = useState(list.query.university || '')
  useEffect(() => { setUniversityInput(list.query.university || '') }, [list.query.university])
  useEffect(() => {
    if (isUniversity || list.status !== 'ready') return undefined
    const controller = new AbortController()
    let active = true
    const ids = [...new Set(list.items.map((item) => item.university?.id).filter(Boolean))]
    Promise.all(ids.map(async (id) => [id, await getAdminUniversity(id, controller.signal)]))
      .then((entries) => { if (active) setParentRecords(Object.fromEntries(entries)) })
      .catch((error) => { if (active && error.name !== 'CanceledError') setParentRecords({}) })
    return () => { active = false; controller.abort() }
  }, [isUniversity, list.items, list.status])
  const fields = isUniversity
    ? ['provinceOrTerritory', 'charterAuthority', 'sector', 'hecRecognitionStatus', 'institutionType', 'recordStatus', 'verificationStatus']
    : ['university', 'institutionType', 'credentialType', 'degreeLevel', 'studyMode', 'recordStatus', 'verificationStatus']
  const sortOptions = isUniversity
    ? [['name', 'Name A–Z'], ['-name', 'Name Z–A'], ['establishedYear', 'Oldest first'], ['-establishedYear', 'Newest first'], ['-updatedAt', 'Recently updated']]
    : [['name', 'Name A–Z'], ['-name', 'Name Z–A'], ['degreeTitle', 'Degree A–Z'], ['-degreeTitle', 'Degree Z–A'], ['-updatedAt', 'Recently updated']]

  async function confirmDelete() {
    if (!target || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await remove(target.id)
      setDeleted(true)
      setTarget(null)
      list.retry()
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, 'Could not delete this record. Its dependencies may need to be handled first.'))
    } finally { setDeleting(false) }
  }

  return <>
    <AdminHeading eyebrow="Catalogue management" title={`Manage ${plural}`} description="Search, review, edit, and safely publish catalogue records. Only published and verified records are public." action={<Link className={adminButtonClass} to={`${base}/new`}>Add {kind}</Link>} />
    <div className="grid min-w-0 gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="min-w-0"><details className="paper-surface p-4 xl:open" open><summary className="min-h-11 cursor-pointer font-bold text-navy">Filters</summary><div className="space-y-4 border-t border-[var(--ui-border)] pt-4">
        <label className="block text-sm font-bold">Search<input type="search" className={`${adminInputClass} mt-1`} value={list.searchInput} onChange={(event) => list.setSearchInput(event.target.value)} placeholder={`Search ${plural}`} /></label>
        <label className="block text-sm font-bold">City<input className={`${adminInputClass} mt-1`} value={list.query.city} onChange={(event) => list.setQueryValue('city', event.target.value, { replace: true })} placeholder="City" /></label>
        {fields.map((field) => field === 'university' ? <div key={field} className="text-sm font-bold"><label htmlFor="admin-university-filter">University slug or ID</label><div className="mt-1 flex gap-2"><input id="admin-university-filter" className={adminInputClass} value={universityInput} onChange={(event) => setUniversityInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); list.setQueryValue('university', universityInput) } }} placeholder="Slug or ID" /><button type="button" className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white" onClick={() => list.setQueryValue('university', universityInput)}>Apply</button></div></div>
          : <label key={field} className="block text-sm font-bold">{labels[field]}<select className={`${adminInputClass} mt-1`} value={list.query[field]} onChange={(event) => list.setQueryValue(field, event.target.value)}>
              {(field === 'recordStatus' ? [['', 'All statuses'], ...(isUniversity ? ['draft', 'published', 'archived'] : ['draft', 'published', 'suspended', 'archived']).map((value) => [value, value])] : controls[field]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>)}
        <label className="block text-sm font-bold">Sort<select className={`${adminInputClass} mt-1`} value={list.query.sort} onChange={(event) => list.setQueryValue('sort', event.target.value, { resetPage: false })}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" onClick={list.clearFilters} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-academic/50">Clear filters</button>
      </div></details></aside>
      <section id="admin-results" tabIndex="-1" className="min-w-0 focus:outline-none" aria-label={`${plural} results`}>
        <p className="mb-4 text-sm text-slate-600" role="status">{list.pagination ? `${list.pagination.totalRecords} ${plural} found` : `Loading ${plural}…`}</p>
        {list.status !== 'ready' && <AdminState state={list.status} noun={plural} retry={list.retry} />}
        {list.status === 'ready' && list.items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="text-xl font-black">No {plural} match this view</h2><p className="mt-2 text-slate-600">Try another search or clear the filters.</p></div>}
        {list.status === 'ready' && list.items.length > 0 && <div className="grid min-w-0 gap-3">
          {list.items.map((record) => <article key={record.id} className="paper-surface min-w-0 border-l-4 !border-l-gold p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="section-title break-words text-xl text-navy">{record.name || 'Untitled record'}</h2><p className="mt-1 break-all text-xs text-slate-600">{record.slug}{isUniversity ? ` · ${record.abbreviation || record.sector || ''}` : ` · ${record.university?.name || 'Unknown university'}`}</p></div><div className="flex flex-wrap gap-2"><StatusBadge value={record.recordStatus} /><StatusBadge value={record.source?.verificationStatus} /></div></div>
            <p className="mt-3 text-sm text-slate-600">{isUniversity ? `${record.campuses?.length || 0} campuses · ${record.institutionType || 'Type not set'}` : `${record.degreeTitle || 'Degree not set'} · ${record.credentialType || 'Credential not set'} · ${record.studyMode || 'Mode not set'}`}</p>
            {!isUniversity && <p className="mt-1 break-words text-sm text-slate-600">Offered campuses: {(() => { const campuses = parentRecords[record.university?.id]?.campuses || []; const selected = record.campusIds?.length ? campuses.filter((campus) => record.campusIds.includes(campus.id)) : campuses.filter((campus) => campus.isActive); return selected.length ? selected.map((campus) => `${campus.name} (${campus.city})`).join(', ') : 'No campus details available' })()}</p>}
            {record.source?.lastVerifiedAt && <p className="mt-1 text-xs text-slate-600">Last verified: {new Date(record.source.lastVerifiedAt).toLocaleDateString()}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold"><Link className="min-h-11 rounded-lg border border-slate-300 px-4 py-3 text-academic focus:outline-none focus-visible:ring-4 focus-visible:ring-academic/50" to={`${base}/${record.id}/edit`}>Edit</Link>{isPublicRecord(record) && (isUniversity || isPublicRecord(parentRecords[record.university?.id])) && <Link className="min-h-11 rounded-lg px-4 py-3 text-academic underline focus:outline-none focus-visible:ring-4 focus-visible:ring-academic/50" to={isUniversity ? `/universities/${encodeURIComponent(record.slug || record.id)}` : `/programs/${encodeURIComponent(record.id)}`}>View public record</Link>}<button type="button" className="min-h-11 rounded-lg px-4 py-3 text-red-800 underline focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400/50" onClick={() => { setDeleted(false); setTarget(record); setDeleteError('') }}>Delete</button></div>
          </article>)}
        </div>}
        {list.pagination && <Pagination page={list.pagination.page} totalPages={list.pagination.totalPages} hrefForPage={(page) => cataloguePageHref(list.normalizedParams, definition, page)} focusTargetId="admin-results" />}
      </section>
    </div>
    <ConfirmDialog open={Boolean(target)} title={`Delete ${target?.name || kind}?`} description="This cannot be undone. The API will block deletion while dependent records exist; nothing is removed automatically." pending={deleting} error={deleteError} onClose={() => setTarget(null)} onConfirm={confirmDelete} focusAfterCloseId={deleted ? 'admin-results' : undefined} />
  </>
}
