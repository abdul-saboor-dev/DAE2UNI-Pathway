import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FormAlert from '../components/FormAlert.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { calculateMerit, buildMeritCalculationPayload, emptyTemporaryDaeMarks, getMeritCalculatorOptions, profileDaeToTemporaryMarks, validateTemporaryDaeMarks } from '../services/meritCalculatorApi.js'
import { getStudentProfile } from '../services/profileApi.js'
import { getApiErrorMessage, isApiError } from '../utils/apiErrors.js'

const disclaimer = 'This is a merit calculation, not an eligibility or admission decision.'

function completeMarks(marks) {
  const obtained = Number(marks?.obtainedMarks)
  const total = Number(marks?.totalMarks)
  return Number.isFinite(obtained) && Number.isFinite(total) && total > 0 && obtained >= 0 && obtained <= total
}

function optionLabel(formula) {
  return [formula.university?.name, formula.program?.name, formula.name].filter(Boolean).join(' — ')
}

export default function MeritCalculatorPage() {
  const [state, setState] = useState('loading')
  const [profile, setProfile] = useState(null)
  const [formulas, setFormulas] = useState([])
  const [formulaId, setFormulaId] = useState('')
  const [scores, setScores] = useState({})
  const [daeMarks, setDaeMarks] = useState({ ...emptyTemporaryDaeMarks })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    async function load() {
      setState('loading'); setError('')
      try {
        let loadedProfile = null
        try { loadedProfile = await getStudentProfile(controller.signal) }
        catch (caught) { if (!isApiError(caught, 404, 'PROFILE_NOT_FOUND')) throw caught }
        const options = await getMeritCalculatorOptions(controller.signal)
        if (active) { setProfile(loadedProfile); setDaeMarks(profileDaeToTemporaryMarks(loadedProfile)); setFormulas(options); setState('ready') }
      } catch (caught) {
        if (active && caught.name !== 'CanceledError' && caught.response?.status !== 401) {
          setError(getApiErrorMessage(caught, 'Could not load the merit calculator.')); setState('error')
        }
      }
    }
    load()
    return () => { active = false; controller.abort() }
  }, [revision])

  const selected = useMemo(() => formulas.find((formula) => formula.id === formulaId) || null, [formulas, formulaId])
  const requiredTests = useMemo(() => selected?.components?.filter((component) => component.entryTest).map((component) => component.entryTest) || [], [selected])
  const needsDae = Boolean(selected?.components?.some((component) => component.basis === 'dae'))
  const needsMatric = Boolean(selected?.components?.some((component) => component.basis === 'matric'))
  const matricReady = completeMarks(profile?.matric?.marks)

  function selectFormula(value) {
    setFormulaId(value); setScores({}); setResult(null); setError(''); setFieldErrors({})
  }

  async function submit(event) {
    event.preventDefault(); setError(''); setFieldErrors({}); setResult(null)
    if (!selected) { setFieldErrors({ formulaId: 'Select a merit formula.' }); return }
    const errors = {}
    if (needsMatric && !matricReady) {
      setError('Save your Matric marks in your profile before calculating with this formula.')
      return
    }
    if (needsDae) Object.assign(errors, validateTemporaryDaeMarks(daeMarks))
    for (const test of requiredTests) {
      const value = Number(scores[test.id])
      if (scores[test.id] === '' || scores[test.id] == null || !Number.isFinite(value) || value < 0 || value > test.maximumMarks) {
        errors[test.id] = `Enter marks from 0 to ${test.maximumMarks}.`
      }
    }
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    setState('calculating')
    try {
      setResult(await calculateMerit(buildMeritCalculationPayload(selected.id, scores, daeMarks, needsDae)))
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Could not calculate merit. Review the entered marks and try again.'))
    } finally { setState('ready') }
  }

  if (state === 'loading') return <LoadingScreen label="Loading your merit calculator…" />
  return <section className="site-container max-w-6xl py-10 lg:py-14">
    <header className="max-w-3xl"><p className="eyebrow">Student merit calculator</p><h1 className="page-title mt-3 text-4xl text-navy sm:text-5xl">Calculate a verified merit aggregate</h1><p className="body-copy mt-4">Matric marks come from your saved profile. DAE year marks can be edited here for this calculation only; they do not change your profile. Enter scores only for required entry tests.</p></header>

    {state === 'error' && <div className="mt-8 max-w-2xl"><FormAlert message={error} /><button type="button" className="action-primary mt-5" onClick={() => setRevision((value) => value + 1)}>Try again</button></div>}
    {state !== 'error' && formulas.length === 0 && <div className="empty-state mt-8"><h2 className="section-title text-2xl text-navy">No verified merit formula is available yet.</h2></div>}

    {state !== 'error' && formulas.length > 0 && <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form onSubmit={submit} className="paper-surface min-w-0 p-5 sm:p-7" noValidate>
        <h2 className="section-title text-2xl text-navy">Formula and entry-test marks</h2>
        <label htmlFor="merit-formula" className="mt-5 block text-sm font-bold text-navy">Verified formula</label>
        <select id="merit-formula" className="site-input mt-2" value={formulaId} onChange={(event) => selectFormula(event.target.value)} aria-invalid={Boolean(fieldErrors.formulaId)} aria-describedby={fieldErrors.formulaId ? 'merit-formula-error' : undefined}><option value="">Select university, program, and formula</option>{formulas.map((formula) => <option key={formula.id} value={formula.id}>{optionLabel(formula)}</option>)}</select>
        {fieldErrors.formulaId && <p id="merit-formula-error" className="mt-1 text-sm font-semibold text-[#8b2525]">{fieldErrors.formulaId}</p>}
        {selected && needsMatric && !matricReady && <div className="mt-5 border-l-4 border-gold bg-[var(--ui-paper)] p-4"><p className="font-bold text-navy">Complete your profile</p><p className="mt-1 text-sm">This formula needs saved Matric marks.</p><Link to="/profile" className="mt-2 inline-block font-bold text-academic underline">Add Matric marks</Link></div>}
        {selected && needsDae && <fieldset className="mt-6"><legend className="font-bold text-navy">Temporary DAE year marks</legend><p className="mt-1 text-sm text-[var(--ui-muted)]">Years 1 and 2 are required. Year 3 is optional if its result is unavailable. Missing Year 3 produces a provisional DAE percentage; all three years produce a final percentage.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{[1, 2, 3].flatMap((year) => ['Total', 'Obtained'].map((kind) => { const key = `year${year}${kind}Marks`; return <div key={key}><label htmlFor={`merit-${key}`} className="block text-sm font-bold text-navy">Year {year} {kind.toLowerCase()} marks{year === 3 ? ' (optional)' : ''}</label><input id={`merit-${key}`} type="number" min={kind === 'Total' ? '1' : '0'} step="any" inputMode="decimal" className="site-input mt-2" value={daeMarks[key]} onChange={(event) => { setDaeMarks((current) => ({ ...current, [key]: event.target.value })); setResult(null); setFieldErrors((current) => ({ ...current, [key]: undefined })) }} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `merit-${key}-error` : undefined} />{fieldErrors[key] && <p id={`merit-${key}-error`} className="mt-1 text-sm font-semibold text-[#8b2525]">{fieldErrors[key]}</p>}</div> }))}</div></fieldset>}
        {selected && <div className="mt-6 space-y-5">{requiredTests.map((test) => <div key={test.id}><label htmlFor={`score-${test.id}`} className="block text-sm font-bold text-navy">{test.name} obtained marks</label><p id={`score-${test.id}-hint`} className="mt-1 text-xs text-[var(--ui-muted)]">Official maximum: {test.maximumMarks}</p><input id={`score-${test.id}`} type="number" min="0" max={test.maximumMarks} step="any" inputMode="decimal" className="site-input mt-2" value={scores[test.id] ?? ''} onChange={(event) => { setScores((current) => ({ ...current, [test.id]: event.target.value })); setFieldErrors({}) }} aria-invalid={Boolean(fieldErrors[test.id])} aria-describedby={`score-${test.id}-hint${fieldErrors[test.id] ? ` score-${test.id}-error` : ''}`} />{fieldErrors[test.id] && <p id={`score-${test.id}-error`} className="mt-1 text-sm font-semibold text-[#8b2525]">{fieldErrors[test.id]}</p>}</div>)}</div>}
        {error && <div className="mt-5"><FormAlert message={error} /></div>}
        <button type="submit" className="action-primary mt-6" disabled={state === 'calculating' || (selected && needsMatric && !matricReady)}>{state === 'calculating' ? 'Calculating…' : 'Calculate merit'}</button>
      </form>

      <section className="min-w-0 border-t-4 border-academic bg-[var(--ui-paper)] p-5 sm:p-7" aria-labelledby="merit-result-title">
        <h2 id="merit-result-title" className="section-title text-2xl text-navy">Transparent calculation</h2>
        {!result && <p className="body-copy mt-3 text-sm">Select a verified formula and enter its required test marks. The server will calculate each contribution.</p>}
        {result && <div className="mt-5" role="status"><p className="text-sm font-bold text-navy">{result.formula?.name}</p>{result.daeResultStatus && <p className="mt-2 text-sm font-bold text-navy">DAE percentage status: {result.daeResultStatus}</p>}<dl className="mt-4 divide-y divide-[var(--ui-border)]">{result.breakdown.map((item) => <div key={`${item.basis}-${item.label}`} className="grid gap-1 py-4 sm:grid-cols-[1fr_auto]"><dt className="font-bold text-navy">{item.label}</dt><dd className="text-sm text-[var(--ui-muted)]">{item.percentage.toFixed(2)}% × {item.weightPercentage}% = <strong className="text-navy">{item.contribution.toFixed(2)}</strong></dd></div>)}</dl><p className="mt-5 border-t-2 border-gold pt-5 text-2xl font-black text-navy">Final aggregate: {result.finalAggregate.toFixed(2)}%</p></div>}
        <p className="mt-6 border-l-4 border-gold bg-ivory p-4 text-sm font-bold text-navy">{disclaimer}</p>
      </section>
    </div>}
  </section>
}
