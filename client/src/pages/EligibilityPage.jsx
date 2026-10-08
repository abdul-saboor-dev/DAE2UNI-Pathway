import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FormAlert from '../components/FormAlert.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { getStudentEligibility } from '../services/eligibilityApi.js'
import { getApiErrorMessage } from '../utils/apiErrors.js'
import { getSafeExternalUrl } from '../utils/externalLinks.js'

const statePresentation = {
  eligible: {
    label: 'Meets verified criteria',
    className: 'bg-emerald-100 text-emerald-900',
    guidance: 'Your saved profile matches the criteria this verified rule can evaluate. This does not guarantee admission.',
  },
  not_eligible: {
    label: 'Does not meet criteria',
    className: 'bg-rose-100 text-rose-900',
    guidance: 'Your saved profile does not meet one or more explicit conditions in this verified rule.',
  },
  needs_information: {
    label: 'More information needed',
    className: 'bg-amber-100 text-amber-950',
    guidance: 'Complete the missing profile information before relying on this result.',
  },
  needs_manual_review: {
    label: 'Manual review needed',
    className: 'bg-bluewash text-navy',
    guidance: 'Some official criteria cannot be interpreted safely by the automated evaluator and need manual confirmation.',
  },
  unavailable: {
    label: 'Rule unavailable',
    className: 'bg-slate-100 text-slate-800',
    guidance: 'No verified eligibility rule is available yet. This is not a rejection.',
  },
}

function ResultCard({ result }) {
  const presentation = statePresentation[result.state]
  const sourceUrl = getSafeExternalUrl(result.source?.officialUrl)
  const heading = [result.university?.name, result.program?.name].filter(Boolean).join(' — ') || 'Eligibility information'

  return (
    <article className="paper-surface min-w-0 p-5 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-academic sm:p-7" tabIndex={0}>
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{result.rule?.name || 'Verified-rule availability'}</p>
          <h2 className="section-title mt-2 break-words text-2xl text-navy">{heading}</h2>
          {result.rule?.code && <p className="mt-2 break-all text-xs font-bold uppercase tracking-wider text-[var(--ui-muted)]">Rule {result.rule.code}</p>}
        </div>
        <span className={`w-fit shrink-0 rounded-md px-3 py-1.5 text-xs font-black uppercase tracking-wide ${presentation.className}`}>
          {presentation.label}
        </span>
      </div>

      <div className="mt-5 border-l-4 border-academic bg-bluewash p-4">
        <p className="font-bold text-navy">{result.message}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">{presentation.guidance}</p>
      </div>

      {result.reasons.length > 0 && (
        <section className="mt-6" aria-label={`Explanation for ${heading}`}>
          <h3 className="font-black text-navy">Explanation</h3>
          <ul className="mt-3 space-y-3">
            {result.reasons.map((item, index) => (
              <li key={`${item.code}-${index}`} className="grid min-w-0 grid-cols-[0.65rem_minmax(0,1fr)] gap-3 text-sm leading-6">
                <span className="mt-2 size-2 bg-gold" aria-hidden="true" />
                <span className="min-w-0 break-words">{item.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[var(--ui-border)] pt-5">
        {result.state === 'needs_information' && <Link to="/profile" className="action-primary">Complete your profile</Link>}
        {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-academic underline underline-offset-4">Open official source</a>}
      </div>
    </article>
  )
}

export default function EligibilityPage() {
  const [state, setState] = useState('loading')
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState('loading')
    setError('')
    getStudentEligibility(controller.signal)
      .then((records) => {
        if (!active) return
        setResults(records)
        setState('ready')
      })
      .catch((caught) => {
        if (!active || caught.name === 'CanceledError' || caught.response?.status === 401) return
        setError(getApiErrorMessage(caught, 'Could not load your eligibility results.'))
        setState('error')
      })
    return () => { active = false; controller.abort() }
  }, [revision])

  if (state === 'loading') return <LoadingScreen label="Loading verified eligibility guidance…" />

  return (
    <section className="site-container max-w-6xl py-10 lg:py-14">
      <header className="max-w-3xl">
        <p className="eyebrow">Student eligibility guidance</p>
        <h1 className="page-title mt-3 text-4xl text-navy sm:text-5xl">Eligibility results</h1>
        <p className="body-copy mt-4">Compare your saved student profile with eligibility rules that have been reviewed, verified, and published.</p>
      </header>

      <aside className="mt-7 border-l-4 border-gold bg-[var(--ui-paper)] p-4 text-sm font-bold leading-6 text-navy">
        Eligibility guidance is based on verified published criteria and does not guarantee admission.
      </aside>

      {state === 'error' && (
        <div className="mt-8 max-w-2xl">
          <FormAlert message={error} />
          <button type="button" className="action-primary mt-5" onClick={() => setRevision((value) => value + 1)}>Try again</button>
        </div>
      )}

      {state === 'ready' && results.length === 0 && (
        <div className="empty-state mt-8" role="status">
          <h2 className="section-title text-2xl text-navy">No eligibility results are available.</h2>
          <p className="body-copy mt-3 text-sm">No verified eligibility rule is available yet. This is not an eligibility rejection.</p>
        </div>
      )}

      {state === 'ready' && results.length > 0 && (
        <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-2" aria-live="polite">
          {results.map((result, index) => <ResultCard key={`${result.program?.id || 'unavailable'}-${result.rule?.code || 'none'}-${index}`} result={result} />)}
        </div>
      )}
    </section>
  )
}
