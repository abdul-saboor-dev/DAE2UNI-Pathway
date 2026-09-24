import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AdminHeading, adminButtonClass, adminInputClass } from '../../components/AdminUi.jsx'
import { applyCatalogueImport, previewCatalogueImport } from '../../services/adminImportApi.js'
import { getApiErrorMessage } from '../../utils/apiErrors.js'

const maximumBytes = 512 * 1024
const emptyTotals = { created: 0, updated: 0, skipped: 0, conflicted: 0, invalid: 0 }

function ImportReport({ result, heading }) {
  if (!result) return null
  return <section aria-label={heading} className="mt-7 space-y-5">
    <h2 className="text-xl font-black">{heading}</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(result.totals || emptyTotals).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm font-semibold capitalize">{key}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}</div>
    <div className="space-y-3">{(result.entries || []).map((entry, index) => <article key={`${entry.universitySlug || 'invalid'}-${index}`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="break-words font-black">{entry.universitySlug || `Record ${index + 1}`} · {entry.outcome}</h3>
      <p className="mt-1 break-words text-sm text-slate-700">{entry.message}</p>
      {entry.issues?.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">{entry.issues.map((issue, issueIndex) => <li key={`${issue.path}-${issueIndex}`} className="break-words">{issue.path || 'record'}: {issue.message}</li>)}</ul>}
      {entry.programs?.length > 0 && <ul className="mt-2 space-y-1 text-sm text-slate-700">{entry.programs.map((program, programIndex) => <li key={`${program.slug}-${programIndex}`} className="break-words">Program {program.slug || programIndex + 1}: {program.outcome}</li>)}</ul>}
    </article>)}</div>
  </section>
}

export default function AdminImportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [document, setDocument] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const view = location.pathname.endsWith('/results') ? 'results' : location.pathname.endsWith('/preview') ? 'preview' : 'input'

  function changeText(value) { setText(value); setFileName(''); setPreview(null); setResult(null); setDocument(null); setConfirmed(false); setError('') }

  async function chooseFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > maximumBytes) { setError('JSON file exceeds the 512 KB limit.'); return }
    changeText(await file.text())
    setFileName(file.name)
    event.target.value = ''
  }

  async function previewDocument(event) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (new Blob([text]).size > maximumBytes) { setError('JSON exceeds the 512 KB limit.'); return }
    let parsed
    try { parsed = JSON.parse(text) } catch { setError('Enter valid JSON before previewing.'); return }
    setBusy(true)
    try {
      const response = await previewCatalogueImport(parsed)
      setDocument(parsed); setPreview(response); setConfirmed(false)
      navigate('/admin/import/preview')
    } catch (caught) { setError(getApiErrorMessage(caught, 'Import preview could not be generated.')) }
    finally { setBusy(false) }
  }

  async function apply() {
    if (busy || !confirmed || !document) return
    setBusy(true); setError('')
    try {
      const response = await applyCatalogueImport(document)
      setResult(response); setConfirmed(false); setDocument(null)
      navigate('/admin/import/results')
    } catch (caught) { setError(getApiErrorMessage(caught, 'The import could not be applied. Preview again before retrying.')) }
    finally { setBusy(false) }
  }

  return <div className="min-w-0">
    <AdminHeading eyebrow="Catalogue data" title="Bulk catalogue import" description="Preview JSON before writing. New records are always drafts awaiting source review; importing never publishes or verifies them." />
    <p className="mb-6 text-sm leading-6 text-slate-700">Use only researched data. Existing published or verified records cannot be overwritten. An import never deletes records omitted from the file.</p>
    <nav aria-label="Import steps" className="mb-6 flex flex-wrap gap-3 text-sm font-bold"><Link to="/admin/import" aria-current={view === 'input' ? 'step' : undefined} className="text-teal-800 underline">1. JSON input</Link><span>→</span><span aria-current={view === 'preview' ? 'step' : undefined}>2. Preview</span><span>→</span><span aria-current={view === 'results' ? 'step' : undefined}>3. Results</span></nav>
    {error && <p role="alert" className="mb-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</p>}
    {view === 'input' && <form onSubmit={previewDocument} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-xl font-black">Select or paste a JSON document</h2>
      <p className="text-sm leading-6 text-slate-600">Maximum 512 KB, 50 universities, 30 campuses per university, 100 programs per university and 500 programs total. Each campus has a stable key; programs refer only to keys in their own university. Only draft updates are allowed with the explicit update strategy.</p>
      <a href="/catalogue-import-example.json" download className="inline-flex min-h-11 items-center text-teal-800 underline focus-visible:ring-4 focus-visible:ring-teal-400">Download fictional example template</a>
      <div><label htmlFor="import-file" className="block text-sm font-bold">Choose JSON file</label><input id="import-file" type="file" accept=".json,application/json" onChange={chooseFile} className="mt-2 block max-w-full text-sm" />{fileName && <p className="mt-1 break-all text-xs text-slate-600">Selected: {fileName}</p>}</div>
      <div><label htmlFor="import-json" className="block text-sm font-bold">Or paste JSON</label><textarea id="import-json" rows={14} spellCheck={false} className={`${adminInputClass} mt-2 font-mono text-xs`} value={text} onChange={(event) => changeText(event.target.value)} aria-describedby="import-json-help" /><p id="import-json-help" className="mt-1 text-xs text-slate-600">Root fields: strategy (skip or update_drafts) and universities. Unknown fields are rejected. Files are read in this browser only and sent as JSON; no file is stored on the server.</p></div>
      <button type="submit" disabled={busy || !text.trim()} className={adminButtonClass}>{busy ? 'Previewing…' : 'Dry-run preview'}</button>
    </form>}
    {view === 'preview' && (preview ? <><ImportReport result={preview} heading="Dry-run preview — no writes performed" /><div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-black">Confirm before writing</h2><p className="mt-2 text-sm">A fresh server-side check runs when you apply. Conflicts and invalid groups remain unchanged; other valid groups may be imported. New and updated records remain draft and pending review.</p><label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-bold"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I reviewed the preview and authorize these draft changes.</label><button type="button" className={`${adminButtonClass} mt-4`} disabled={!confirmed || busy || preview.totals.created + preview.totals.updated === 0} onClick={apply}>{busy ? 'Importing…' : 'Apply import'}</button></div></> : <p role="status">No preview is available in this tab. <Link to="/admin/import" className="text-teal-800 underline">Start a new import</Link>.</p>)}
    {view === 'results' && (result ? <ImportReport result={result} heading="Import results" /> : <p role="status">No import result is available in this tab. <Link to="/admin/import" className="text-teal-800 underline">Start a new import</Link>.</p>)}
    {view !== 'input' && <Link to="/admin/import" className="mt-6 inline-flex min-h-11 items-center text-teal-800 underline">Start another import</Link>}
  </div>
}
