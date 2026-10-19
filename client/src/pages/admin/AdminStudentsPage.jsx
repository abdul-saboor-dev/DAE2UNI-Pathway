import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminHeading, AdminState, StatusBadge, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import RoleActionDialog from '../../components/RoleActionDialog.jsx'
import { deleteStudent, listStudents } from '../../services/teamApi.js'

const sorts = new Set(['name', '-name', 'createdAt', '-createdAt', 'lastLoginAt', '-lastLoginAt'])
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Not yet'

export default function AdminStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const query = useMemo(() => {
    const params = new URLSearchParams(queryString)
    const page = Number(params.get('page'))
    return {
      page: Number.isInteger(page) && page > 0 && page <= 100000 ? page : 1,
      search: (params.get('search') || '').trim().slice(0, 80),
      sort: sorts.has(params.get('sort')) ? params.get('sort') : 'name',
    }
  }, [queryString])
  const [searchInput, setSearchInput] = useState(query.search)
  const [state, setState] = useState('loading')
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [action, setAction] = useState(null)
  const [success, setSuccess] = useState('')

  useEffect(() => setSearchInput(query.search), [query.search])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState('loading')
    listStudents(query, controller.signal)
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
    await deleteStudent(selected.target.id, password, confirmEmail)
    setSuccess('The student account was deleted and its sign-in access was revoked.')
    setAttempt((value) => value + 1)
  }

  const pagination = result?.pagination
  return <div className="min-w-0">
    <div id="students-page-heading" tabIndex={-1} className="rounded-xl focus-visible:outline-4 focus-visible:outline-academic">
      <AdminHeading eyebrow="Account control" title="Student accounts" description="Owner-only account removal revokes access, removes the student profile and active verification tokens, and retains an anonymized audit tombstone." />
    </div>
    {success && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{success}</p>}
    <form onSubmit={(event) => { event.preventDefault(); updateQuery('search', searchInput) }} className="paper-surface mb-5 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <div className="min-w-0"><label htmlFor="student-search" className="block text-sm font-bold">Search name or email</label><input id="student-search" className={`${adminInputClass} mt-1`} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={80} /></div>
      <button type="submit" className={adminButtonClass}>Search</button>
      <div><label htmlFor="student-sort" className="block text-sm font-bold">Sort</label><select id="student-sort" className={`${adminInputClass} mt-1`} value={query.sort} onChange={(event) => updateQuery('sort', event.target.value)}><option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="-createdAt">Newest</option><option value="createdAt">Oldest</option><option value="-lastLoginAt">Last login</option></select></div>
    </form>
    <AdminState state={state} retry={() => setAttempt((value) => value + 1)} noun="student accounts" />
    {state === 'ready' && <>
      <p className="mb-4 text-sm text-[var(--ui-muted)]" role="status">{pagination.totalRecords} student {pagination.totalRecords === 1 ? 'account' : 'accounts'} · Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</p>
      {result.users.length === 0 ? <div className="data-surface p-7"><h2 className="card-title text-lg">No student accounts found</h2><p className="mt-1 text-sm text-[var(--ui-muted)]">Try a different search.</p></div> :
        <div className="grid gap-4 xl:grid-cols-2">{result.users.map((student) => <article key={student.id} className="record-row min-w-0 border-l-2 border-l-[var(--ui-accent)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="card-title break-words text-lg">{student.name}</h2><p className="break-all text-sm text-[var(--ui-muted)]">{student.email}</p></div><StatusBadge value={student.accountStatus} /></div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-semibold text-[var(--ui-muted)]">Created</dt><dd>{formatDate(student.createdAt)}</dd></div><div><dt className="font-semibold text-[var(--ui-muted)]">Last login</dt><dd>{formatDate(student.lastLoginAt)}</dd></div></dl>
          <div className="mt-5 border-t border-[var(--ui-border)] pt-4"><button type="button" className="action-danger" onClick={() => { setSuccess(''); setAction({ type: 'deleteStudent', target: student }) }}>Delete student account</button></div>
        </article>)}</div>}
      <nav aria-label="Student pagination" className="mt-6 flex flex-wrap items-center justify-between gap-3"><button type="button" className={adminButtonClass} disabled={pagination.page <= 1} onClick={() => updateQuery('page', pagination.page - 1)}>Previous page</button><span aria-current="page" className="text-sm font-bold">Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span><button type="button" className={adminButtonClass} disabled={pagination.page >= pagination.totalPages} onClick={() => updateQuery('page', pagination.page + 1)}>Next page</button></nav>
    </>}
    {action && <RoleActionDialog key={`${action.type}:${action.target.id}`} action={action} onClose={() => setAction(null)} onConfirm={confirmAction} />}
  </div>
}
