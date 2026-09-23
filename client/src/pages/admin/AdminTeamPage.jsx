import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminHeading, AdminState, StatusBadge, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import RoleActionDialog from '../../components/RoleActionDialog.jsx'
import useAuth from '../../context/useAuth.js'
import { grantCoOwner, listAdministrators, promoteStudent, revokeAdmin, revokeCoOwner } from '../../services/teamApi.js'

const sorts = new Set(['name', '-name', 'createdAt', '-createdAt', 'lastLoginAt', '-lastLoginAt', 'role', '-role'])
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Not yet'

export default function AdminTeamPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const query = useMemo(() => {
    const params = new URLSearchParams(queryString)
    const page = Number(params.get('page'))
    return { page: Number.isInteger(page) && page > 0 && page <= 100000 ? page : 1,
      search: (params.get('search') || '').trim().slice(0, 80),
      sort: sorts.has(params.get('sort')) ? params.get('sort') : 'name' }
  }, [queryString])
  const [searchInput, setSearchInput] = useState(query.search)
  const [state, setState] = useState('loading')
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [action, setAction] = useState(null)
  const [promoteEmail, setPromoteEmail] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => setSearchInput(query.search), [query.search])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState('loading')
    listAdministrators(query, controller.signal)
      .then((data) => {
        if (!active) return
        if (data.pagination.totalPages > 0 && query.page > data.pagination.totalPages) {
          const next = new URLSearchParams(queryString)
          next.set('page', String(data.pagination.totalPages))
          setSearchParams(next, { replace: true })
          return
        }
        setResult(data)
        setState('ready')
      })
      .catch((error) => { if (active && error.name !== 'CanceledError') setState('error') })
    return () => { active = false; controller.abort() }
  }, [attempt, query, queryString, setSearchParams])

  function updateQuery(key, value) {
    const next = new URLSearchParams()
    const search = key === 'search' ? value.trim() : query.search
    const sort = key === 'sort' ? value : query.sort
    const page = key === 'page' ? Number(value) : 1
    if (search) next.set('search', search)
    if (sort !== 'name') next.set('sort', sort)
    if (page > 1) next.set('page', String(page))
    setSearchParams(next)
  }

  async function confirmAction(selected, password, confirmEmail) {
    if (selected.type === 'promote') await promoteStudent(selected.target.email, password)
    else if (selected.type === 'revoke') await revokeAdmin(selected.target.id, password)
    else if (selected.type === 'grant') await grantCoOwner(selected.target.id, password, confirmEmail)
    else if (selected.type === 'revokeCoOwner') await revokeCoOwner(selected.target.id, password, confirmEmail)
    setSuccess(`${selected.target.email}: role updated successfully.`)
    setPromoteEmail('')
    setAttempt((value) => value + 1)
  }

  const pagination = result?.pagination
  return <div className="min-w-0">
    <div id="team-page-heading" tabIndex={-1} className="rounded-xl focus-visible:outline-4 focus-visible:outline-teal-400"><AdminHeading eyebrow="Team control" title="Manage administrators" description="Owner and Co-Owner share content access with Admins. Only Owner controls Co-Owners; Owner and Co-Owner may appoint or remove regular Admins." /></div>
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black">Promote a registered Student</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">The person registers normally first. Making them an Admin keeps their account and profile. Only the Owner can later make an Admin a Co-Owner.</p>
      <form onSubmit={(event) => { event.preventDefault(); if (promoteEmail.trim()) { setSuccess(''); setAction({ type: 'promote', target: { email: promoteEmail.trim().toLowerCase() } }) } }} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1"><label htmlFor="team-promote-email" className="block text-sm font-bold">Registered Student email</label><input id="team-promote-email" type="email" className={`${adminInputClass} mt-1`} value={promoteEmail} onChange={(event) => setPromoteEmail(event.target.value)} autoComplete="off" required maxLength={254} /></div>
        <button type="submit" className={adminButtonClass}>Make Admin</button>
      </form>
    </section>
    {success && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{success}</p>}
    <section aria-label="Administrator team list">
      <form onSubmit={(event) => { event.preventDefault(); updateQuery('search', searchInput) }} className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <div className="min-w-0"><label htmlFor="team-search" className="block text-sm font-bold">Search name or email</label><input id="team-search" className={`${adminInputClass} mt-1`} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={80} /></div>
        <button type="submit" className={adminButtonClass}>Search</button>
        <div><label htmlFor="team-sort" className="block text-sm font-bold">Sort</label><select id="team-sort" className={`${adminInputClass} mt-1`} value={query.sort} onChange={(event) => updateQuery('sort', event.target.value)}><option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="-createdAt">Newest</option><option value="createdAt">Oldest</option><option value="-lastLoginAt">Last login</option><option value="role">Role</option></select></div>
      </form>
      <AdminState state={state} retry={() => setAttempt((value) => value + 1)} noun="team members" />
      {state === 'ready' && <>
        <p className="mb-4 text-sm text-slate-600" role="status">{pagination.totalRecords} elevated team {pagination.totalRecords === 1 ? 'member' : 'members'} · Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</p>
        {result.users.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-7"><h2 className="text-lg font-black">No team members found</h2><p className="mt-1 text-sm text-slate-600">Try a different search. No accounts are deleted by role changes.</p></div> :
          <div className="grid gap-4 xl:grid-cols-2">{result.users.map((member) => <article key={member.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-lg font-black">{member.name} {member.id === user?.id && <span className="text-xs font-semibold text-teal-800">(Current account)</span>}</h2><p className="break-all text-sm text-slate-600">{member.email}</p></div><div className="flex flex-wrap gap-2"><StatusBadge value={member.role} /><StatusBadge value={member.accountStatus} /></div></div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-semibold text-slate-600">Created</dt><dd>{formatDate(member.createdAt)}</dd></div><div><dt className="font-semibold text-slate-600">Last login</dt><dd>{formatDate(member.lastLoginAt)}</dd></div></dl>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{member.role === 'owner' && <span className="rounded-full bg-teal-100 px-3 py-2 text-xs font-black text-teal-950">Permanent owner</span>}
              {member.role === 'co_owner' && user?.role === 'owner' && <button type="button" className={adminButtonClass} onClick={() => { setSuccess(''); setAction({ type: 'revokeCoOwner', target: member }) }}>Remove Co-Owner access</button>}
              {member.role === 'admin' && <><button type="button" className={adminButtonClass} onClick={() => { setSuccess(''); setAction({ type: 'revoke', target: member }) }}>Remove admin access</button>{user?.role === 'owner' && <button type="button" className={adminButtonClass} onClick={() => { setSuccess(''); setAction({ type: 'grant', target: member }) }}>Make Co-Owner</button>}</>}
            </div>
          </article>)}</div>}
        <nav aria-label="Team pagination" className="mt-6 flex flex-wrap items-center justify-between gap-3"><button type="button" className={adminButtonClass} disabled={pagination.page <= 1} onClick={() => updateQuery('page', pagination.page - 1)}>Previous page</button><span aria-current="page" className="text-sm font-bold">Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span><button type="button" className={adminButtonClass} disabled={pagination.page >= pagination.totalPages} onClick={() => updateQuery('page', pagination.page + 1)}>Next page</button></nav>
      </>}
    </section>
    {action && <RoleActionDialog key={`${action.type}:${action.target.id || action.target.email}`} action={action} onClose={() => setAction(null)} onConfirm={confirmAction} />}
  </div>
}
