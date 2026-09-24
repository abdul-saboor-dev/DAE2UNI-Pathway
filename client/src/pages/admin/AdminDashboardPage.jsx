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

  const cards = [
    ['Total universities', counts.universities], ['Published universities', counts.publishedUniversities], ['Draft universities', counts.draftUniversities], ['Verified universities', counts.verifiedUniversities],
    ['Total programs', counts.programs], ['Published programs', counts.publishedPrograms], ['Draft programs', counts.draftPrograms], ['Verified programs', counts.verifiedPrograms],
  ]
  return <>
    <AdminHeading eyebrow="Administrator overview" title="Catalogue dashboard" description="Live catalogue counts from administrator APIs. These numbers describe data readiness—not student eligibility." />
    <div className="mb-8 flex flex-wrap gap-3"><Link className={adminButtonClass} to="/admin/universities/new">Add university</Link><Link className="action-secondary" to="/admin/programs/new">Add program</Link><Link className="action-secondary" to="/admin/verification-queue">Review sources</Link><Link className="action-secondary" to="/universities">View public catalogue</Link></div>
    {state !== 'ready' && <AdminState state={state} retry={() => setRetryKey((value) => value + 1)} noun="dashboard" />}
    {state === 'ready' && <>
      <section aria-labelledby="dashboard-counts"><h2 id="dashboard-counts" className="section-title mb-4 text-2xl text-navy">Catalogue records</h2><div className="grid gap-px border border-[var(--ui-border)] bg-[var(--ui-border)] sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, count]) => <div key={label} className="bg-[var(--ui-paper)] p-5"><p className="text-sm text-[var(--ui-muted)]">{label}</p><p className="mt-2 text-3xl font-black tabular-nums text-navy">{count}</p></div>)}</div></section>
      <section aria-labelledby="dashboard-readiness" className="mt-8 border-l-4 border-gold bg-[var(--ui-paper)] p-5 sm:p-7"><h2 id="dashboard-readiness" className="section-title text-2xl text-navy">Data readiness</h2><p className="body-copy mt-2 text-sm">An official URL is required by the API. Verification requires a separate manual review; publishing alone never makes an unverified record public.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><div><p className="text-2xl font-black text-navy">{counts.draftUniversities + counts.draftPrograms}</p><p className="text-sm">Draft records</p></div><div><p className="text-2xl font-black text-navy">{counts.pendingUniversities + counts.pendingPrograms}</p><p className="text-sm">Records requiring attention: awaiting verification review</p></div><div><p className="text-2xl font-black text-navy">{counts.publicUniversities + counts.publicPrograms}</p><p className="text-sm">Published and verified record-level states; program visibility also requires a public parent university</p></div></div><p className="mt-5 text-xs text-[var(--ui-muted)]">The API does not expose a reliable count for universities without programs or programs without campus selections, so those figures are not estimated.</p></section>
      <section aria-labelledby="dashboard-recent" className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="dashboard-recent" className="text-xl font-black">Recently updated</h2><div className="flex gap-3 text-sm font-bold"><Link className="text-teal-800 underline" to="/admin/universities">Manage universities</Link><Link className="text-teal-800 underline" to="/admin/programs">Manage programs</Link></div></div>{recent.length ? <ul className="mt-4 grid gap-3">{recent.map((record) => <li key={`${record.kind}-${record.id}`} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><Link className="min-w-0 break-words font-bold text-teal-800 underline" to={`/admin/${record.kind}/${record.id}/edit`}>{record.name}</Link><StatusBadge value={record.recordStatus} /></li>)}</ul> : <p className="mt-4 rounded-xl bg-white p-5 text-slate-600">No catalogue records have been created yet.</p>}</section>
    </>}
  </>
}
