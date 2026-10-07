import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AdminField,
  AdminHeading,
  AdminState,
  StatusBadge,
  adminButtonClass,
  adminInputClass,
} from '../../components/AdminUi.jsx'
import {
  createEligibilityResearch,
  getEligibilityResearchOptions,
  listEligibilityResearch,
  updateEligibilityResearch,
} from '../../services/eligibilityResearchApi.js'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors.js'
import { getSafeExternalUrl } from '../../utils/externalLinks.js'

const statuses = ['not_started', 'researching', 'blocked', 'ready_for_review', 'verified']
const emptyForm = {
  university: '',
  program: '',
  admissionCycle: '',
  researchStatus: 'not_started',
  officialSourceUrl: '',
  sourceTitle: '',
  reviewedDate: new Date().toISOString().slice(0, 10),
  evidenceNotes: '',
  unresolvedItems: '',
}

function describedBy(id, errors, hasHint = false) {
  return [hasHint ? `${id}-hint` : '', errors[id] ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
}

export default function AdminEligibilityResearchPage() {
  const [filters, setFilters] = useState({ researchStatus: '', page: 1, sort: '-updatedAt' })
  const [state, setState] = useState('loading')
  const [result, setResult] = useState(null)
  const [retry, setRetry] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [options, setOptions] = useState({ universities: [], programs: [], admissionCycles: [] })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState('loading')
    listEligibilityResearch(filters, controller.signal)
      .then((data) => {
        if (!active) return
        if (data.pagination.totalPages > 0 && filters.page > data.pagination.totalPages) {
          setFilters((current) => ({ ...current, page: data.pagination.totalPages }))
          return
        }
        setResult(data)
        setState('ready')
      })
      .catch((error) => {
        if (active && error.name !== 'CanceledError') setState('error')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [filters, retry])

  const loadOptions = useCallback(async (university = '', program = '') => {
    const data = await getEligibilityResearchOptions({ university, program })
    setOptions(data)
    return data
  }, [])

  useEffect(() => {
    loadOptions().catch(() => {
      setMessageKind('error')
      setMessage('Could not load university options. Try refreshing this page.')
    })
  }, [loadOptions])

  const selectedUniversityName = useMemo(
    () => options.universities.find((item) => item.id === form.university)?.name || '',
    [form.university, options.universities],
  )

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function changeUniversity(value) {
    setForm((current) => ({ ...current, university: value, program: '', admissionCycle: '' }))
    setErrors({})
    try {
      if (value) await loadOptions(value)
      else await loadOptions()
    } catch {
      setMessageKind('error')
      setMessage('Could not load relationship options. Please try again.')
    }
  }

  async function changeProgram(value) {
    setForm((current) => ({ ...current, program: value, admissionCycle: '' }))
    setErrors((current) => ({ ...current, program: undefined, admissionCycle: undefined }))
    if (form.university) {
      try {
        await loadOptions(form.university, value)
      } catch {
        setMessageKind('error')
        setMessage('Could not load relationship options. Please try again.')
      }
    }
  }

  async function beginEdit(record) {
    const university = record.university?.id || ''
    const program = record.program?.id || ''
    try {
      await loadOptions(university, program)
    } catch {
      setMessageKind('error')
      setMessage('Could not load this record’s relationship options. Please try again.')
      return
    }
    setEditingId(record.id)
    setForm({
      university,
      program,
      admissionCycle: record.admissionCycle?.id || '',
      researchStatus: record.researchStatus,
      officialSourceUrl: record.officialSourceUrl,
      sourceTitle: record.sourceTitle,
      reviewedDate: String(record.reviewedDate).slice(0, 10),
      evidenceNotes: record.evidenceNotes,
      unresolvedItems: record.unresolvedItems.join('\n'),
    })
    setErrors({})
    setMessage('')
    window.requestAnimationFrame(() => document.getElementById('research-form-heading')?.focus())
  }

  function resetForm() {
    setEditingId('')
    setForm({ ...emptyForm, reviewedDate: new Date().toISOString().slice(0, 10) })
    setErrors({})
    loadOptions().catch(() => {})
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    setMessage('')
    try {
      if (editingId) await updateEligibilityResearch(editingId, form)
      else await createEligibilityResearch(form)
      setMessageKind('success')
      setMessage(
        `Research ${editingId ? 'updated' : 'created'}. No eligibility rule or publication state was changed.`,
      )
      resetForm()
      setRetry((value) => value + 1)
    } catch (error) {
      setErrors(getApiFieldErrors(error))
      setMessageKind('error')
      setMessage(getApiErrorMessage(error, 'Could not save this research record.'))
    } finally {
      setSaving(false)
    }
  }

  const pagination = result?.pagination
  return <div className="min-w-0">
    <div id="research-page-heading" tabIndex={-1}>
      <AdminHeading
        eyebrow="Eligibility evidence"
        title="Eligibility research tracker"
        description="Record official evidence and unresolved criteria before any eligibility rule is created. A verified research status confirms review of this evidence only; it never evaluates students or changes an eligibility rule."
      />
    </div>
    {message && <p role={messageKind === 'error' ? 'alert' : 'status'} className={`mb-5 border-l-4 p-4 text-sm font-bold ${messageKind === 'error' ? 'border-red-800 bg-red-50 text-red-900' : 'border-emerald-700 bg-emerald-50 text-emerald-900'}`}>{message}</p>}

    <section aria-labelledby="research-records-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div><h2 id="research-records-heading" className="section-title text-2xl text-navy">Research records</h2><p className="mt-1 text-sm text-[var(--ui-muted)]">Private to catalogue administrators.</p></div>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm font-bold">Status <select className={`${adminInputClass} ml-2`} value={filters.researchStatus} onChange={(event) => setFilters((current) => ({ ...current, researchStatus: event.target.value, page: 1 }))}><option value="">All statuses</option>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="text-sm font-bold">Sort <select className={`${adminInputClass} ml-2`} value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value, page: 1 }))}><option value="-updatedAt">Recently updated</option><option value="updatedAt">Oldest update</option><option value="-reviewedDate">Newest review date</option><option value="reviewedDate">Oldest review date</option></select></label>
        </div>
      </div>
      <AdminState state={state} retry={() => setRetry((value) => value + 1)} noun="eligibility research" />
      {state === 'ready' && <>
        <p role="status" className="mb-4 text-sm text-[var(--ui-muted)]">{pagination.totalRecords} research records · page {pagination.page} of {Math.max(pagination.totalPages, 1)}</p>
        {result.records.length === 0 ? <div className="paper-surface p-7"><h3 className="text-lg font-black">No research records yet</h3><p className="mt-2 text-sm text-[var(--ui-muted)]">Create the first evidence record below. No eligibility decision will be produced.</p></div> :
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">{result.records.map((record) => {
            const safeUrl = getSafeExternalUrl(record.officialSourceUrl)
            return <article key={record.id} className="paper-surface min-w-0 border-l-4 !border-l-gold p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="break-words text-lg font-black">{record.program?.name}</h3><p className="break-words text-sm text-[var(--ui-muted)]">{record.university?.name}</p></div><StatusBadge value={record.researchStatus} /></div>
              {record.admissionCycle && <p className="mt-2 text-sm"><strong>Cycle:</strong> {record.admissionCycle.name}</p>}
              <dl className="mt-4 space-y-2 text-sm"><div><dt className="font-bold">Official evidence</dt><dd className="break-all">{safeUrl ? <a className="text-academic underline" href={safeUrl} target="_blank" rel="noopener noreferrer">{record.sourceTitle} (external site)</a> : 'Unsafe source URL'}</dd></div><div><dt className="font-bold">Reviewed date</dt><dd>{new Date(record.reviewedDate).toLocaleDateString()}</dd></div><div><dt className="font-bold">Unresolved items</dt><dd>{record.unresolvedItems.length || 'None recorded'}</dd></div><div><dt className="font-bold">Last reviewed by</dt><dd>{record.reviewedBy?.name || 'Administrator'} ({record.reviewedBy?.role?.replaceAll('_', ' ') || 'content manager'})</dd></div></dl>
              <button type="button" className={`${adminButtonClass} mt-5`} onClick={() => beginEdit(record)}>Edit research</button>
            </article>
          })}</div>}
        {pagination.totalPages > 1 && <nav aria-label="Eligibility research pagination" className="mt-8 flex items-center justify-center gap-3"><button type="button" className="action-secondary" disabled={pagination.page <= 1} onClick={() => { setFilters((current) => ({ ...current, page: current.page - 1 })); window.requestAnimationFrame(() => document.getElementById('research-page-heading')?.focus()) }}>Previous</button><span aria-current="page" className="text-sm font-bold">Page {pagination.page} of {pagination.totalPages}</span><button type="button" className="action-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => { setFilters((current) => ({ ...current, page: current.page + 1 })); window.requestAnimationFrame(() => document.getElementById('research-page-heading')?.focus()) }}>Next</button></nav>}
      </>}
    </section>

    <section className="mt-10 border-t border-[var(--ui-border)] pt-8" aria-labelledby="research-form-heading">
      <h2 id="research-form-heading" tabIndex={-1} className="section-title text-2xl text-navy">{editingId ? 'Edit research evidence' : 'Add research evidence'}</h2>
      <p className="mt-2 max-w-3xl text-sm text-[var(--ui-muted)]">Use an official source and record ambiguity explicitly. “Verified” means an administrator reviewed this research record only.</p>
      <form className="paper-surface mt-5 grid min-w-0 gap-5 p-5 md:grid-cols-2" onSubmit={submit} noValidate>
        <AdminField id="university" label="University" error={errors.university}>
          <select id="university" className={adminInputClass} value={form.university} onChange={(event) => changeUniversity(event.target.value)} aria-describedby={describedBy('university', errors)} required><option value="">Select university</option>{options.universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </AdminField>
        <AdminField id="program" label="Program" error={errors.program} hint={selectedUniversityName ? `Programs stored for ${selectedUniversityName}.` : 'Select a university first.'}>
          <select id="program" className={adminInputClass} value={form.program} onChange={(event) => changeProgram(event.target.value)} aria-describedby={describedBy('program', errors, true)} disabled={!form.university} required><option value="">Select program</option>{options.programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </AdminField>
        <AdminField id="admissionCycle" label="Admission cycle (optional)" error={errors.admissionCycle} hint="Only cycles that include the selected program are offered.">
          <select id="admissionCycle" className={adminInputClass} value={form.admissionCycle} onChange={(event) => setField('admissionCycle', event.target.value)} aria-describedby={describedBy('admissionCycle', errors, true)} disabled={!form.program}><option value="">No cycle selected</option>{options.admissionCycles.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</select>
        </AdminField>
        <AdminField id="researchStatus" label="Research status" error={errors.researchStatus}>
          <select id="researchStatus" className={adminInputClass} value={form.researchStatus} onChange={(event) => setField('researchStatus', event.target.value)} aria-describedby={describedBy('researchStatus', errors)}>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select>
        </AdminField>
        <AdminField id="officialSourceUrl" label="Official source URL" error={errors.officialSourceUrl} hint="HTTP or HTTPS only; embedded credentials are rejected.">
          <input id="officialSourceUrl" type="url" className={adminInputClass} value={form.officialSourceUrl} onChange={(event) => setField('officialSourceUrl', event.target.value)} aria-describedby={describedBy('officialSourceUrl', errors, true)} maxLength={2048} required />
        </AdminField>
        <AdminField id="sourceTitle" label="Source title" error={errors.sourceTitle}>
          <input id="sourceTitle" className={adminInputClass} value={form.sourceTitle} onChange={(event) => setField('sourceTitle', event.target.value)} aria-describedby={describedBy('sourceTitle', errors)} maxLength={240} required />
        </AdminField>
        <AdminField id="reviewedDate" label="Reviewed date" error={errors.reviewedDate}>
          <input id="reviewedDate" type="date" className={adminInputClass} value={form.reviewedDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setField('reviewedDate', event.target.value)} aria-describedby={describedBy('reviewedDate', errors)} required />
        </AdminField>
        <div className="md:col-span-2"><AdminField id="evidenceNotes" label="Concise evidence notes" error={errors.evidenceNotes} hint="Record what the official source establishes; do not infer missing criteria."><textarea id="evidenceNotes" className={`${adminInputClass} min-h-32`} value={form.evidenceNotes} onChange={(event) => setField('evidenceNotes', event.target.value)} aria-describedby={describedBy('evidenceNotes', errors, true)} maxLength={3000} required /></AdminField></div>
        <div className="md:col-span-2"><AdminField id="unresolvedItems" label="Unresolved items" error={errors.unresolvedItems} hint="One concise unresolved criterion per line; leave empty only when none remain."><textarea id="unresolvedItems" className={`${adminInputClass} min-h-28`} value={form.unresolvedItems} onChange={(event) => setField('unresolvedItems', event.target.value)} aria-describedby={describedBy('unresolvedItems', errors, true)} /></AdminField></div>
        <div className="flex flex-wrap gap-3 md:col-span-2"><button type="submit" className={adminButtonClass} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save research changes' : 'Create research record'}</button>{editingId && <button type="button" className="action-secondary" onClick={resetForm} disabled={saving}>Cancel edit</button>}<Link to="/admin/verification-queue" className="action-secondary">Open catalogue verification queue</Link></div>
      </form>
    </section>
  </div>
}
