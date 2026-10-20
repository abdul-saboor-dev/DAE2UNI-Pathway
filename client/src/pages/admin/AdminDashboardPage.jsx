import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminHeading, AdminState, StatusBadge, adminButtonClass } from '../../components/AdminUi.jsx'
import { listAdminPrograms, listAdminUniversities } from '../../services/adminCatalogueApi.js'

const requests = [
  ['universities', listAdminUniversities, {}], ['publishedUniversities', listAdminUniversities, { recordStatus: 'published' }], ['draftUniversities', listAdminUniversities, { recordStatus: 'draft' }], ['verifiedUniversities', listAdminUniversities, { verificationStatus: 'verified' }],
  ['programs', listAdminPrograms, {}], ['publishedPrograms', listAdminPrograms, { recordStatus: 'published' }], ['draftPrograms', listAdminPrograms, { recordStatus: 'draft' }], ['verifiedPrograms', listAdminPrograms, { verificationStatus: 'verified' }],
  ['pendingUniversities', listAdminUniversities, { verificationStatus: 'pending_review' }], ['pendingPrograms', listAdminPrograms, { verificationStatus: 'pending_review' }],
  ['publicUniversities', listAdminUniversities, { recordStatus: 'published', verificationStatus: 'verified' }], ['publicPrograms', listAdminPrograms, { recordStatus: 'published', verificationStatus: 'verified' }],
]

export default function AdminDashboardPage() {
  const [state, setState] = useState('loading')
  const [counts, setCounts] = useState({})
  const [recent, setRecent] = useState([])
  const [retryKey, setRetryKey] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState('loading')
    Promise.all([
      ...requests.map(async ([key, load, filters]) => [key, await load({ ...filters, page: 1, pageSize: 1 }, controller.signal)]),
      listAdminUniversities({ page: 1, pageSize: 4, sort: '-updatedAt' }, controller.signal).then((value) => ['recentUniversities', value]),
      listAdminPrograms({ page: 1, pageSize: 4, sort: '-updatedAt' }, controller.signal).then((value) => ['recentPrograms', value]),
    ]).then((entries) => {
      if (!active) return
      const values = Object.fromEntries(entries)
      setCounts(Object.fromEntries(requests.map(([key]) => [key, values[key].pagination.totalRecords])))
      setRecent([...values.recentUniversities.items.map((record) => ({ ...record, kind: 'universities' })), ...values.recentPrograms.items.map((record) => ({ ...record, kind: 'programs' }))].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5))
      setState('ready')
    }).catch((error) => { if (active && error.name !== 'CanceledError') setState('error') })
    return () => { active = false; controller.abort() }
  }, [retryKey])

  const metrics = [
    ['Total universities', counts.universities], ['Published universities', counts.publishedUniversities], ['Draft universities', counts.draftUniversities], ['Verified universities', counts.verifiedUniversities],
    ['Total programs', counts.programs], ['Published programs', counts.publishedPrograms], ['Draft programs', counts.draftPrograms], ['Verified programs', counts.verifiedPrograms],
  ]
  return <>
    <AdminHeading eyebrow="Administrator overview" title="Catalogue dashboard" description="Live catalogue counts from administrator APIs. These numbers describe data readiness—not student eligibility." />
    <div className="mb-8 flex flex-wrap gap-3"><Link className={adminButtonClass} to="/admin/universities/new">Add university</Link><Link className="action-secondary" to="/admin/programs/new">Add program</Link><Link className="action-secondary" to="/admin/program-images">Program images</Link><Link className="action-secondary" to="/admin/verification-queue">Review sources</Link><Link className="action-secondary" to="/universities">View public catalogue</Link></div>
    {state !== 'ready' && <AdminState state={state} retry={() => setRetryKey((value) => value + 1)} noun="dashboard" />}
    {state === 'ready' && <>
      <section aria-labelledby="dashboard-counts"><h2 id="dashboard-counts" className="section-title mb-4 text-2xl text-navy">Catalogue records</h2><div className="metric-strip grid sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, count]) => <div key={label} className="px-5 py-4"><p className="metadata">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-navy">{count}</p></div>)}</div></section>
      <section aria-labelledby="dashboard-readiness" className="data-surface mt-8 p-5 sm:p-7"><div className="grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(20rem,1.2fr)]"><div><h2 id="dashboard-readiness" className="section-title text-2xl text-navy">Data readiness</h2><p className="body-copy mt-2 text-sm">An official URL is required by the API. Verification requires a separate manual review; publishing alone never makes an unverified record public.</p></div><dl className="grid gap-px overflow-hidden rounded-[var(--ui-radius-sm)] bg-[var(--ui-border)] sm:grid-cols-3"><div className="bg-[var(--ui-surface-subtle)] p-4"><dd className="text-2xl font-semibold text-navy">{counts.draftUniversities + counts.draftPrograms}</dd><dt className="metadata mt-1">Draft records</dt></div><div className="bg-[var(--ui-surface-subtle)] p-4"><dd className="text-2xl font-semibold text-navy">{counts.pendingUniversities + counts.pendingPrograms}</dd><dt className="metadata mt-1">Awaiting review</dt></div><div className="bg-[var(--ui-surface-subtle)] p-4"><dd className="text-2xl font-semibold text-navy">{counts.publicUniversities + counts.publicPrograms}</dd><dt className="metadata mt-1">Published and verified</dt></div></dl></div><p className="mt-5 text-xs text-[var(--ui-muted)]">Program visibility also requires a public parent university. Incomplete relationship counts are not estimated.</p></section>
      <section aria-labelledby="dashboard-media" className="panel-surface mt-8 flex flex-wrap items-center justify-between gap-5 p-5 sm:p-7"><div><h2 id="dashboard-media" className="section-title text-xl">Program image library</h2><p className="body-copy mt-2 text-sm">Manage one reusable image and explicit aliases for each academic discipline.</p></div><Link className="action-secondary" to="/admin/program-images">Manage program images</Link></section>
      <section aria-labelledby="dashboard-recent" className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="dashboard-recent" className="section-title text-xl">Recently updated</h2><div className="flex gap-3 text-sm font-semibold"><Link className="text-academic underline" to="/admin/universities">Manage universities</Link><Link className="text-academic underline" to="/admin/programs">Manage programs</Link></div></div>{recent.length ? <ul className="data-surface mt-4 divide-y divide-[var(--ui-border)] overflow-hidden">{recent.map((record) => <li key={`${record.kind}-${record.id}`} className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-5 py-4"><Link className="min-w-0 break-words font-semibold text-academic underline" to={`/admin/${record.kind}/${record.id}/edit`}>{record.name}</Link><StatusBadge value={record.recordStatus} /></li>)}</ul> : <p className="data-surface mt-4 p-5 text-[var(--ui-muted)]">No catalogue records have been created yet.</p>}</section>
    </>}
  </>
}
