import { useEffect, useRef } from 'react'

export const adminInputClass = 'min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15'
export const adminButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/50 disabled:cursor-not-allowed disabled:opacity-50'

export function AdminHeading({ eyebrow, title, description, action }) {
  return <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-teal-800">{eyebrow}</p><h1 className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}</div>
    {action}
  </div>
}

export function StatusBadge({ value }) {
  const safeValue = typeof value === 'string' ? value : 'unknown'
  const tone = safeValue === 'verified' || safeValue === 'published' ? 'bg-emerald-100 text-emerald-900' : safeValue === 'draft' || safeValue === 'pending_review' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-800'
  return <span className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{safeValue.replaceAll('_', ' ')}</span>
}

export function AdminState({ state, retry, noun = 'records' }) {
  if (state === 'loading') return <div role="status" className="rounded-2xl bg-white p-8 text-slate-600">Loading {noun}…</div>
  if (state === 'error') return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-7"><p className="font-bold text-red-900">Could not load {noun}.</p><button className={`${adminButtonClass} mt-4`} type="button" onClick={retry}>Try again</button></div>
  return null
}

export function AdminField({ id, label, error, hint, children }) {
  return <div className="min-w-0"><label htmlFor={id} className="block text-sm font-bold text-slate-800">{label}</label>{hint && <p id={`${id}-hint`} className="mt-1 text-xs leading-5 text-slate-600">{hint}</p>}<div className="mt-1.5">{children}</div>{error && <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-red-800">{error}</p>}</div>
}

export function ConfirmDialog({ open, title, description, pending, error, onConfirm, onClose, focusAfterCloseId }) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const returnFocusRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement
      dialog.showModal()
      cancelRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])
  return <dialog ref={dialogRef} onCancel={(event) => { if (pending) event.preventDefault(); else onClose() }} onClose={() => {
    const target = focusAfterCloseId ? document.getElementById(focusAfterCloseId) : returnFocusRef.current
    window.requestAnimationFrame(() => target?.focus())
  }} className="m-auto w-[min(94vw,30rem)] max-w-none rounded-2xl border border-slate-200 p-6 shadow-2xl backdrop:bg-slate-950/55">
    <h2 className="break-words text-xl font-black">{title}</h2><p className="mt-3 break-words text-sm leading-6 text-slate-600">{description}</p>
    {error && <p role="alert" className="mt-4 break-words text-sm font-semibold text-red-800">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-3"><button ref={cancelRef} type="button" disabled={pending} onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/50">Cancel</button><button type="button" disabled={pending} onClick={onConfirm} className="min-h-11 rounded-xl bg-red-800 px-4 font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400/50 disabled:opacity-50">{pending ? 'Deleting…' : 'Delete record'}</button></div>
  </dialog>
}
