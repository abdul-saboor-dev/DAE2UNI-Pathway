import { useEffect, useRef, useState } from 'react'
import { adminButtonClass, adminInputClass } from './AdminUi.jsx'
import { getSafeExternalUrl } from '../utils/externalLinks.js'
import { getApiErrorMessage } from '../utils/apiErrors.js'

export default function VerifySourceDialog({ record, onClose, onConfirm }) {
  const dialogRef = useRef(null)
  const inputRef = useRef(null)
  const returnFocus = useRef(document.activeElement)
  const completed = useRef(false)
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceType, setSourceType] = useState('official_webpage')
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const safeUrl = getSafeExternalUrl(record.sourceUrl)

  useEffect(() => {
    const dialog = dialogRef.current
    const previous = returnFocus.current
    dialog.showModal(); inputRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (!completed.current && previous?.isConnected) previous.focus()
      else document.getElementById('verification-heading')?.focus()
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (pending || !safeUrl || !confirmed) return
    setPending(true); setError('')
    try { await onConfirm(record, { sourceTitle, sourceType }); completed.current = true; onClose() }
    catch (caught) { setError(getApiErrorMessage(caught, 'Verification could not be saved. Refresh and try again.')) }
    finally { setPending(false) }
  }

  return <dialog ref={dialogRef} onCancel={(event) => { if (pending) event.preventDefault(); else onClose() }} className="m-auto w-[min(94vw,34rem)] max-w-none rounded-2xl border border-slate-200 p-5 shadow-2xl backdrop:bg-slate-950/55 sm:p-7">
    <form onSubmit={submit} className="space-y-4">
      <h2 className="break-words text-xl font-black">Record manual source verification</h2>
      <p className="break-words text-sm">Check the official page yourself before confirming. Verification does not publish this record or assert HEC recognition.</p>
      <p className="break-all text-sm font-bold">{record.name}</p>
      {safeUrl ? <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-teal-800 underline">Open official source (external site)</a> : <p role="alert" className="break-all text-sm text-red-800">The current source URL is unsafe or missing. Edit the record first.</p>}
      <div><label htmlFor="verify-title" className="block text-sm font-bold">Official source title</label><input ref={inputRef} id="verify-title" className={`${adminInputClass} mt-1`} value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} maxLength={240} required /></div>
      <div><label htmlFor="verify-type" className="block text-sm font-bold">Source type</label><select id="verify-type" className={`${adminInputClass} mt-1`} value={sourceType} onChange={(event) => setSourceType(event.target.value)}>{['official_webpage', 'prospectus', 'admission_notice', 'policy', 'other'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></div>
      <label className="flex min-h-11 items-start gap-3 text-sm font-bold"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I personally checked this exact official URL and the information it supports.</label>
      {error && <p role="alert" className="break-words text-sm font-bold text-red-800">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={pending} onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold focus-visible:ring-4 focus-visible:ring-teal-400">Cancel</button><button type="submit" disabled={pending || !confirmed || !safeUrl} className={adminButtonClass}>{pending ? 'Saving…' : 'Mark source verified'}</button></div>
    </form>
  </dialog>
}
