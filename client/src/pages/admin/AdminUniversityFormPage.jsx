import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AdminField, AdminHeading, AdminState, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import { fieldDescription } from '../../utils/adminFields.js'
import SourceVerificationFields from '../../components/SourceVerificationFields.jsx'
import { createAdminUniversity, getAdminUniversity, updateAdminUniversity } from '../../services/adminCatalogueApi.js'
import { buildUniversityPayload, universityStatusOptions } from '../../utils/adminCatalogue.js'
import { toLocalDateTime } from '../../utils/adminDates.js'
import { getApiErrorMessage, getApiFieldErrors } from '../../utils/apiErrors.js'
import { getSafeExternalUrl } from '../../utils/externalLinks.js'
import { charterAuthorities, hecRecognitionStatuses, physicalLocations } from '../../utils/geography.js'

const blankCampus = () => ({ clientKey: crypto.randomUUID(), name: '', city: '', district: '', province: 'Punjab', address: '', isMainCampus: false, isActive: true })
const blankForm = () => ({ name: '', abbreviation: '', slug: '', sector: 'public', provinceOrTerritory: 'unknown', charterAuthority: 'unknown', hecRecognitionStatus: 'unverified', hecProfileUrl: '', institutionType: 'general', establishedYear: '', recognitionBodies: '', campuses: [blankCampus()], contact: { websiteUrl: '', admissionsUrl: '', email: '', phone: '' }, source: { officialUrl: '', verificationStatus: 'unverified', lastVerifiedAt: '' }, recordStatus: 'draft' })
function fromRecord(record) {
  return {
    name: record.name || '', abbreviation: record.abbreviation || '', slug: record.slug || '', sector: record.sector || 'public', provinceOrTerritory: record.provinceOrTerritory || 'unknown', charterAuthority: record.charterAuthority || 'unknown', hecRecognitionStatus: record.hecRecognitionStatus || 'unverified', hecProfileUrl: record.hecProfileUrl || '', institutionType: record.institutionType || 'general', establishedYear: record.establishedYear ?? '', recognitionBodies: (record.recognitionBodies || []).join(', '),
    campuses: (record.campuses || []).map((campus) => ({ ...campus, clientKey: campus.id || crypto.randomUUID() })),
    contact: { websiteUrl: record.contact?.websiteUrl || '', admissionsUrl: record.contact?.admissionsUrl || '', email: record.contact?.email || '', phone: record.contact?.phone || '' },
    source: { officialUrl: record.source?.officialUrl || '', verificationStatus: record.source?.verificationStatus || 'unverified', lastVerifiedAt: toLocalDateTime(record.source?.lastVerifiedAt) },
    recordStatus: record.recordStatus || 'draft',
  }
}
function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'University name is required.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim().toLowerCase())) errors.slug = 'Use a lowercase hyphenated slug.'
  if (!getSafeExternalUrl(form.source.officialUrl)) errors['source.officialUrl'] = 'Enter an HTTP or HTTPS official URL without embedded credentials.'
  if (form.hecProfileUrl && !getSafeExternalUrl(form.hecProfileUrl)) errors.hecProfileUrl = 'Enter an HTTP or HTTPS HEC profile URL without embedded credentials.'
  if (form.source.verificationStatus === 'verified' && (!form.source.lastVerifiedAt || Number.isNaN(new Date(form.source.lastVerifiedAt).getTime()))) errors['source.lastVerifiedAt'] = 'A valid manual verification date is required.'
  if (!form.campuses.length) errors.campuses = 'At least one campus is required.'
  if (form.campuses.length > 30) errors.campuses = 'No more than 30 campuses are supported.'
  form.campuses.forEach((campus, index) => { if (!campus.name.trim()) errors[`campuses.${index}.name`] = 'Campus name is required.'; if (!campus.city.trim()) errors[`campuses.${index}.city`] = 'City is required.' })
  if (form.recordStatus === 'published' && form.campuses.filter((campus) => campus.isMainCampus).length !== 1) errors.campuses = 'A published university requires exactly one main campus.'
  return errors
}

