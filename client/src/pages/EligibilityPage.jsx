import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FormAlert from '../components/FormAlert.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { getStudentProfile } from '../services/profileApi.js'
import { getApiErrorMessage, isApiError } from '../utils/apiErrors.js'

function readableDiscipline(profile) {
  if (!profile?.dae) return null

  const value = [
    profile.dae.technologyName,
    profile.dae.technology,
    profile.dae.technologyCode,
  ].find((item) => typeof item === 'string' && item.trim())

  if (!value || value.trim().toUpperCase() === 'CIT') {
    return 'Computer Information Technology (CIT)'
  }
  return value.trim()
}

function marksSummary(marks) {
  const percentage = Number(marks?.percentage)
  if (!Number.isFinite(percentage)) return null

  const obtained = Number(marks?.obtainedMarks)
  const total = Number(marks?.totalMarks)
  const markPair = Number.isFinite(obtained) && Number.isFinite(total)
    ? `${obtained} of ${total} marks · `
    : ''

  return `${markPair}${percentage}%`
}

function locationSummary(profile) {
  const district = typeof profile?.domicile?.district === 'string'
    ? profile.domicile.district.trim()
    : ''
  if (!district) return null

  const province = typeof profile?.domicile?.province === 'string'
    ? profile.domicile.province.trim()
    : ''
  const cities = Array.isArray(profile?.preferences?.cities)
    ? profile.preferences.cities.filter((city) => typeof city === 'string' && city.trim())
    : []

  return [district, province, cities.length ? `Preferred: ${cities.join(', ')}` : '']
    .filter(Boolean)
    .join(' · ')
}

function ReadinessItem({ label, value }) {
  const available = Boolean(value)

  return (
    <div className="min-w-0 border-t border-[var(--ui-border)] py-4 first:border-t-0">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <div className="min-w-0">
          <dt className="text-sm font-bold text-navy">{label}</dt>
          <dd className="mt-1 break-words text-sm leading-6 text-[var(--ui-muted)]">
            {value || 'Not available in your profile'}
          </dd>
        </div>
        <span className={`w-fit shrink-0 rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-wide ${available ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
          {available ? 'Available' : 'Missing'}
        </span>
      </div>
    </div>
  )
}

export default function EligibilityPage() {
  const [profileState, setProfileState] = useState({ status: 'loading', profile: null, error: '' })
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function loadProfile() {
      setProfileState((current) => ({ ...current, status: 'loading', error: '' }))
      try {
        const profile = await getStudentProfile(controller.signal)
        if (active) setProfileState({ status: 'ready', profile, error: '' })
      } catch (error) {
        if (!active || error.name === 'CanceledError') return
        if (isApiError(error, 404, 'PROFILE_NOT_FOUND')) {
          setProfileState({ status: 'empty', profile: null, error: '' })
        } else if (error.response?.status !== 401) {
          setProfileState({
            status: 'error',
            profile: null,
            error: getApiErrorMessage(error, 'Unable to load your profile for eligibility readiness.'),
          })
        }
      }
    }

    loadProfile()
    return () => {
      active = false
      controller.abort()
    }
  }, [requestVersion])

  const summary = useMemo(() => {
    const profile = profileState.profile
    return {
      discipline: readableDiscipline(profile),
      daeMarks: marksSummary(profile?.dae?.marks),
      matricMarks: marksSummary(profile?.matric?.marks),
      location: locationSummary(profile),
    }
  }, [profileState.profile])

  const missingItems = Object.values(summary).filter((value) => !value).length
  const needsProfile = profileState.status === 'empty' || missingItems > 0

  if (profileState.status === 'loading') {
    return <LoadingScreen label="Checking your eligibility readiness…" />
  }

  return (
    <section className="site-container max-w-6xl py-10 lg:py-14">
      <header className="max-w-3xl">
        <p className="eyebrow">Eligibility groundwork</p>
        <h1 className="page-title mt-3 text-4xl text-navy sm:text-5xl">Check your profile readiness</h1>
        <p className="body-copy mt-4">
          Review the academic and domicile information that a future eligibility check will use. This page does not calculate eligibility or merit.
        </p>
      </header>

      {profileState.status === 'error' ? (
        <div className="mt-8 max-w-2xl">
          <FormAlert message={profileState.error} />
          <button
            type="button"
            className="action-primary mt-5"
            onClick={() => setRequestVersion((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
          <article className="paper-surface min-w-0 p-5 sm:p-7">
            <p className="eyebrow">Profile summary</p>
            <h2 className="section-title mt-2 text-2xl text-navy">Information available for checking</h2>
            <dl className="mt-5">
              <ReadinessItem label="DAE discipline" value={summary.discipline} />
              <ReadinessItem label="DAE marks and percentage" value={summary.daeMarks} />
              <ReadinessItem label="Matric marks and percentage" value={summary.matricMarks} />
              <ReadinessItem label="Domicile and preferred cities" value={summary.location} />
            </dl>
          </article>

          <aside className="min-w-0 border-l-4 border-gold bg-[var(--ui-paper)] p-5 sm:p-7">
            {needsProfile ? (
              <>
                <p className="eyebrow">Action needed</p>
                <h2 className="section-title mt-2 text-2xl text-navy">Complete your profile</h2>
                <p className="body-copy mt-3 text-sm">
                  Add the missing DAE, Matric, and domicile information before future verified rules can be compared with your record.
                </p>
                <Link to="/profile" className="action-primary mt-6">Complete your profile</Link>
              </>
            ) : (
              <>
                <p className="eyebrow">Current status</p>
                <h2 className="section-title mt-2 text-2xl text-navy">Research is still in progress</h2>
                <p className="body-copy mt-3 text-sm">
                  Eligibility rules are being verified. No confirmed pathway result is available yet.
                </p>
                <Link to="/programs" className="action-secondary mt-6">Browse draft-free public programs</Link>
              </>
            )}
          </aside>
        </div>
      )}

      <section className="mt-8 border-t border-[var(--ui-border)] pt-8" aria-labelledby="eligibility-process-title">
        <p className="eyebrow">How it will work</p>
        <h2 id="eligibility-process-title" className="section-title mt-2 text-2xl text-navy">Evidence before conclusions</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {[
            ['1', 'Use your profile', 'DAE, Matric, and domicile details provide the student-side facts.'],
            ['2', 'Compare verified rules', 'Only reviewed university criteria and official sources will be used.'],
            ['3', 'Explain the outcome', 'Future results will show the matched criteria and any missing information without guessing.'],
          ].map(([number, title, description]) => (
            <article key={number} className="min-w-0 border-t-4 border-academic bg-[var(--ui-paper)] p-5">
              <span className="text-xs font-black uppercase tracking-[.18em] text-academic">Step {number}</span>
              <h3 className="mt-2 font-bold text-navy">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
