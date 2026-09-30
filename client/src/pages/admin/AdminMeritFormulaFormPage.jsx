import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminField, AdminHeading, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import FormAlert from '../../components/FormAlert.jsx'
import LoadingScreen from '../../components/LoadingScreen.jsx'
import SourceVerificationFields from '../../components/SourceVerificationFields.jsx'
import { listAdminPrograms, listAdminUniversities } from '../../services/adminCatalogueApi.js'
import { buildMeritFormulaPayload, getMeritFormula, listEntryTests, saveMeritFormula } from '../../services/meritManagementApi.js'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors.js'
import { fieldDescription } from '../../utils/adminFields.js'

const component = () => ({ basis: 'matric', label: '', weightPercentage: '', entryTest: '' })
const blank = { code: '', name: '', university: '', program: '', admissionCycle: '', components: [component()], recordStatus: 'draft', source: { officialUrl: '', verificationStatus: 'pending_review', lastVerifiedAt: '' } }
const localDateTime = (value) => value ? new Date(value).toISOString().slice(0, 19) : ''

export default function AdminMeritFormulaFormPage() {
  const { meritFormulaId } = useParams()
  const editing = Boolean(meritFormulaId)
  const navigate = useNavigate()
  const [form, setForm] = useState(blank)
  const [universities, setUniversities] = useState([])
  const [programs, setPrograms] = useState([])
  const [tests, setTests] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [originalUrl, setOriginalUrl] = useState('')
  const total = useMemo(() => form.components.reduce((sum, item) => sum + (Number(item.weightPercentage) || 0), 0), [form.components])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      listAdminUniversities({ pageSize: 100, sort: 'name' }, controller.signal),
      listEntryTests({ pageSize: 100, sort: 'name' }, controller.signal),
      editing ? getMeritFormula(meritFormulaId, controller.signal) : Promise.resolve(null),
    ]).then(([universityResult, testResult, record]) => {
      setUniversities(universityResult.items); setTests(testResult.items)
      if (record) {
        const next = { code: record.code, name: record.name, university: record.university?.id || '', program: record.program?.id || '', admissionCycle: record.admissionCycle?.id || '', components: record.components.map((item) => ({ basis: item.basis, label: item.label, weightPercentage: String(item.weightPercentage), entryTest: item.entryTest?.id || '' })), recordStatus: record.recordStatus, source: { ...record.source, lastVerifiedAt: localDateTime(record.source?.lastVerifiedAt) } }
        setForm(next); setOriginalUrl(next.source.officialUrl)
      }
      setState('ready')
    }).catch((caught) => { if (caught.name !== 'CanceledError') { setError(getApiErrorMessage(caught, 'Could not load merit-formula options.')); setState('error') } })
    return () => controller.abort()
  }, [editing, meritFormulaId])

  useEffect(() => {
    if (!form.university) { setPrograms([]); return undefined }
    const controller = new AbortController()
    listAdminPrograms({ university: form.university, pageSize: 100, sort: 'name' }, controller.signal)
      .then((result) => setPrograms(result.items)).catch((caught) => { if (caught.name !== 'CanceledError') setPrograms([]) })
    return () => controller.abort()
  }, [form.university])

  function updateComponent(index, key, value) { setForm((current) => ({ ...current, components: current.components.map((item, position) => position === index ? { ...item, [key]: value, ...(key === 'basis' && value !== 'entry_test' ? { entryTest: '' } : {}) } : item) })) }
  async function submit(event) {
    event.preventDefault(); setError(''); setErrors({})
    if (Math.abs(total - 100) > 0.0001) { setErrors({ components: 'Formula weights must total exactly 100%.' }); setError('Review the formula components.'); return }
    if (new Set(form.components.map((item) => item.basis)).size !== form.components.length) { setErrors({ components: 'Each component basis may appear only once.' }); setError('Review the formula components.'); return }
    if (form.components.some((item) => !item.label.trim() || item.weightPercentage === '' || (item.basis === 'entry_test' && !item.entryTest))) { setErrors({ components: 'Complete every formula component before saving.' }); setError('Review the formula components.'); return }
    setState('saving')
    try { await saveMeritFormula(meritFormulaId, buildMeritFormulaPayload(form)); navigate('/admin/merit-formulas', { replace: true }) }
    catch (caught) { setErrors(getApiFieldErrors(caught)); setError(getApiErrorMessage(caught, 'Could not save this merit formula.')); setState('ready') }
  }
  const preview = form.components.map((item) => {
    const test = tests.find((candidate) => candidate.id === item.entryTest)
    return `${item.basis === 'entry_test' ? (test?.code || item.label || 'Entry test') : (item.label || item.basis.toUpperCase())} ${item.weightPercentage || 0}%`
  }).join(' + ')

  if (state === 'loading') return <LoadingScreen label="Loading merit formula" />
  return <>
    <AdminHeading eyebrow="Merit configuration" title={editing ? 'Edit merit formula' : 'Add merit formula'} description="Define trusted percentages only. Student marks and all arithmetic belong to the later backend calculator." />
    {error && <FormAlert message={error} />}
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset className="paper-surface p-5 sm:p-7"><legend className="px-2 text-xl font-black text-navy">Formula scope</legend><div className="grid gap-5 md:grid-cols-2">
        <AdminField id="formula-name" label="Formula name" error={errors.name}><input id="formula-name" required maxLength={200} className={adminInputClass} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({}) }} aria-invalid={Boolean(errors.name)} aria-describedby={fieldDescription('formula-name', errors.name)} /></AdminField>
        <AdminField id="formula-code" label="Formula code" error={errors.code}><input id="formula-code" required maxLength={80} className={adminInputClass} value={form.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setErrors({}) }} aria-invalid={Boolean(errors.code)} aria-describedby={fieldDescription('formula-code', errors.code)} /></AdminField>
        <AdminField id="formula-university" label="University" error={errors.university}><select id="formula-university" required className={adminInputClass} value={form.university} onChange={(e) => { setForm({ ...form, university: e.target.value, program: '' }); setErrors({}) }} aria-invalid={Boolean(errors.university)} aria-describedby={fieldDescription('formula-university', errors.university)}><option value="">Select university</option>{universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></AdminField>
        <AdminField id="formula-program" label="Program" hint="Optional; choices are limited to the selected university."><select id="formula-program" className={adminInputClass} value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}><option value="">All programs at this university</option>{programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></AdminField>
        <AdminField id="formula-cycle" label="Admission cycle ID" hint="Optional existing cycle identifier; the server verifies university ownership." error={errors.admissionCycle}><input id="formula-cycle" pattern="[a-fA-F0-9]{24}" className={adminInputClass} value={form.admissionCycle} onChange={(e) => setForm({ ...form, admissionCycle: e.target.value })} aria-invalid={Boolean(errors.admissionCycle)} aria-describedby={fieldDescription('formula-cycle', errors.admissionCycle, true)} /></AdminField>
        <AdminField id="formula-status" label="Publication status"><select id="formula-status" className={adminInputClass} value={form.recordStatus} onChange={(e) => setForm({ ...form, recordStatus: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></AdminField>
      </div></fieldset>
      <fieldset className="paper-surface p-5 sm:p-7"><legend className="px-2 text-xl font-black text-navy">Declarative components</legend><p className="mb-5 text-sm text-[var(--ui-muted)]">Only Matric, DAE, and Entry Test percentages are allowed. Intermediate values will not be rounded; the future final aggregate will be rounded to two decimal places.</p>
        <div className="space-y-4">{form.components.map((item, index) => <div key={`${index}-${item.basis}`} className="grid gap-4 border border-[var(--ui-border)] bg-white p-4 md:grid-cols-[1fr_1fr_10rem_auto]">
          <AdminField id={`basis-${index}`} label="Basis"><select id={`basis-${index}`} className={adminInputClass} value={item.basis} onChange={(e) => updateComponent(index, 'basis', e.target.value)}>{['matric', 'dae', 'entry_test'].map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></AdminField>
          <AdminField id={`label-${index}`} label="Student-facing label"><input id={`label-${index}`} required maxLength={120} className={adminInputClass} value={item.label} onChange={(e) => updateComponent(index, 'label', e.target.value)} /></AdminField>
          <AdminField id={`weight-${index}`} label="Weight %"><input id={`weight-${index}`} type="number" min="0" max="100" step="0.01" required className={adminInputClass} value={item.weightPercentage} onChange={(e) => updateComponent(index, 'weightPercentage', e.target.value)} aria-invalid={Boolean(errors.components)} aria-describedby={errors.components ? 'formula-components-error' : undefined} /></AdminField>
          <button type="button" className="action-secondary self-end" disabled={form.components.length === 1} onClick={() => setForm((current) => ({ ...current, components: current.components.filter((_, position) => position !== index) }))}>Remove</button>
          {item.basis === 'entry_test' && <div className="md:col-span-4"><AdminField id={`test-${index}`} label="Linked entry test"><select id={`test-${index}`} required className={adminInputClass} value={item.entryTest} onChange={(e) => updateComponent(index, 'entryTest', e.target.value)}><option value="">Select entry test</option>{tests.map((test) => <option key={test.id} value={test.id}>{test.name} ({test.code})</option>)}</select></AdminField></div>}
        </div>)}</div>
        {errors.components && <p id="formula-components-error" role="alert" className="mt-3 font-semibold text-[#8b2525]">{errors.components}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><button type="button" className="action-secondary" disabled={form.components.length >= 3} onClick={() => setForm((current) => ({ ...current, components: [...current.components, component()] }))}>Add component</button><p role="status" className={`font-black ${Math.abs(total - 100) < 0.0001 ? 'text-[#145b42]' : 'text-[#8b2525]'}`}>Total weight: {total}%</p></div>
        <div className="mt-5 border-l-4 border-gold bg-bluewash p-4"><h2 className="font-black text-navy">Human-readable preview</h2><p className="mt-2 break-words">{preview} = {total}%</p></div>
      </fieldset>
      <SourceVerificationFields value={form.source} originalUrl={originalUrl} publicationStatus={form.recordStatus} errors={errors} onChange={(key, value) => { setForm((current) => ({ ...current, source: { ...current.source, [key]: value } })); setErrors({}) }} />
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-[var(--ui-border)] bg-ivory/95 py-4"><Link className="action-secondary" to="/admin/merit-formulas">Cancel</Link><button className={adminButtonClass} disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save merit formula'}</button></div>
    </form>
  </>
}
