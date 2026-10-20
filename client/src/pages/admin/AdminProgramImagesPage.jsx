import { useEffect, useState } from 'react'
import { AdminField, AdminHeading, AdminState, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import MediaUploadField from '../../components/MediaUploadField.jsx'
import {
  createProgramDiscipline,
  deleteProgramDiscipline,
  listProgramDisciplines,
  updateProgramDiscipline,
} from '../../services/mediaLibraryApi.js'
import { getApiErrorMessage } from '../../utils/apiErrors.js'

const blank = { name: '', slug: '', aliases: '' }
const slugFor = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const payloadFor = (form) => ({
  name: form.name.trim(),
  slug: form.slug.trim().toLowerCase(),
  aliases: form.aliases.split('\n').map((value) => value.trim()).filter(Boolean),
})

export default function AdminProgramImagesPage() {
  const [state, setState] = useState('loading')
  const [records, setRecords] = useState([])
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    listProgramDisciplines({ pageSize: 100 }, controller.signal)
      .then((result) => { setRecords(result.disciplines || []); setState('ready') })
      .catch((loadError) => { if (loadError.name !== 'CanceledError') { setError(getApiErrorMessage(loadError, 'Could not load program images.')); setState('error') } })
    return () => controller.abort()
  }, [reload])

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value, ...(key === 'name' && !editing ? { slug: slugFor(value) } : {}) }))
    setError(''); setMessage('')
  }

  function beginEdit(record) {
    setEditing(record.id)
    setForm({ name: record.name, slug: record.slug, aliases: record.aliases.join('\n') })
    setError(''); setMessage('')
  }

  async function save(event) {
    event.preventDefault()
    if (busy) return
    const payload = payloadFor(form)
    if (!payload.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug) || !payload.aliases.length) {
      setError('Enter a name, a lowercase hyphenated slug, and at least one explicit alias.'); return
    }
    setBusy(true); setError(''); setMessage('')
    try {
      if (editing) await updateProgramDiscipline(editing, payload)
      else await createProgramDiscipline(payload)
      setForm(blank); setEditing(null); setMessage(editing ? 'Discipline updated.' : 'Discipline created. Add its shared image below.'); setReload((value) => value + 1)
    } catch (saveError) { setError(getApiErrorMessage(saveError, 'Could not save the discipline.')) }
    finally { setBusy(false) }
  }

  async function remove(record) {
    if (!window.confirm(`Delete the “${record.name}” discipline and detach its shared image? Programs will remain unchanged.`)) return
    setBusy(true); setError('')
    try { await deleteProgramDiscipline(record.id); setMessage('Discipline removed. Programs remain valid without an image.'); setReload((value) => value + 1) }
    catch (deleteError) { setError(getApiErrorMessage(deleteError, 'Could not remove the discipline.')) }
    finally { setBusy(false) }
  }

  return <>
    <AdminHeading eyebrow="Catalogue media" title="Program images" description="Maintain one shared image per canonical discipline. Programs match only explicit aliases—never fuzzy guesses." />
    {(message || error) && <div role={error ? 'alert' : 'status'} className={`status-panel mb-6 p-4 ${error ? 'status-panel--critical' : 'status-panel--positive'}`}>{error || message}</div>}
    <form onSubmit={save} className="form-surface p-4 sm:p-6" noValidate>
      <h2 className="section-title text-xl">{editing ? 'Edit discipline' : 'Add discipline'}</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <AdminField id="discipline-name" label="Canonical discipline name"><input id="discipline-name" className={adminInputClass} value={form.name} onChange={(event) => change('name', event.target.value)} maxLength={120} /></AdminField>
        <AdminField id="discipline-slug" label="Slug"><input id="discipline-slug" className={adminInputClass} value={form.slug} onChange={(event) => change('slug', event.target.value)} maxLength={100} /></AdminField>
        <AdminField id="discipline-aliases" label="Exact aliases" hint="One per line, for example: BSCS, BS Computer Science, Bachelor of Science in Computer Science."><textarea id="discipline-aliases" className={`${adminInputClass} min-h-36`} value={form.aliases} onChange={(event) => change('aliases', event.target.value)} /></AdminField>
      </div>
      <div className="mt-5 flex flex-wrap gap-3"><button type="submit" className={adminButtonClass} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create discipline'}</button>{editing && <button type="button" className="action-secondary" onClick={() => { setEditing(null); setForm(blank) }}>Cancel edit</button>}</div>
    </form>

    {state !== 'ready' ? <div className="mt-6"><AdminState state={state} retry={() => setReload((value) => value + 1)} noun="program images" /></div> : <div className="mt-6 grid gap-5 xl:grid-cols-2">
      {records.length === 0 && <p className="panel-surface p-6 text-[var(--ui-muted)]">No discipline images exist yet. Existing programs continue to use the normal fallback.</p>}
      {records.map((record) => <article key={record.id} className="panel-surface min-w-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="card-title text-xl">{record.name}</h2><p className="mt-1 text-sm text-[var(--ui-muted)]">{record.aliases.join(' · ')}</p></div><div className="flex gap-3"><button type="button" className="text-sm font-semibold underline" onClick={() => beginEdit(record)}>Edit</button><button type="button" className="text-sm font-semibold text-[var(--ui-error)] underline" onClick={() => remove(record)}>Delete</button></div></div>
        <div className="mt-4"><MediaUploadField label="Shared discipline image" hint="Replacing this image updates every exactly matched program display." media={record.image} target={{ targetType: 'program_discipline', targetId: record.id }} alt={`${record.name} discipline preview`} onChange={(image) => setRecords((current) => current.map((item) => item.id === record.id ? { ...item, image } : item))} /></div>
      </article>)}
    </div>}
  </>
}