export default function AdminUniversityFormPage() {
  const { universityId } = useParams()
  const isNew = !universityId
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState(blankForm)
  const [original, setOriginal] = useState(null)
  const [state, setState] = useState(isNew ? 'ready' : 'loading')
  const [retryKey, setRetryKey] = useState(0)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(location.state?.success || '')
  const [messageKind, setMessageKind] = useState('success')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew) return undefined
    if (!/^[a-f\d]{24}$/i.test(universityId)) { setState('not-found'); return undefined }
    const controller = new AbortController()
    let active = true
    getAdminUniversity(universityId, controller.signal).then((record) => {
      if (!active) return
      if (!record) { setState('not-found'); return }
      setOriginal(record); setForm(fromRecord(record)); setState('ready')
    }).catch((error) => { if (active && error.name !== 'CanceledError') setState(error.response?.status === 404 ? 'not-found' : 'error') })
    return () => { active = false; controller.abort() }
  }, [isNew, universityId, retryKey])

  function change(key, value) { setForm((current) => ({ ...current, [key]: value })); setErrors({}); setMessage('') }
  function changeNested(group, key, value) { setForm((current) => ({ ...current, [group]: { ...current[group], [key]: value } })); setErrors({}); setMessage('') }
  function changeCampus(index, key, value) { setForm((current) => ({ ...current, campuses: current.campuses.map((campus, campusIndex) => campusIndex === index ? { ...campus, [key]: value } : campus) })); setErrors({}); setMessage('') }

  async function save(event) {
    event.preventDefault()
    if (saving) return
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { setMessageKind('error'); setMessage('Review the highlighted fields before saving.'); return }
    setSaving(true); setMessage('')
    try {
      const payload = buildUniversityPayload(form, original, isNew)
      const record = isNew ? await createAdminUniversity(payload) : await updateAdminUniversity(universityId, payload)
      navigate(`/admin/universities/${record.id}/edit`, { replace: true, state: { success: 'University saved.' } })
      setMessageKind('success'); setMessage('University saved.')
      if (!isNew) { setOriginal(record); setForm(fromRecord(record)) }
    } catch (error) { setErrors(getApiFieldErrors(error)); setMessageKind('error'); setMessage(getApiErrorMessage(error, 'Could not save the university.')) }
    finally { setSaving(false) }
  }

  if (state === 'not-found') return <div role="alert"><h1 className="text-2xl font-black">University not found</h1><Link to="/admin/universities" className="text-academic underline">Back to universities</Link></div>
  if (state !== 'ready') return <AdminState state={state} retry={() => { setState('loading'); setRetryKey((value) => value + 1) }} noun="university" />
  return <>
    <AdminHeading eyebrow="University management" title={isNew ? 'Add university' : `Edit ${original?.name || 'university'}`} description="Enter only researched, attributable information. A draft remains hidden from the public catalogue." />
    <form onSubmit={save} noValidate className="min-w-0 space-y-6">
      {message && <div role={messageKind === 'error' ? 'alert' : 'status'} className={`rounded-xl p-4 text-sm font-semibold ${messageKind === 'error' ? 'bg-red-50 text-red-900' : 'bg-emerald-50 text-emerald-900'}`}>{message}</div>}
      <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-lg font-black">University identity</legend><div className="grid min-w-0 gap-5 md:grid-cols-2">
        {[["name", "University name", 200], ["abbreviation", "Abbreviation", 30], ["slug", "URL slug", 200]].map(([key, label, max]) => <AdminField key={key} id={`university-${key}`} label={label} error={errors[key]}><input id={`university-${key}`} className={adminInputClass} maxLength={max} value={form[key]} onChange={(event) => change(key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={fieldDescription(`university-${key}`, errors[key])} /></AdminField>)}
        <AdminField id="university-sector" label="Sector"><select id="university-sector" className={adminInputClass} value={form.sector} onChange={(event) => change('sector', event.target.value)}><option value="public">Public</option><option value="private">Private</option></select></AdminField>
        <AdminField id="university-province" label="Primary physical province or territory" hint="Location is separate from charter authority and sector."><select id="university-province" className={adminInputClass} value={form.provinceOrTerritory} onChange={(event) => change('provinceOrTerritory', event.target.value)}>{physicalLocations.map((value) => <option key={value} value={value}>{value}</option>)}</select></AdminField>
        <AdminField id="university-charter" label="Charter authority"><select id="university-charter" className={adminInputClass} value={form.charterAuthority} onChange={(event) => change('charterAuthority', event.target.value)}>{charterAuthorities.map((value) => <option key={value} value={value}>{value}</option>)}</select></AdminField>
        <AdminField id="university-hec-status" label="HEC recognition status"><select id="university-hec-status" className={adminInputClass} value={form.hecRecognitionStatus} onChange={(event) => change('hecRecognitionStatus', event.target.value)}>{hecRecognitionStatuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></AdminField>
        <AdminField id="university-hec-url" label="HEC institution/profile URL" hint="Optional; do not claim recognition without checking the official HEC source." error={errors.hecProfileUrl}><input id="university-hec-url" type="url" className={adminInputClass} value={form.hecProfileUrl} onChange={(event) => change('hecProfileUrl', event.target.value)} aria-invalid={Boolean(errors.hecProfileUrl)} aria-describedby={fieldDescription('university-hec-url', errors.hecProfileUrl, true)} /></AdminField>
        <AdminField id="university-type" label="Institution type"><select id="university-type" className={adminInputClass} value={form.institutionType} onChange={(event) => change('institutionType', event.target.value)}>{['general', 'engineering', 'technology', 'specialized'].map((value) => <option key={value} value={value}>{value}</option>)}</select></AdminField>
        <AdminField id="university-year" label="Established year"><input id="university-year" type="number" min="1800" max="2100" className={adminInputClass} value={form.establishedYear} onChange={(event) => change('establishedYear', event.target.value)} /></AdminField>
        <AdminField id="university-recognition" label="Recognition bodies" hint="Comma-separated, only when verified from a source."><input id="university-recognition" className={adminInputClass} value={form.recognitionBodies} onChange={(event) => change('recognitionBodies', event.target.value)} aria-describedby="university-recognition-hint" /></AdminField>
      </div></fieldset>
      <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-lg font-black">Campuses</legend><p className="mb-4 text-sm text-slate-600">Existing campus identities are preserved. Removing a campus used by a program will be blocked by the API.</p>{errors.campuses && <p role="alert" className="mb-4 text-sm font-bold text-red-800">{errors.campuses}</p>}
        <div className="space-y-4">{form.campuses.map((campus, index) => <fieldset key={campus.clientKey} className="min-w-0 rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-black">Campus {index + 1}</legend><div className="grid min-w-0 gap-4 md:grid-cols-2">
          {[["name", "Campus name"], ["city", "City"], ["district", "District"], ["address", "Address"]].map(([key, label]) => <AdminField key={key} id={`campus-${index}-${key}`} label={label} error={errors[`campuses.${index}.${key}`]}><input id={`campus-${index}-${key}`} className={adminInputClass} value={campus[key] || ''} onChange={(event) => changeCampus(index, key, event.target.value)} aria-invalid={Boolean(errors[`campuses.${index}.${key}`])} aria-describedby={fieldDescription(`campus-${index}-${key}`, errors[`campuses.${index}.${key}`])} /></AdminField>)}
        </div><div className="mt-4"><AdminField id={`campus-${index}-province`} label="Province or territory"><select id={`campus-${index}-province`} className={adminInputClass} value={campus.province || 'Punjab'} onChange={(event) => changeCampus(index, 'province', event.target.value)}>{physicalLocations.map((value) => <option key={value} value={value}>{value}</option>)}</select></AdminField></div><div className="mt-4 flex flex-wrap gap-5"><label className="inline-flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={campus.isMainCampus} onChange={(event) => change('campuses', form.campuses.map((item, itemIndex) => ({ ...item, isMainCampus: itemIndex === index ? event.target.checked : false })))} />Main campus</label><label className="inline-flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={campus.isActive} onChange={(event) => changeCampus(index, 'isActive', event.target.checked)} />Active</label><button type="button" className="min-h-11 text-sm font-bold text-red-800 underline" onClick={() => change('campuses', form.campuses.filter((_, itemIndex) => itemIndex !== index))}>Remove campus</button></div></fieldset>)}</div>
        <button type="button" disabled={form.campuses.length >= 30} className="mt-4 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-academic/50 disabled:opacity-50" onClick={() => change('campuses', [...form.campuses, blankCampus()])}>Add campus</button>
      </fieldset>
      <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-lg font-black">Public contact</legend><div className="grid min-w-0 gap-5 md:grid-cols-2">{[['websiteUrl', 'Website URL'], ['admissionsUrl', 'Admissions URL'], ['email', 'Email'], ['phone', 'Phone']].map(([key, label]) => <AdminField key={key} id={`contact-${key}`} label={label} error={errors[`contact.${key}`]}><input id={`contact-${key}`} type={key.includes('Url') ? 'url' : key === 'email' ? 'email' : 'text'} className={adminInputClass} value={form.contact[key]} onChange={(event) => changeNested('contact', key, event.target.value)} aria-invalid={Boolean(errors[`contact.${key}`])} aria-describedby={fieldDescription(`contact-${key}`, errors[`contact.${key}`])} /></AdminField>)}</div></fieldset>
      <SourceVerificationFields value={form.source} onChange={(key, value) => changeNested('source', key, value)} errors={errors} originalUrl={original?.source?.officialUrl} publicationStatus={form.recordStatus} />
      <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="px-2 text-lg font-black">Publication</legend><AdminField id="university-publication" label="Publication status" error={errors.recordStatus}><select id="university-publication" className={adminInputClass} value={form.recordStatus} onChange={(event) => change('recordStatus', event.target.value)}>{universityStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></AdminField></fieldset>
      <div className="sticky bottom-2 z-10 flex flex-wrap gap-3 border-t-4 border-gold bg-[var(--ui-paper)] p-4 shadow-lg"><button type="submit" disabled={saving} className={adminButtonClass}>{saving ? 'Saving…' : 'Save university'}</button><Link to="/admin/universities" className="action-secondary">Cancel</Link></div>
    </form>
  </>
}
