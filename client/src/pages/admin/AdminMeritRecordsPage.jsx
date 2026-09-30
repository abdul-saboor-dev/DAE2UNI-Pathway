import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminHeading, AdminState, ConfirmDialog, StatusBadge, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import { getApiErrorMessage } from '../../utils/apiErrors.js'
import { deleteEntryTest, deleteMeritFormula, listEntryTests, listMeritFormulas } from '../../services/meritManagementApi.js'

function RecordsPage({ kind }) {
  const formulas = kind === 'formula'
  const noun = formulas ? 'merit formulas' : 'entry tests'
  const base = formulas ? '/admin/merit-formulas' : '/admin/entry-tests'
  const load = formulas ? listMeritFormulas : listEntryTests
  const remove = formulas ? deleteMeritFormula : deleteEntryTest
  const [query, setQuery] = useState({ search: '', recordStatus: '', verificationStatus: '', sort: 'name', page: 1, pageSize: 20 })
  const [result, setResult] = useState({ state: 'loading', items: [], pagination: null })
  const [revision, setRevision] = useState(0)
  const [target, setTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const reload = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setResult((value) => ({ ...value, state: 'loading' }))
    load(query, controller.signal).then((value) => { if (active) setResult({ state: 'ready', ...value }) })
      .catch((error) => { if (active && error.name !== 'CanceledError') setResult({ state: 'error', items: [], pagination: null }) })
    return () => { active = false; controller.abort() }
  }, [load, query, revision])

  function change(key, value) { setQuery((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 })) }
  async function confirmDelete() {
    if (!target || deleting) return
    setDeleting(true); setDeleteError('')
    try { await remove(target.id); setTarget(null); reload() }
    catch (error) { setDeleteError(getApiErrorMessage(error, 'Could not delete this record.')) }
    finally { setDeleting(false) }
  }

  return <>
    <AdminHeading eyebrow="Merit configuration" title={`Manage ${noun}`} description={formulas ? 'Define transparent, declarative weights. Calculations are performed later by backend-authoritative logic.' : 'Maintain official entry-test identities and score scales used by merit formulas.'} action={<Link className={adminButtonClass} to={`${base}/new`}>Add {formulas ? 'formula' : 'entry test'}</Link>} />
    <section aria-label={`${noun} filters`} className="paper-surface mb-6 grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
      <label className="text-sm font-bold">Search<input className={`${adminInputClass} mt-1`} type="search" value={query.search} onChange={(event) => change('search', event.target.value)} /></label>
      <label className="text-sm font-bold">Publication<select className={`${adminInputClass} mt-1`} value={query.recordStatus} onChange={(event) => change('recordStatus', event.target.value)}><option value="">All</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      <label className="text-sm font-bold">Verification<select className={`${adminInputClass} mt-1`} value={query.verificationStatus} onChange={(event) => change('verificationStatus', event.target.value)}><option value="">All</option><option value="pending_review">Pending review</option><option value="verified">Verified</option><option value="needs_update">Needs update</option><option value="unavailable">Unavailable</option><option value="unverified">Unverified</option></select></label>
      <label className="text-sm font-bold">Sort<select className={`${adminInputClass} mt-1`} value={query.sort} onChange={(event) => change('sort', event.target.value)}><option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="-updatedAt">Recently updated</option></select></label>
      <button type="button" className="action-secondary self-end" onClick={() => setQuery({ search: '', recordStatus: '', verificationStatus: '', sort: 'name', page: 1, pageSize: 20 })}>Clear filters</button>
    </section>
    <section id="merit-record-results" tabIndex="-1" className="min-w-0 focus:outline-none" aria-label={`${noun} results`}>
      <p role="status" className="mb-4 text-sm text-[var(--ui-muted)]">{result.pagination ? `${result.pagination.totalRecords} ${noun}` : `Loading ${noun}…`}</p>
      {result.state !== 'ready' && <AdminState state={result.state} noun={noun} retry={reload} />}
      {result.state === 'ready' && result.items.length === 0 && <div className="empty-state"><h2 className="section-title text-xl">No {noun} found</h2><p className="mt-2 text-[var(--ui-muted)]">Create the first record or adjust the filters.</p></div>}
      <div className="grid gap-3">{result.items.map((record) => <article key={record.id} className="paper-surface border-l-4 !border-l-gold p-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="section-title break-words text-xl text-navy">{record.name}</h2><p className="mt-1 break-all text-xs text-[var(--ui-muted)]">{record.code}</p></div><div className="flex flex-wrap gap-2"><StatusBadge value={record.recordStatus} /><StatusBadge value={record.source?.verificationStatus} /></div></div>
        <p className="mt-3 text-sm text-[var(--ui-muted)]">{formulas ? `${record.university?.name || 'University unavailable'} · ${record.weightedTotal}% total` : `${record.conductingBody} · ${record.scoring?.resultUnit === 'score' ? `${record.scoring.maximumScore} maximum marks` : record.scoring?.resultUnit}`}</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link className="action-secondary" to={`${base}/${record.id}/edit`}>Edit</Link><button className="min-h-11 px-4 font-bold text-red-800 underline" type="button" onClick={() => setTarget(record)}>Delete</button></div>
      </article>)}</div>
      {result.pagination?.totalPages > 1 && <nav aria-label={`${noun} pagination`} className="mt-8 flex items-center justify-center gap-3"><button type="button" className="action-secondary" disabled={query.page <= 1} onClick={() => change('page', query.page - 1)}>Previous</button><span aria-current="page" className="font-bold">Page {query.page} of {result.pagination.totalPages}</span><button type="button" className="action-secondary" disabled={query.page >= result.pagination.totalPages} onClick={() => change('page', query.page + 1)}>Next</button></nav>}
    </section>
    <ConfirmDialog open={Boolean(target)} title={`Delete ${target?.name || 'record'}?`} description="This action cannot be undone. Dependencies are checked by the server." pending={deleting} error={deleteError} onClose={() => { setTarget(null); setDeleteError('') }} onConfirm={confirmDelete} focusAfterCloseId="merit-record-results" />
  </>
}

export function AdminEntryTestsPage() { return <RecordsPage kind="entry-test" /> }
export function AdminMeritFormulasPage() { return <RecordsPage kind="formula" /> }
