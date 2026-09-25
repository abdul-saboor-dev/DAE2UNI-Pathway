import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AdminField, AdminHeading, AdminState, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import { fieldDescription } from '../../utils/adminFields.js'
import SourceVerificationFields from '../../components/SourceVerificationFields.jsx'
import { createAdminProgram, getAdminProgram, getAdminUniversity, listAdminUniversities, updateAdminProgram } from '../../services/adminCatalogueApi.js'
import { buildProgramPayload, programStatusOptions } from '../../utils/adminCatalogue.js'
import { toLocalDateTime } from '../../utils/adminDates.js'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors.js'
import { getSafeExternalUrl } from '../../utils/externalLinks.js'

const blankForm = { university: '', name: '', slug: '', degreeTitle: '', credentialType: 'BS', degreeLevel: 'undergraduate', department: '', disciplineCode: '', years: '4', semesters: '', campusIds: [], studyMode: 'morning', source: { officialUrl: '', verificationStatus: 'unverified', lastVerifiedAt: '' }, recordStatus: 'draft' }
function fromRecord(record) { return { university: record.university?.id || '', name: record.name || '', slug: record.slug || '', degreeTitle: record.degreeTitle || '', credentialType: record.credentialType || 'BS', degreeLevel: record.degreeLevel || 'undergraduate', department: record.department || '', disciplineCode: record.disciplineCode || '', years: String(record.duration?.years ?? 4), semesters: record.duration?.semesters ?? '', campusIds: record.campusIds || [], studyMode: record.studyMode || 'morning', source: { officialUrl: record.source?.officialUrl || '', verificationStatus: record.source?.verificationStatus || 'unverified', lastVerifiedAt: toLocalDateTime(record.source?.lastVerifiedAt) }, recordStatus: record.recordStatus || 'draft' } }
function validate(form, university) {
  const errors = {}
  if (!form.university) errors.university = 'Select a university.'
  if (!form.name.trim()) errors.name = 'Program name is required.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim().toLowerCase())) errors.slug = 'Use a lowercase hyphenated slug.'
  if (!form.degreeTitle.trim()) errors.degreeTitle = 'Degree title is required.'
  if (!getSafeExternalUrl(form.source.officialUrl)) errors['source.officialUrl'] = 'Enter an HTTP or HTTPS official URL without embedded credentials.'
  if (form.source.verificationStatus === 'verified' && (!form.source.lastVerifiedAt || Number.isNaN(new Date(form.source.lastVerifiedAt).getTime()))) errors['source.lastVerifiedAt'] = 'A valid manual verification date is required.'
  if (!Number.isFinite(Number(form.years)) || Number(form.years) < 1 || Number(form.years) > 6) errors['duration.years'] = 'Enter a duration from 1 to 6 years.'
  const available = new Set(university?.campuses?.map((campus) => campus.id) || [])
  if (form.campusIds.some((id) => !available.has(id))) errors.campusIds = 'Selected campuses must belong to the chosen university.'
  return errors
}

