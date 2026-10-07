import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminField, AdminHeading, AdminState, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import {
  createEligibilityRule,
  getEligibilityRule,
  getEligibilityRuleOptions,
  updateEligibilityRule,
} from '../../services/eligibilityRuleApi.js'
import {
  buildEligibilityRulePayload,
  emptyEntryTestRequirement,
  emptyQualificationCriterion,
  summarizeEligibilityRule,
} from '../../utils/eligibilityRules.js'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors.js'
import { getSafeExternalUrl } from '../../utils/externalLinks.js'

const emptyForm = () => ({
  code: '', name: '', university: '', program: '', admissionCycle: '', eligibilityResearch: '',
  scope: 'program', qualificationMatchLogic: 'any',
  qualificationCriteria: [emptyQualificationCriterion()],
  domicile: { allowedProvinces: 'Punjab', allowedDistricts: '', required: false, explanation: '' },
  entryTestRequirements: [], effectiveFrom: '', effectiveUntil: '', priority: '0', officialSourceUrl: '',
})

function listText(values) { return (values || []).join(', ') }
function toForm(rule) {
  return {
    code: rule.code, name: rule.name, university: rule.university?.id || '', program: rule.program?.id || '',
    admissionCycle: rule.admissionCycle?.id || '', eligibilityResearch: rule.eligibilityResearch?.id || '',
    scope: rule.scope, qualificationMatchLogic: rule.qualificationMatchLogic,
    qualificationCriteria: rule.qualificationCriteria.map((item) => ({
      ...item, technologyCodes: listText(item.technologyCodes), minimumPercentage: item.minimumPercentage ?? '',
      minimumPassingYear: item.minimumPassingYear ?? '', acceptedBoards: listText(item.acceptedBoards),
      requiredSubjects: listText(item.requiredSubjects),
    })),
    domicile: { ...rule.domicile, allowedProvinces: listText(rule.domicile.allowedProvinces), allowedDistricts: listText(rule.domicile.allowedDistricts) },
    entryTestRequirements: rule.entryTestRequirements.map((item) => ({
      entryTest: item.entryTest?.id || '', required: item.required, minimumScore: item.minimumScore ?? '',
      minimumPercentage: item.minimumPercentage ?? '', explanation: item.explanation,
    })),
    effectiveFrom: rule.effectiveFrom ? String(rule.effectiveFrom).slice(0, 10) : '',
    effectiveUntil: rule.effectiveUntil ? String(rule.effectiveUntil).slice(0, 10) : '',
    priority: String(rule.priority ?? 0), officialSourceUrl: rule.source.officialUrl,
  }
}

