import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminField, AdminHeading, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import FormAlert from '../../components/FormAlert.jsx'
import LoadingScreen from '../../components/LoadingScreen.jsx'
import SourceVerificationFields from '../../components/SourceVerificationFields.jsx'
import { buildEntryTestPayload, getEntryTest, saveEntryTest } from '../../services/meritManagementApi.js'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors.js'
import { fieldDescription } from '../../utils/adminFields.js'

const blank = {
  name: '', code: '', conductingBody: '', category: 'university_specific', resultUnit: 'score',
  maximumScore: '', defaultPassingScore: '', negativeMarking: false,
  applicableQualificationCodes: '', recordStatus: 'draft',
  source: { officialUrl: '', verificationStatus: 'pending_review', lastVerifiedAt: '' },
}
const localDateTime = (value) => value ? new Date(value).toISOString().slice(0, 19) : ''

export default function AdminEntryTestFormPage() {
  const { entryTestId } = useParams()
  const editing = Boolean(entryTestId)
  const navigate = useNavigate()
  const [form, setForm] = useState(blank)
  const [state, setState] = useState(editing ? 'loading' : 'ready')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [originalUrl, setOriginalUrl] = useState('')

  useEffect(() => {
    if (!editing) return undefined
    const controller = new AbortController()
    getEntryTest(entryTestId, controller.signal).then((record) => {
      const next = {
        name: record.name, code: record.code, conductingBody: record.conductingBody,
        category: record.category, resultUnit: record.scoring.resultUnit,
        maximumScore: record.scoring.maximumScore ?? '', defaultPassingScore: record.scoring.defaultPassingScore ?? '',
        negativeMarking: Boolean(record.scoring.negativeMarking), applicableQualificationCodes: (record.applicableQualificationCodes || []).join(', '),
        recordStatus: record.recordStatus,
        source: { ...record.source, lastVerifiedAt: localDateTime(record.source?.lastVerifiedAt) },
      }
      setForm(next); setOriginalUrl(next.source.officialUrl); setState('ready')
    }).catch((caught) => { if (caught.name !== 'CanceledError') { setError(getApiErrorMessage(caught, 'Could not load this entry test.')); setState('error') } })
    return () => controller.abort()
  }, [editing, entryTestId])

  function field(key, value) { setForm((current) => ({ ...current, [key]: value })); setErrors({}) }
  async function submit(event) {
    event.preventDefault(); setError(''); setErrors({})
    if (form.resultUnit === 'score' && (!(Number(form.maximumScore) > 0) || !Number.isFinite(Number(form.maximumScore)))) {
      setErrors({ 'scoring.maximumScore': 'Maximum marks must be a positive finite number.' }); setError('Review the highlighted field.'); return
    }
    setState('saving')
    try { await saveEntryTest(entryTestId, buildEntryTestPayload(form)); navigate('/admin/entry-tests', { replace: true }) }
    catch (caught) { setErrors(getApiFieldErrors(caught)); setError(getApiErrorMessage(caught, 'Could not save this entry test.')); setState('ready') }
  }

  if (state === 'loading') return <LoadingScreen label="Loading entry test" />
  return <>
    <AdminHeading eyebrow="Merit configuration" title={editing ? 'Edit entry test' : 'Add entry test'} description="Record the official test identity and score scale. No student marks or calculated results are stored here." />
    {error && <FormAlert message={error} />}
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset className="paper-surface p-5 sm:p-7"><legend className="px-2 text-xl font-black text-navy">Test identity</legend><div className="grid gap-5 md:grid-cols-2">
        <AdminField id="test-name" label="Test name" error={errors.name}><input id="test-name" required maxLength={180} className={adminInputClass} value={form.name} onChange={(e) => field('name', e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={fieldDescription('test-name', errors.name)} /></AdminField>
        <AdminField id="test-code" label="Code" error={errors.code}><input id="test-code" required maxLength={40} className={adminInputClass} value={form.code} onChange={(e) => field('code', e.target.value)} aria-invalid={Boolean(errors.code)} aria-describedby={fieldDescription('test-code', errors.code)} /></AdminField>
        <AdminField id="test-body" label="Conducting body" error={errors.conductingBody}><input id="test-body" required maxLength={180} className={adminInputClass} value={form.conductingBody} onChange={(e) => field('conductingBody', e.target.value)} aria-invalid={Boolean(errors.conductingBody)} aria-describedby={fieldDescription('test-body', errors.conductingBody)} /></AdminField>
        <AdminField id="test-category" label="Category"><select id="test-category" className={adminInputClass} value={form.category} onChange={(e) => field('category', e.target.value)}>{['engineering', 'general', 'university_specific', 'aptitude', 'other'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></AdminField>
        <AdminField id="test-unit" label="Result unit"><select id="test-unit" className={adminInputClass} value={form.resultUnit} onChange={(e) => field('resultUnit', e.target.value)}>{['score', 'percentage', 'percentile'].map((value) => <option key={value}>{value}</option>)}</select></AdminField>
        <AdminField id="test-max" label="Maximum marks / score scale" hint="Required and positive for score-based tests." error={errors['scoring.maximumScore']}><input id="test-max" type="number" min="1" step="any" required={form.resultUnit === 'score'} className={adminInputClass} value={form.maximumScore} onChange={(e) => field('maximumScore', e.target.value)} aria-invalid={Boolean(errors['scoring.maximumScore'])} aria-describedby={fieldDescription('test-max', errors['scoring.maximumScore'], true)} /></AdminField>
        <AdminField id="test-pass" label="Default passing score" hint="Optional; cannot exceed maximum marks."><input id="test-pass" type="number" min="0" step="any" className={adminInputClass} value={form.defaultPassingScore} onChange={(e) => field('defaultPassingScore', e.target.value)} /></AdminField>
        <AdminField id="test-qualifications" label="Applicable qualification codes" hint="Optional comma-separated codes."><input id="test-qualifications" className={adminInputClass} value={form.applicableQualificationCodes} onChange={(e) => field('applicableQualificationCodes', e.target.value)} /></AdminField>
        <label className="flex min-h-11 items-center gap-3 text-sm font-bold"><input type="checkbox" checked={form.negativeMarking} onChange={(e) => field('negativeMarking', e.target.checked)} /> Negative marking applies</label>
        <AdminField id="test-status" label="Publication status"><select id="test-status" className={adminInputClass} value={form.recordStatus} onChange={(e) => field('recordStatus', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></AdminField>
      </div></fieldset>
      <SourceVerificationFields value={form.source} originalUrl={originalUrl} publicationStatus={form.recordStatus} errors={errors} onChange={(key, value) => { setForm((current) => ({ ...current, source: { ...current.source, [key]: value } })); setErrors({}) }} />
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-[var(--ui-border)] bg-ivory/95 py-4"><Link className="action-secondary" to="/admin/entry-tests">Cancel</Link><button className={adminButtonClass} disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save entry test'}</button></div>
    </form>
  </>
}