export default function AdminProgramFormPage() {
  const { programId } = useParams()
  const isNew = !programId
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState(blankForm)
  const [original, setOriginal] = useState(null)
  const [university, setUniversity] = useState(null)
  const [state, setState] = useState(isNew ? 'ready' : 'loading')
  const [retryKey, setRetryKey] = useState(0)
  const [universitySearch, setUniversitySearch] = useState('')
  const [options, setOptions] = useState([])
  const [optionsStatus, setOptionsStatus] = useState('loading')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(location.state?.success || '')
  const [messageKind, setMessageKind] = useState('success')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew) return undefined
    if (!/^[a-f\d]{24}$/i.test(programId)) { setState('not-found'); return undefined }
    const controller = new AbortController()
    let active = true
    getAdminProgram(programId, controller.signal).then(async (record) => {
      if (!record) { if (active) setState('not-found'); return }
      const parent = await getAdminUniversity(record.university.id, controller.signal)
      if (active) { setOriginal(record); setForm(fromRecord(record)); setUniversity(parent); setState('ready') }
    }).catch((error) => { if (active && error.name !== 'CanceledError') setState(error.response?.status === 404 ? 'not-found' : 'error') })
    return () => { active = false; controller.abort() }
  }, [isNew, programId, retryKey])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timer = window.setTimeout(() => {
      setOptionsStatus('loading')
      listAdminUniversities({ search: universitySearch.trim(), page: 1, pageSize: 20, sort: 'name' }, controller.signal)
        .then((result) => { if (active) { setOptions(result.items); setOptionsStatus(result.pagination.totalPages > 1 ? 'more' : 'ready') } })
        .catch((error) => { if (active && error.name !== 'CanceledError') setOptionsStatus('error') })
    }, 250)
    return () => { active = false; window.clearTimeout(timer); controller.abort() }
  }, [universitySearch])

  useEffect(() => {
    if (!form.university || university?.id === form.university) return undefined
    const controller = new AbortController()
    let active = true
    getAdminUniversity(form.university, controller.signal)
      .then((selected) => { if (active) setUniversity(selected) })
      .catch((error) => { if (active && error.name !== 'CanceledError') setMessage('Could not load this university’s campuses. Choose it again or retry.') })
    return () => { active = false; controller.abort() }
  }, [form.university, university?.id])

  function change(key, value) { setForm((current) => ({ ...current, [key]: value })); setErrors({}); setMessage('') }
  function changeSource(key, value) { setForm((current) => ({ ...current, source: { ...current.source, [key]: value } })); setErrors({}); setMessage('') }
  function selectUniversity(id) {
    setForm((current) => ({ ...current, university: id, campusIds: [] }))
    setUniversity(null)
    setErrors({}); setMessage('')
  }
  function toggleCampus(id, checked) {
    change('campusIds', checked ? [...new Set([...form.campusIds, id])] : form.campusIds.filter((item) => item !== id))
  }
  async function save(event) {
    event.preventDefault()
    if (saving) return
    const nextErrors = validate(form, university)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { setMessageKind('error'); setMessage('Review the highlighted fields before saving.'); return }
    setSaving(true); setMessage('')
    try {
      const payload = buildProgramPayload(form, original, isNew)
      const record = isNew ? await createAdminProgram(payload) : await updateAdminProgram(programId, payload)
      navigate(`/admin/programs/${record.id}/edit`, { replace: true, state: { success: 'Program saved.' } })
      setMessageKind('success'); setMessage('Program saved.')
      if (!isNew) { setOriginal(record); setForm(fromRecord(record)) }
    } catch (error) { setErrors(getApiFieldErrors(error)); setMessageKind('error'); setMessage(getApiErrorMessage(error, 'Could not save the program.')) }
    finally { setSaving(false) }
  }

  if (state === 'not-found') return <div role="alert"><h1 className="text-2xl font-black">Program not found</h1><Link to="/admin/programs" className="text-academic underline">Back to programs</Link></div>
  if (state !== 'ready') return <AdminState state={state} retry={() => { setState('loading'); setRetryKey((value) => value + 1) }} noun="program" />
  return <>
    <AdminHeading eyebrow="Program management" title={isNew ? 'Add program' : `Edit ${original?.name || 'program'}`} description="Associate each program with an existing university and its own official source. Eligibility and merit are not evaluated here." />
    <form onSubmit={save} noValidate className="min-w-0 space-y-6">
      {message && <div role={messageKind === 'error' ? 'alert' : 'status'} className={`rounded-xl p-4 text-sm font-semibold ${messageKind === 'error' ? 'bg-red-50 text-red-900' : 'bg-emerald-50 text-emerald-900'}`}>{message}</div>}
      <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-lg font-black">Program identity</legend><div className="grid min-w-0 gap-5 md:grid-cols-2">
        <AdminField id="university-search" label="Find a university" hint="Search is limited to 20 matches; narrow the name if needed."><input id="university-search" type="search" className={adminInputClass} value={universitySearch} onChange={(event) => setUniversitySearch(event.target.value)} aria-describedby="university-search-hint" /></AdminField>
        <AdminField id="program-university" label="Parent university" error={errors.university}><select id="program-university" value={form.university} className={adminInputClass} onChange={(event) => selectUniversity(event.target.value)} aria-invalid={Boolean(errors.university)} aria-describedby={fieldDescription('program-university', errors.university)}><option value="">Choose a university</option>{university && !options.some((item) => item.id === university.id) && <option value={university.id}>{university.name}</option>}{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{optionsStatus === 'more' && <p className="mt-1 text-xs text-slate-600">More universities match. Narrow your search.</p>}{optionsStatus === 'error' && <p role="alert" className="mt-1 text-xs text-red-800">University search is unavailable. Change the search to retry.</p>}</AdminField>
        {[["name", "Program name", 200], ["slug", "Program slug", 200], ["degreeTitle", "Degree title", 160], ["department", "Department", 160], ["disciplineCode", "Discipline code", 40]].map(([key, label, max]) => <AdminField key={key} id={`program-${key}`} label={label} error={errors[key]}><input id={`program-${key}`} className={adminInputClass} maxLength={max} value={form[key]} onChange={(event) => change(key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={fieldDescription(`program-${key}`, errors[key])} /></AdminField>)}
        <AdminField id="program-credential" label="Credential type"><select id="program-credential" className={adminInputClass} value={form.credentialType} onChange={(event) => change('credentialType', event.target.value)}>{['BS', 'BSc', 'BE', 'BTech', 'ADP', 'other'].map((value) => <option key={value} value={value}>{value}</option>)}</select></AdminField>
        <AdminField id="program-level" label="Degree level"><select id="program-level" className={adminInputClass} value={form.degreeLevel} onChange={(event) => change('degreeLevel', event.target.value)}><option value="undergraduate">Undergraduate</option></select></AdminField>
        <AdminField id="program-mode" label="Study mode"><select id="program-mode" className={adminInputClass} value={form.studyMode} onChange={(event) => change('studyMode', event.target.value)}>{['morning', 'evening', 'weekend', 'multiple'].map((value) => <option key={value} value={value}>{value}</option>)}</select></AdminField>
        <AdminField id="program-years" label="Duration in years" error={errors['duration.years']}><input id="program-years" type="number" min="1" max="6" step="0.5" className={adminInputClass} value={form.years} onChange={(event) => change('years', event.target.value)} aria-invalid={Boolean(errors['duration.years'])} aria-describedby={fieldDescription('program-years', errors['duration.years'])} /></AdminField>
        <AdminField id="program-semesters" label="Semesters"><input id="program-semesters" type="number" min="2" max="12" className={adminInputClass} value={form.semesters} onChange={(event) => change('semesters', event.target.value)} /></AdminField>
      </div></fieldset>
      <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-lg font-black">Offered campuses</legend><p className="mb-4 text-sm text-slate-600">Only campuses of the selected university can be chosen. If none are selected, the API treats the program as offered at all active campuses.</p>{errors.campusIds && <p role="alert" className="mb-3 text-sm font-bold text-red-800">{errors.campusIds}</p>}
        {!university ? <p className="text-sm text-slate-600">Choose a university to see its campuses.</p> : <div className="grid gap-3 sm:grid-cols-2">{university.campuses?.map((campus) => <label key={campus.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={form.campusIds.includes(campus.id)} onChange={(event) => toggleCampus(campus.id, event.target.checked)} /><span className="min-w-0 break-words"><strong>{campus.name}</strong> · {campus.city}{!campus.isActive && <em className="ml-1 text-amber-900">(inactive)</em>}</span></label>)}</div>}
      </fieldset>
      <SourceVerificationFields value={form.source} onChange={changeSource} errors={errors} originalUrl={original?.source?.officialUrl} publicationStatus={form.recordStatus} />
      <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-lg font-black">Publication</legend><AdminField id="program-publication" label="Publication status" error={errors.recordStatus}><select id="program-publication" className={adminInputClass} value={form.recordStatus} onChange={(event) => change('recordStatus', event.target.value)}>{programStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></AdminField></fieldset>
      <div className="sticky bottom-2 z-10 flex flex-wrap gap-3 border-t-4 border-gold bg-[var(--ui-paper)] p-4 shadow-lg"><button type="submit" disabled={saving} className={adminButtonClass}>{saving ? 'Saving…' : 'Save program'}</button><Link to="/admin/programs" className="action-secondary">Cancel</Link></div>
    </form>
  </>
}