export default function AdminEligibilityRuleFormPage() {
  const { ruleId } = useParams()
  const editing = Boolean(ruleId)
  const navigate = useNavigate()
  const [state, setState] = useState('loading')
  const [form, setForm] = useState(emptyForm)
  const [options, setOptions] = useState({ universities: [], programs: [], admissionCycles: [], research: [], entryTests: [] })
  const [sourceStatus, setSourceStatus] = useState('pending_review')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadOptions = useCallback(async (university = '', program = '') => {
    const data = await getEligibilityRuleOptions({ university, program })
    setOptions(data)
    return data
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState('loading')
    Promise.all([loadOptions(), editing ? getEligibilityRule(ruleId, controller.signal) : Promise.resolve(null)])
      .then(async ([, rule]) => {
        if (!active) return
        if (rule) {
          if (rule.recordStatus !== 'draft') throw new Error('Only draft rules can be edited in this workflow.')
          await loadOptions(rule.university?.id, rule.program?.id)
          if (!active) return
          setForm(toForm(rule)); setSourceStatus(rule.source.verificationStatus)
        }
        setState('ready')
      })
      .catch(() => { if (active) setState('error') })
    return () => { active = false; controller.abort() }
  }, [editing, loadOptions, ruleId])

  const selectedResearch = options.research.find((item) => item.id === form.eligibilityResearch)
  const preview = useMemo(() => {
    try { return summarizeEligibilityRule(buildEligibilityRulePayload(form)) }
    catch { return 'Complete the criteria to preview this draft rule.' }
  }, [form])

  function setField(name, value) { setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })) }
  function setNested(group, name, value) { setForm((current) => ({ ...current, [group]: { ...current[group], [name]: value } })) }
  function setCriterion(index, name, value) { setForm((current) => ({ ...current, qualificationCriteria: current.qualificationCriteria.map((item, itemIndex) => itemIndex === index ? { ...item, [name]: value } : item) })) }
  function setTest(index, name, value) { setForm((current) => ({ ...current, entryTestRequirements: current.entryTestRequirements.map((item, itemIndex) => itemIndex === index ? { ...item, [name]: value } : item) })) }

  async function changeUniversity(value) {
    setForm((current) => ({ ...current, university: value, program: '', admissionCycle: '', eligibilityResearch: '' }))
    try { await loadOptions(value) } catch { setError('Could not load university relationships.') }
  }
  async function changeProgram(value) {
    setForm((current) => ({ ...current, program: value, admissionCycle: '', eligibilityResearch: '' }))
    try { await loadOptions(form.university, value) } catch { setError('Could not load program relationships.') }
  }
  async function changeScope(scope) {
    setForm((current) => ({
      ...current,
      scope,
      program: scope === 'university' ? '' : current.program,
      admissionCycle: '',
      eligibilityResearch: scope === 'university' ? '' : current.eligibilityResearch,
    }))
    try { await loadOptions(form.university, scope === 'program' ? form.program : '') }
    catch { setError('Could not load rule relationships.') }
  }

  function clientError() {
    if (!form.code.trim() || !form.name.trim() || !form.university || !form.officialSourceUrl.trim()) return 'Complete the required rule and source fields.'
    if (form.scope === 'program' && !form.program) return 'Select the program governed by this rule.'
    for (const criterion of form.qualificationCriteria) {
      if (!criterion.technologyCodes.trim() || !criterion.explanation.trim()) return 'Every DAE criterion needs technology codes and an explanation.'
      for (const value of [criterion.minimumPercentage, criterion.minimumPassingYear]) {
        if (value !== '' && !Number.isFinite(Number(value))) return 'Criterion numbers must be finite.'
      }
    }
    for (const requirement of form.entryTestRequirements) {
      if (!requirement.entryTest || !requirement.explanation.trim()) return 'Every entry-test requirement needs a test and explanation.'
      for (const value of [requirement.minimumScore, requirement.minimumPercentage]) {
        if (value !== '' && !Number.isFinite(Number(value))) return 'Entry-test thresholds must be finite.'
      }
    }
    if (!Number.isInteger(Number(form.priority))) return 'Priority must be a whole number.'
    return ''
  }

  async function submit(event) {
    event.preventDefault(); setErrors({}); setError('')
    const validationMessage = clientError()
    if (validationMessage) { setError(validationMessage); return }
    setSaving(true)
    try {
      if (editing) await updateEligibilityRule(ruleId, form)
      else await createEligibilityRule(form)
      navigate('/admin/eligibility-rules', { replace: true })
    } catch (caught) {
      setErrors(getApiFieldErrors(caught)); setError(getApiErrorMessage(caught, 'Could not save this draft eligibility rule.'))
    } finally { setSaving(false) }
  }

  if (state !== 'ready') return <div><AdminHeading eyebrow="Internal criteria" title={editing ? 'Edit draft eligibility rule' : 'Create draft eligibility rule'} description="Draft rules are internal review records, not student eligibility decisions." /><AdminState state={state} retry={() => window.location.reload()} noun="eligibility rule" /></div>
  return <div className="min-w-0">
    <AdminHeading eyebrow="Internal criteria" title={editing ? 'Edit draft eligibility rule' : 'Create draft eligibility rule'} description="Draft rules are internal review records, not student eligibility decisions." />
    {error && <p role="alert" className="mb-5 border-l-4 border-red-800 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</p>}
    <form className="space-y-7" onSubmit={submit} noValidate>
      <section className="paper-surface grid gap-5 p-5 md:grid-cols-2" aria-labelledby="rule-identity"><h2 id="rule-identity" className="section-title text-xl text-navy md:col-span-2">Rule identity and scope</h2>
        <AdminField id="code" label="Rule code" error={errors.code}><input id="code" className={adminInputClass} value={form.code} maxLength={80} onChange={(event) => setField('code', event.target.value)} required /></AdminField>
        <AdminField id="name" label="Rule name" error={errors.name}><input id="name" className={adminInputClass} value={form.name} maxLength={200} onChange={(event) => setField('name', event.target.value)} required /></AdminField>
        <AdminField id="scope" label="Scope" error={errors.scope}><select id="scope" className={adminInputClass} value={form.scope} onChange={(event) => changeScope(event.target.value)}><option value="program">Program</option><option value="university">University</option></select></AdminField>
        <AdminField id="university" label="University" error={errors.university}><select id="university" className={adminInputClass} value={form.university} onChange={(event) => changeUniversity(event.target.value)} required><option value="">Select university</option>{options.universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></AdminField>
        {form.scope === 'program' && <AdminField id="program" label="Program" error={errors.program}><select id="program" className={adminInputClass} value={form.program} onChange={(event) => changeProgram(event.target.value)} disabled={!form.university} required><option value="">Select program</option>{options.programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></AdminField>}
        <AdminField id="admissionCycle" label="Admission cycle (optional)" error={errors.admissionCycle}><select id="admissionCycle" className={adminInputClass} value={form.admissionCycle} onChange={(event) => setField('admissionCycle', event.target.value)} disabled={!form.university}><option value="">No cycle selected</option>{options.admissionCycles.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</select></AdminField>
        {form.scope === 'program' && <AdminField id="eligibilityResearch" label="Verified research evidence (optional)" error={errors.eligibilityResearch}><select id="eligibilityResearch" className={adminInputClass} value={form.eligibilityResearch} onChange={(event) => setField('eligibilityResearch', event.target.value)} disabled={!form.program}><option value="">No linked research</option>{options.research.map((item) => <option key={item.id} value={item.id}>{item.sourceTitle} · {new Date(item.reviewedDate).toLocaleDateString()}</option>)}</select></AdminField>}
        {selectedResearch && <div className="border-l-4 border-gold bg-bluewash p-4 text-sm md:col-span-2"><p className="font-bold">Traceability only: {selectedResearch.sourceTitle}</p>{getSafeExternalUrl(selectedResearch.officialSourceUrl) && <a className="mt-1 inline-block text-academic underline" target="_blank" rel="noopener noreferrer" href={getSafeExternalUrl(selectedResearch.officialSourceUrl)}>Open reviewed source (external site)</a>}<p className="mt-2">Linking research does not convert, verify, or change it.</p></div>}
      </section>

      <section className="paper-surface p-5" aria-labelledby="dae-criteria"><div className="flex flex-wrap justify-between gap-3"><div><h2 id="dae-criteria" className="section-title text-xl text-navy">DAE qualification criteria</h2><p className="mt-1 text-sm text-[var(--ui-muted)]">Use official wording and keep unresolved facts out of the rule.</p></div><button type="button" className="action-secondary" onClick={() => setForm((current) => ({ ...current, qualificationCriteria: [...current.qualificationCriteria, emptyQualificationCriterion()] }))}>Add DAE criterion</button></div>
        <label className="mt-5 block max-w-sm text-sm font-bold">Match logic<select className={`${adminInputClass} mt-1`} value={form.qualificationMatchLogic} onChange={(event) => setField('qualificationMatchLogic', event.target.value)}><option value="any">Any criterion may match</option><option value="all">All criteria must match</option></select></label>
        <div className="mt-5 space-y-5">{form.qualificationCriteria.map((criterion, index) => <fieldset className="grid gap-4 border border-[var(--ui-border)] p-4 md:grid-cols-2" key={index}><legend className="px-2 font-black">DAE criterion {index + 1}</legend>
          <label className="text-sm font-bold">Accepted technology codes<input className={`${adminInputClass} mt-1`} value={criterion.technologyCodes} onChange={(event) => setCriterion(index, 'technologyCodes', event.target.value)} placeholder="CIT, IT" /></label>
          <label className="text-sm font-bold">Minimum percentage<input type="number" min="0" max="100" step="0.01" className={`${adminInputClass} mt-1`} value={criterion.minimumPercentage} onChange={(event) => setCriterion(index, 'minimumPercentage', event.target.value)} /></label>
          <label className="text-sm font-bold">Minimum passing year<input type="number" min="1950" max="2100" className={`${adminInputClass} mt-1`} value={criterion.minimumPassingYear} onChange={(event) => setCriterion(index, 'minimumPassingYear', event.target.value)} /></label>
          <label className="text-sm font-bold">Accepted boards<input className={`${adminInputClass} mt-1`} value={criterion.acceptedBoards} onChange={(event) => setCriterion(index, 'acceptedBoards', event.target.value)} placeholder="Comma-separated" /></label>
          <label className="text-sm font-bold">Required subjects<input className={`${adminInputClass} mt-1`} value={criterion.requiredSubjects} onChange={(event) => setCriterion(index, 'requiredSubjects', event.target.value)} placeholder="Comma-separated" /></label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-bold"><input type="checkbox" checked={criterion.equivalenceRequired} onChange={(event) => setCriterion(index, 'equivalenceRequired', event.target.checked)} /> Equivalence required</label>
          <label className="text-sm font-bold md:col-span-2">Student-facing explanation<textarea className={`${adminInputClass} mt-1 min-h-24`} maxLength={500} value={criterion.explanation} onChange={(event) => setCriterion(index, 'explanation', event.target.value)} /></label>
          {form.qualificationCriteria.length > 1 && <button type="button" className="action-secondary md:col-span-2" onClick={() => setForm((current) => ({ ...current, qualificationCriteria: current.qualificationCriteria.filter((_, itemIndex) => itemIndex !== index) }))}>Remove criterion</button>}
        </fieldset>)}</div>
      </section>

      <section className="paper-surface grid gap-5 p-5 md:grid-cols-2" aria-labelledby="domicile"><h2 id="domicile" className="section-title text-xl text-navy md:col-span-2">Domicile conditions</h2>
        <label className="flex min-h-11 items-center gap-3 text-sm font-bold md:col-span-2"><input type="checkbox" checked={form.domicile.required} onChange={(event) => setNested('domicile', 'required', event.target.checked)} /> Domicile restriction applies</label>
        <label className="text-sm font-bold">Allowed provinces/territories<input className={`${adminInputClass} mt-1`} value={form.domicile.allowedProvinces} onChange={(event) => setNested('domicile', 'allowedProvinces', event.target.value)} placeholder="Punjab" /></label>
        <label className="text-sm font-bold">Allowed districts<input className={`${adminInputClass} mt-1`} value={form.domicile.allowedDistricts} onChange={(event) => setNested('domicile', 'allowedDistricts', event.target.value)} placeholder="Comma-separated" /></label>
        <label className="text-sm font-bold md:col-span-2">Explanation<textarea className={`${adminInputClass} mt-1 min-h-20`} maxLength={500} value={form.domicile.explanation} onChange={(event) => setNested('domicile', 'explanation', event.target.value)} /></label>
      </section>

      <section className="paper-surface p-5" aria-labelledby="entry-tests"><div className="flex flex-wrap justify-between gap-3"><div><h2 id="entry-tests" className="section-title text-xl text-navy">Entry-test requirements</h2><p className="mt-1 text-sm text-[var(--ui-muted)]">Select only stored tests supported by the source.</p></div><button type="button" className="action-secondary" onClick={() => setForm((current) => ({ ...current, entryTestRequirements: [...current.entryTestRequirements, emptyEntryTestRequirement()] }))}>Add entry-test requirement</button></div>
        <div className="mt-5 space-y-5">{form.entryTestRequirements.length === 0 ? <p className="text-sm text-[var(--ui-muted)]">No entry-test requirement recorded.</p> : form.entryTestRequirements.map((requirement, index) => <fieldset className="grid gap-4 border border-[var(--ui-border)] p-4 md:grid-cols-2" key={index}><legend className="px-2 font-black">Entry test {index + 1}</legend>
          <label className="text-sm font-bold md:col-span-2">Entry test<select className={`${adminInputClass} mt-1`} value={requirement.entryTest} onChange={(event) => setTest(index, 'entryTest', event.target.value)}><option value="">Select test</option>{options.entryTests.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code}) · {item.recordStatus}/{item.verificationStatus}</option>)}</select></label>
          <label className="text-sm font-bold">Minimum score<input type="number" min="0" step="0.01" className={`${adminInputClass} mt-1`} value={requirement.minimumScore} onChange={(event) => setTest(index, 'minimumScore', event.target.value)} /></label>
          <label className="text-sm font-bold">Minimum percentage<input type="number" min="0" max="100" step="0.01" className={`${adminInputClass} mt-1`} value={requirement.minimumPercentage} onChange={(event) => setTest(index, 'minimumPercentage', event.target.value)} /></label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-bold md:col-span-2"><input type="checkbox" checked={requirement.required} onChange={(event) => setTest(index, 'required', event.target.checked)} /> Test is required</label>
          <label className="text-sm font-bold md:col-span-2">Explanation<textarea className={`${adminInputClass} mt-1 min-h-20`} maxLength={500} value={requirement.explanation} onChange={(event) => setTest(index, 'explanation', event.target.value)} /></label>
          <button type="button" className="action-secondary md:col-span-2" onClick={() => setForm((current) => ({ ...current, entryTestRequirements: current.entryTestRequirements.filter((_, itemIndex) => itemIndex !== index) }))}>Remove entry-test requirement</button>
        </fieldset>)}</div>
      </section>

      <section className="paper-surface grid gap-5 p-5 md:grid-cols-2" aria-labelledby="effective-source"><h2 id="effective-source" className="section-title text-xl text-navy md:col-span-2">Effective period and source</h2>
        <label className="text-sm font-bold">Effective from<input type="date" className={`${adminInputClass} mt-1`} value={form.effectiveFrom} onChange={(event) => setField('effectiveFrom', event.target.value)} /></label>
        <label className="text-sm font-bold">Effective until<input type="date" className={`${adminInputClass} mt-1`} value={form.effectiveUntil} onChange={(event) => setField('effectiveUntil', event.target.value)} /></label>
        <label className="text-sm font-bold">Priority<input type="number" min="-1000" max="1000" className={`${adminInputClass} mt-1`} value={form.priority} onChange={(event) => setField('priority', event.target.value)} /></label>
        <AdminField id="officialSourceUrl" label="Official source URL" error={errors.officialSourceUrl} hint="A URL does not verify this rule."><input id="officialSourceUrl" type="url" className={adminInputClass} maxLength={2048} value={form.officialSourceUrl} onChange={(event) => setField('officialSourceUrl', event.target.value)} required /></AdminField>
        <div className="border-l-4 border-gold bg-[#fcf4df] p-4 text-sm md:col-span-2"><p className="font-bold">Source status: {(editing ? `${sourceStatus.replaceAll('_', ' ')}; pending review after save` : 'pending review')}</p><p className="mt-1">New and edited rules remain draft and pending review. This page cannot publish or verify rules.</p></div>
      </section>

      <section className="border-l-4 border-academic bg-bluewash p-5" aria-labelledby="rule-preview"><h2 id="rule-preview" className="section-title text-lg text-navy">Readable criteria summary</h2><p className="mt-2 text-sm leading-6">{preview}</p><p className="mt-2 text-sm font-bold">This is an internal draft, not a student eligibility decision.</p></section>
      <div className="flex flex-wrap gap-3"><button type="submit" className={adminButtonClass} disabled={saving}>{saving ? 'Saving draft…' : 'Save draft rule'}</button><Link to="/admin/eligibility-rules" className="action-secondary">Cancel</Link></div>
    </form>
  </div>
}
