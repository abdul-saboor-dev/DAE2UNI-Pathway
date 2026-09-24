import { useEffect, useState } from 'react'
import FormAlert from '../components/FormAlert.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import TextField from '../components/TextField.jsx'
import { getStudentProfile, updateStudentProfile } from '../services/profileApi.js'
import { getApiErrorMessage, getApiFieldErrors, isApiError } from '../utils/apiErrors.js'
import {
  buildProfilePayload,
  emptyProfileForm,
  profileToForm,
  validateProfile,
} from '../utils/profileForm.js'

const profileFieldMap = {
  'dae.boardName': 'daeBoardName',
  'dae.instituteName': 'daeInstituteName',
  'dae.passingYear': 'daePassingYear',
  'dae.marks.totalMarks': 'daeTotalMarks',
  'dae.marks.obtainedMarks': 'daeObtainedMarks',
  'matric.boardName': 'matricBoardName',
  'matric.group': 'matricGroup',
  'matric.passingYear': 'matricPassingYear',
  'matric.marks.totalMarks': 'matricTotalMarks',
  'matric.marks.obtainedMarks': 'matricObtainedMarks',
  'domicile.district': 'domicileDistrict',
}

function mapProfileErrors(errors) {
  return Object.fromEntries(
    Object.entries(errors).map(([path, message]) => [profileFieldMap[path] || path, message]),
  )
}

