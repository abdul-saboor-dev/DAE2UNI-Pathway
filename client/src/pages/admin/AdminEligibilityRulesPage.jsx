import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminHeading, AdminState, ConfirmDialog, StatusBadge, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import { deleteEligibilityRule, listEligibilityRules } from '../../services/eligibilityRuleApi.js'
import { summarizeEligibilityRule } from '../../utils/eligibilityRules.js'
import { getSafeExternalUrl } from '../../utils/externalLinks.js'

export default function AdminEligibilityRulesPage() {
  const [filters, setFilters] = useState({ search: '', recordStatus: 'draft', sort: '-updatedAt', page: 1 })
  const [search, setSearch] = useState('')
  const [state, setState] = useState('loading')
  const [result, setResult] = useState(null)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState('loading')
    listEligibilityRules(filters, controller.signal).then((data) => {
      if (!active) return
      if (data.pagination.totalPages > 0 && filters.page > data.pagination.totalPages) {
        setFilters((current) => ({ ...current, page: data.pagination.totalPages })); return
      }
      setResult(data); setState('ready')
    }).catch((error) => { if (active && error.name !== 'CanceledError') setState('error') })
    return () => { active = false; controller.abort() }
  }, [filters, retry])

  async function confirmDelete() {
    setDeleting(true); setDeleteError('')
    try {
      await deleteEligibilityRule(selected.id)
      setSelected(null); setMessage(`${selected.name} deleted.`); setRetry((value) => value + 1)
    } catch { setDeleteError('Could not delete this draft rule. Refresh and try again.') }
    finally { setDeleting(false) }
  }

  const pagination = result?.pagination
  return <div className="min-w-0">
    <div id="eligibility-rules-heading" tabIndex={-1}><AdminHeading eyebrow="Internal criteria" title="Eligibility rules" description="Draft rules are internal review records, not student eligibility decisions." action={<Link className={adminButtonClass} to="/admin/eligibility-rules/new">Create draft rule</Link>} /></div>
    {message && <p role="status" className="mb-5 border-l-4 border-emerald-700 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{message}</p>}
    <form className="paper-surface grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, search: search.trim(), page: 1 })) }}>
      <label className="text-sm font-bold">Search name or code<input className={`${adminInputClass} mt-1`} value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="text-sm font-bold">Record status<select className={`${adminInputClass} mt-1`} value={filters.recordStatus} onChange={(event) => setFilters((current) => ({ ...current, recordStatus: event.target.value, page: 1 }))}><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      <label className="text-sm font-bold">Sort<select className={`${adminInputClass} mt-1`} value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value, page: 1 }))}><option value="-updatedAt">Recently updated</option><option value="updatedAt">Oldest update</option><option value="name">Name A–Z</option><option value="-name">Name Z–A</option></select></label>
      <button className={adminButtonClass} type="submit">Search</button>
    </form>
    <AdminState state={state} retry={() => setRetry((value) => value + 1)} noun="eligibility rules" />
    {state === 'ready' && <section className="mt-6" aria-label="Eligibility-rule results">
      <p role="status" className="mb-4 text-sm text-[var(--ui-muted)]">{pagination.totalRecords} rules · page {pagination.page} of {Math.max(pagination.totalPages, 1)}</p>
      {result.rules.length === 0 ? <div className="paper-surface p-7"><h2 className="text-lg font-black">No draft rules found</h2><p className="mt-2 text-sm text-[var(--ui-muted)]">Create a draft only after official evidence has been reviewed.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{result.rules.map((rule) => {
        const sourceUrl = getSafeExternalUrl(rule.source.officialUrl)
        return <article className="paper-surface border-l-4 !border-l-gold p-5" key={rule.id}>
          <div className="flex flex-wrap justify-between gap-3"><div><p className="eyebrow">{rule.code}</p><h2 className="mt-1 break-words text-lg font-black">{rule.name}</h2><p className="text-sm text-[var(--ui-muted)]">{rule.university?.name}{rule.program ? ` · ${rule.program.name}` : ''}</p></div><div className="flex flex-wrap gap-2"><StatusBadge value={rule.recordStatus} /><StatusBadge value={rule.source.verificationStatus} /></div></div>
          <p className="mt-4 text-sm leading-6">{summarizeEligibilityRule(rule)}</p>
          <dl className="mt-4 space-y-2 text-sm"><div><dt className="font-bold">Linked research</dt><dd>{rule.eligibilityResearch ? `${rule.eligibilityResearch.sourceTitle} (${rule.eligibilityResearch.researchStatus})` : 'None'}</dd></div><div><dt className="font-bold">Official source</dt><dd className="break-all">{sourceUrl ? <a className="text-academic underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">Open source (external site)</a> : 'Unsafe or missing source'}</dd></div></dl>
          <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--ui-border)] pt-4">{rule.recordStatus === 'draft' ? <><Link className="action-secondary" to={`/admin/eligibility-rules/${rule.id}/edit`}>Edit draft</Link><button id={`delete-rule-${rule.id}`} type="button" className="action-secondary border-red-800 text-red-900" onClick={() => { setDeleteError(''); setSelected(rule) }}>Delete draft</button></> : <span className="text-sm text-[var(--ui-muted)]">This workflow does not edit published or archived rules.</span>}</div>
        </article>
      })}</div>}
      {pagination.totalPages > 1 && <nav aria-label="Eligibility-rule pagination" className="mt-8 flex items-center justify-center gap-3"><button className="action-secondary" type="button" disabled={pagination.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</button><span aria-current="page" className="text-sm font-bold">Page {pagination.page} of {pagination.totalPages}</span><button className="action-secondary" type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button></nav>}
    </section>}
    <ConfirmDialog open={Boolean(selected)} title="Delete draft eligibility rule?" description={selected ? `${selected.name} will be permanently removed. No research, catalogue, or student record will be changed.` : ''} pending={deleting} error={deleteError} onConfirm={confirmDelete} onClose={() => { if (!deleting) setSelected(null) }} focusAfterCloseId={selected ? `delete-rule-${selected.id}` : undefined} />
  </div>
}
