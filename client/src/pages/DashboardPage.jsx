import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FormAlert from '../components/FormAlert.jsx'
import useAuth from '../context/useAuth.js'
import { getStudentProfile } from '../services/profileApi.js'
import { getApiErrorMessage, isApiError } from '../utils/apiErrors.js'

const initialProfileState = { state: 'loading', profile: null, error: '' }

function DashboardPage() {
  const { user } = useAuth()
  const [profileState, setProfileState] = useState(initialProfileState)

  useEffect(() => {
    const controller = new AbortController()

    async function loadProfile() {
      try {
        const profile = await getStudentProfile(controller.signal)
        setProfileState({ state: 'ready', profile, error: '' })
      } catch (error) {
        if (error.name === 'CanceledError') return
        if (isApiError(error, 404, 'PROFILE_NOT_FOUND')) {
          setProfileState({ state: 'empty', profile: null, error: '' })
        } else if (error.response?.status !== 401) {
          setProfileState({
            state: 'error',
            profile: null,
            error: getApiErrorMessage(error, 'Unable to load your profile status.'),
          })
        }
      }
    }

    loadProfile()
    return () => controller.abort()
  }, [])

  const profile = profileState.profile
  const isComplete = profile?.profileStatus === 'complete'
  const actionLabel = profileState.state === 'empty'
    ? 'Start your student profile'
    : isComplete
      ? 'Review your profile'
      : 'Continue your profile'

  return (
    <section className="site-container py-10 lg:py-16">
      <div className="border-b-4 border-gold bg-navy px-6 py-9 text-white sm:px-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d9b56e]">Student dashboard</p>
        <h1 className="page-title mt-3 text-4xl sm:text-5xl">Welcome, {user.name}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/75">Build a complete academic profile now so later eligibility and merit tools can give you accurate DAE-specific guidance.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="paper-surface p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-academic">Profile progress</p>
              <h2 className="section-title mt-2 text-2xl text-navy">
                {profileState.state === 'loading' && 'Checking your profile…'}
                {profileState.state === 'empty' && 'Your profile is ready to begin'}
                {profileState.state === 'ready' && (isComplete ? 'Profile complete' : 'Draft saved')}
                {profileState.state === 'error' && 'Profile status unavailable'}
              </h2>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {isComplete ? 'Complete' : profileState.state === 'loading' ? 'Loading' : 'Action needed'}
            </span>
          </div>
          <FormAlert message={profileState.error} />
          {profileState.state !== 'error' && (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/60">
              {isComplete
                ? 'Your academic and domicile details are complete. You can still review them before future admission tools use this information.'
                : 'Save a partial draft at any time. Completing the required DAE, Matric, and domicile fields unlocks a reliable base for the next milestone.'}
            </p>
          )}
          <Link className="action-primary mt-6" to="/profile">
            {actionLabel}
          </Link>
        </article>

        <aside className="border-l-4 border-gold bg-[var(--ui-paper)] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-academic">Account</p>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-ink/50">Email</dt>
              <dd className="mt-1 break-all font-bold">{user.email}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><dt className="text-ink/50">Role</dt><dd className="mt-1 font-bold capitalize">{user.role}</dd></div>
              <div><dt className="text-ink/50">Status</dt><dd className="mt-1 font-bold capitalize">{user.accountStatus}</dd></div>
            </div>
          </dl>
        </aside>
      </div>

      <div className="mt-8 border-t border-[var(--ui-border)] py-6 text-sm leading-6 text-[var(--ui-muted)]">
        University recommendations, eligibility results, and merit calculations will appear in later milestones. This dashboard currently focuses on building your trusted student profile.
      </div>
    </section>
  )
}

export default DashboardPage