function Section({ eyebrow, title, description, children }) {
  return (
    <fieldset className="paper-surface min-w-0 p-5 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title mt-2 text-2xl text-navy">{title}</h2>
      <p className="body-copy mt-2 max-w-3xl text-sm">{description}</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function StudentProfilePage() {
  const [form, setForm] = useState({ ...emptyProfileForm })
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState({ tone: 'success', text: '' })

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function loadProfile() {
      try {
        const existingProfile = await getStudentProfile(controller.signal)
        if (!active) return
        setProfile(existingProfile)
        setForm(profileToForm(existingProfile))
      } catch (error) {
        if (error.name === 'CanceledError') return
        if (active && !isApiError(error, 404, 'PROFILE_NOT_FOUND') && error.response?.status !== 401) {
          setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load your profile.') })
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadProfile()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setMessage((current) => ({ ...current, text: '' }))
  }

  function toggleSector(event) {
    const { value, checked } = event.target
    setForm((current) => ({
      ...current,
      preferredUniversitySectors: checked
        ? [...current.preferredUniversitySectors, value]
        : current.preferredUniversitySectors.filter((sector) => sector !== value),
    }))
  }

  async function saveProfile(profileStatus) {
    const errors = validateProfile(form, profileStatus)
    setFieldErrors(errors)
    setMessage({ tone: 'success', text: '' })
    if (Object.keys(errors).length) {
      setMessage({ tone: 'error', text: 'Review the highlighted fields before continuing.' })
      return
    }

    setIsSaving(true)
    try {
      const savedProfile = await updateStudentProfile(buildProfilePayload(form, profileStatus))
      setProfile(savedProfile)
      setForm(profileToForm(savedProfile))
      setMessage({
        tone: 'success',
        text: profileStatus === 'complete'
          ? 'Your student profile is complete.'
          : 'Draft saved. You can return and continue at any time.',
      })
    } catch (error) {
      setFieldErrors(mapProfileErrors(getApiFieldErrors(error)))
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Unable to save your profile.') })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <LoadingScreen label="Loading your student profile…" />

  return (
    <section className="site-container max-w-6xl py-10 lg:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Student onboarding</p>
          <h1 className="page-title mt-3 text-4xl text-navy sm:text-5xl">Build your academic profile</h1>
          <p className="mt-4 max-w-3xl leading-7 text-ink/65">Save a draft with only the details you know today, or complete every required academic and domicile field when you are ready.</p>
        </div>
        <span className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${profile?.profileStatus === 'complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {profile?.profileStatus === 'complete' ? 'Complete' : 'Draft'}
        </span>
      </div>

      <div className="mt-7"><FormAlert message={message.text} tone={message.tone} /></div>

      <form className="mt-7 space-y-6" onSubmit={(event) => event.preventDefault()} noValidate>
        <Section eyebrow="DAE CIT" title="Diploma details" description="This version is designed for Computer Information Technology students. Percentages are calculated by the server from your marks.">
          <div className="rounded-xl border border-forest/10 bg-mint/35 px-4 py-3 text-sm"><span className="text-ink/50">Technology</span><p className="mt-1 font-bold">Computer Information Technology (CIT)</p></div>
          <TextField id="dae-registration" name="daeRegistrationNumber" label="Registration number" value={form.daeRegistrationNumber} onChange={updateField} error={fieldErrors.daeRegistrationNumber} autoComplete="off" maxLength={80} />
          <TextField id="dae-board" name="daeBoardName" label="DAE board name" value={form.daeBoardName} onChange={updateField} error={fieldErrors.daeBoardName} placeholder="Punjab Board of Technical Education" autoComplete="organization" maxLength={160} />
          <TextField id="dae-institute" name="daeInstituteName" label="Institute name" value={form.daeInstituteName} onChange={updateField} error={fieldErrors.daeInstituteName} autoComplete="organization" maxLength={200} />
          <TextField id="dae-year" name="daePassingYear" label="DAE passing year" type="number" min="1950" max="2100" inputMode="numeric" value={form.daePassingYear} onChange={updateField} error={fieldErrors.daePassingYear} />
          <div className="hidden sm:block" />
          <TextField id="dae-total" name="daeTotalMarks" label="DAE total marks" type="number" min="1" step="any" inputMode="decimal" value={form.daeTotalMarks} onChange={updateField} error={fieldErrors.daeTotalMarks} />
          <TextField id="dae-obtained" name="daeObtainedMarks" label="DAE obtained marks" type="number" min="0" step="any" inputMode="decimal" value={form.daeObtainedMarks} onChange={updateField} error={fieldErrors.daeObtainedMarks} />
          {profile?.dae?.marks?.percentage != null && <p className="sm:col-span-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">Server-calculated DAE percentage: {profile.dae.marks.percentage}%</p>}
        </Section>

        <Section eyebrow="Matric" title="Secondary education" description="Enter the marks and passing information shown on your Matric certificate.">
          <TextField id="matric-board" name="matricBoardName" label="Matric board name" value={form.matricBoardName} onChange={updateField} error={fieldErrors.matricBoardName} placeholder="BISE Lahore" maxLength={160} />
          <TextField id="matric-group" name="matricGroup" label="Matric group" value={form.matricGroup} onChange={updateField} error={fieldErrors.matricGroup} placeholder="Science" maxLength={100} />
          <TextField id="matric-year" name="matricPassingYear" label="Matric passing year" type="number" min="1950" max="2100" inputMode="numeric" value={form.matricPassingYear} onChange={updateField} error={fieldErrors.matricPassingYear} />
          <div className="hidden sm:block" />
          <TextField id="matric-total" name="matricTotalMarks" label="Matric total marks" type="number" min="1" step="any" inputMode="decimal" value={form.matricTotalMarks} onChange={updateField} error={fieldErrors.matricTotalMarks} />
          <TextField id="matric-obtained" name="matricObtainedMarks" label="Matric obtained marks" type="number" min="0" step="any" inputMode="decimal" value={form.matricObtainedMarks} onChange={updateField} error={fieldErrors.matricObtainedMarks} />
          {profile?.matric?.marks?.percentage != null && <p className="sm:col-span-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">Server-calculated Matric percentage: {profile.matric.marks.percentage}%</p>}
        </Section>

        <Section eyebrow="Location" title="Domicile and preferences" description="The first release covers Punjab. Preferences are optional and can be changed later.">
          <div className="rounded-xl border border-forest/10 bg-mint/35 px-4 py-3 text-sm"><span className="text-ink/50">Domicile province</span><p className="mt-1 font-bold">Punjab</p></div>
          <TextField id="domicile-district" name="domicileDistrict" label="Domicile district" value={form.domicileDistrict} onChange={updateField} error={fieldErrors.domicileDistrict} autoComplete="address-level2" maxLength={100} />
          <TextField id="preferred-cities" name="preferredCities" label="Preferred cities" description="Separate up to 20 cities with commas." value={form.preferredCities} onChange={updateField} error={fieldErrors.preferredCities} placeholder="Lahore, Faisalabad, Rawalpindi" />
          <TextField id="preferred-fields" name="preferredDegreeFields" label="Preferred degree fields" description="Separate up to 20 fields with commas." value={form.preferredDegreeFields} onChange={updateField} error={fieldErrors.preferredDegreeFields} placeholder="Computer Science, Information Technology" />
          <div className="sm:col-span-2">
            <p className="text-sm font-bold text-ink/80">Preferred university sectors</p>
            <div className="mt-3 flex flex-wrap gap-4">
              {['public', 'private'].map((sector) => (
                <label key={sector} className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold capitalize">
                  <input type="checkbox" name="preferredUniversitySectors" value={sector} checked={form.preferredUniversitySectors.includes(sector)} onChange={toggleSector} className="size-4 accent-forest" />
                  {sector}
                </label>
              ))}
            </div>
          </div>
        </Section>

        <div className="sticky bottom-2 z-10 flex flex-col gap-3 border-t-4 border-gold bg-[var(--ui-paper)] p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-ink/55">Completing the profile requires DAE, Matric, and domicile fields. Drafts can remain partial.</p>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <button type="button" disabled={isSaving} onClick={() => saveProfile('draft')} className="action-secondary">{isSaving ? 'Saving…' : 'Save draft'}</button>
            <button type="button" disabled={isSaving} onClick={() => saveProfile('complete')} className="action-primary">{isSaving ? 'Saving…' : 'Complete profile'}</button>
          </div>
        </div>
      </form>
    </section>
  )
}

export default StudentProfilePage
