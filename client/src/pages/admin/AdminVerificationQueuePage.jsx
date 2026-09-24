import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminHeading, AdminState, StatusBadge, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import Pagination from '../../components/Pagination.jsx'
import VerifySourceDialog from '../../components/VerifySourceDialog.jsx'
import { getVerificationQueue, verifySource } from '../../services/adminVerificationApi.js'
import { getSafeExternalUrl } from '../../utils/externalLinks.js'
import { nextVerificationParams, parseVerificationQuery, verificationParams } from '../../utils/verificationQueueQuery.js'

export default function AdminVerificationQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const query = useMemo(() => parseVerificationQuery(new URLSearchParams(queryString)), [queryString])
  const canonicalQuery = verificationParams(query).toString()
  const [searchInput, setSearchInput] = useState(query.search)
  const [state, setState] = useState('loading')
  const [result, setResult] = useState(null)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState(null)
  const [success, setSuccess] = useState('')

  useEffect(() => setSearchInput(query.search), [query.search])
  useEffect(() => {
    if (queryString !== canonicalQuery && window.location.search.slice(1) === queryString) {
      setSearchParams(new URLSearchParams(canonicalQuery), { replace: true })
    }
  }, [canonicalQuery, queryString, setSearchParams])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState('loading')
    getVerificationQueue(query, controller.signal).then((data) => {
      if (!active) return
      if (data.pagination.totalPages > 0 && query.page > data.pagination.totalPages) {
        setSearchParams(verificationParams({ ...query, page: data.pagination.totalPages }), { replace: true }); return
      }
      setResult(data); setState('ready')
    }).catch((error) => { if (active && error.name !== 'CanceledError') setState('error') })
    return () => { active = false; controller.abort() }
  }, [query, retry, setSearchParams])

  function updateQuery(key, value) {
    setSuccess('')
    setSearchParams(nextVerificationParams(window.location.search, key, value))
  }

  async function confirmVerification(record, input) {
    await verifySource(record, input)
    setSuccess(`${record.name}: source verification saved. Publication was not changed.`)
    setRetry((value) => value + 1)
  }

  const pagination = result?.pagination
  return <div className="min-w-0">
    <div id="verification-heading" tabIndex={-1}><AdminHeading eyebrow="Evidence review" title="Verification queue" description="Review an official source manually. This queue never scrapes, verifies automatically, or publishes records." /></div>
    {success && <p role="status" className="mb-5 break-words rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{success}</p>}
    <form onSubmit={(event) => { event.preventDefault(); updateQuery('search', String(new FormData(event.currentTarget).get('search') || '').trim()) }} className="paper-surface grid min-w-0 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <div><label htmlFor="queue-type" className="block text-sm font-bold">Record type</label><select id="queue-type" className={`${adminInputClass} mt-1`} value={query.entityType} onChange={(event) => updateQuery('entityType', event.target.value)}><option value="university">Universities</option><option value="program">Programs</option></select></div>
      <div><label htmlFor="queue-status" className="block text-sm font-bold">Verification status</label><select id="queue-status" className={`${adminInputClass} mt-1`} value={query.verificationStatus} onChange={(event) => updateQuery('verificationStatus', event.target.value)}><option value="">All requiring review</option>{['unverified', 'pending_review', 'needs_update', 'unavailable'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></div>
      <div><label htmlFor="queue-search" className="block text-sm font-bold">Search name or slug</label><input id="queue-search" name="search" className={`${adminInputClass} mt-1`} value={searchInput} maxLength={100} onChange={(event) => setSearchInput(event.target.value)} /></div>
      <div><label htmlFor="queue-sort" className="block text-sm font-bold">Sort</label><select id="queue-sort" className={`${adminInputClass} mt-1`} value={query.sort} onChange={(event) => updateQuery('sort', event.target.value)}><option value="-updatedAt">Recently updated</option><option value="updatedAt">Oldest update</option><option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="-lastVerifiedAt">Last verified</option></select></div>
      <button type="submit" className={adminButtonClass}>Search</button>
    </form>
    <AdminState state={state} retry={() => setRetry((value) => value + 1)} noun="verification records" />
    {state === 'ready' && <section aria-label="Verification results" className="mt-6">
      <p role="status" className="mb-4 text-sm text-slate-600">{pagination.totalRecords} records requiring review · page {pagination.page} of {Math.max(pagination.totalPages, 1)}</p>
      {result.records.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-7"><h2 className="text-lg font-black">No records need review here</h2><p className="mt-2 text-sm text-slate-600">Try another type, status, or search. Published status is managed separately.</p></div> :
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">{result.records.map((record) => {
          const safeUrl = getSafeExternalUrl(record.sourceUrl)
          const editPath = record.entityType === 'university' ? `/admin/universities/${record.id}/edit` : `/admin/programs/${record.id}/edit`
          return <article key={`${record.entityType}-${record.id}`} className="paper-surface min-w-0 border-l-4 !border-l-gold p-5">
            <h2 className="break-words text-lg font-black">{record.name}</h2>
            {record.university?.name && <p className="break-words text-sm text-slate-600">{record.university.name}</p>}
            <div className="mt-3 flex flex-wrap gap-2"><StatusBadge value={record.verificationStatus} /><StatusBadge value={record.recordStatus} /></div>
            <dl className="mt-4 space-y-2 text-sm"><div><dt className="font-semibold">Official source</dt><dd className="break-all">{safeUrl ? <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-teal-800 underline">Open official source (external site)</a> : 'Missing or unsafe URL — edit before review'}</dd></div><div><dt className="font-semibold">Last verified</dt><dd>{record.lastVerifiedAt ? new Date(record.lastVerifiedAt).toLocaleString() : 'Never'}</dd></div></dl>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4"><Link to={editPath} className="inline-flex min-h-11 items-center text-teal-800 underline focus-visible:ring-4 focus-visible:ring-teal-400">Open and edit record</Link><button type="button" disabled={!safeUrl} className={adminButtonClass} onClick={() => setSelected(record)}>Record manual verification</button></div>
          </article>
        })}</div>}
      <Pagination page={pagination.page} totalPages={pagination.totalPages} focusTargetId="verification-heading" hrefForPage={(page) => `/admin/verification-queue?${verificationParams({ ...query, page })}`} />
    </section>}
    {selected && <VerifySourceDialog key={selected.id} record={selected} onClose={() => setSelected(null)} onConfirm={confirmVerification} />}
  </div>
}
