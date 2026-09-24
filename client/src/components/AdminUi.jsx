import { useEffect, useRef } from 'react'

export const adminInputClass = 'site-input'
export const adminButtonClass = 'action-primary'

export function AdminHeading({ eyebrow, title, description, action }) {
  return <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ui-border)] pb-5">
    <div className="min-w-0"><p className="eyebrow">{eyebrow}</p><h1 className="page-title mt-2 break-words text-3xl text-navy sm:text-4xl">{title}</h1>{description && <p className="body-copy mt-2 max-w-3xl text-sm">{description}</p>}</div>
    {action}
  </div>
}

export function StatusBadge({ value }) {
  const safeValue = typeof value === 'string' ? value : 'unknown'
  const tone = safeValue === 'verified' || safeValue === 'published' ? 'border-[#b4d6c5] bg-[#e5f3e9] text-[#145b42]' : safeValue === 'draft' || safeValue === 'pending_review' ? 'border-[#dcc491] bg-[#fcf4df] text-[#765219]' : 'border-[#cbd0cf] bg-[#ecefed] text-navy'
  return <span className={`inline-flex max-w-full border px-2.5 py-1 text-xs font-bold ${tone}`}>{safeValue.replaceAll('_', ' ')}</span>
}

export function AdminState({ state, retry, noun = 'records' }) {
  if (state === 'loading') return <div role="status" className="paper-surface p-8 text-[var(--ui-muted)]">Loading {noun}…</div>
  if (state === 'error') return <div role="alert" className="border-l-4 border-[#8b2525] bg-[#fff6f3] p-7"><p className="font-bold text-[#731d1d]">Could not load {noun}.</p><button className={`${adminButtonClass} mt-4`} type="button" onClick={retry}>Try again</button></div>
  return null
}

export function AdminField({ id, label, error, hint, children }) {
  return <div className="min-w-0"><label htmlFor={id} className="block text-sm font-bold text-navy">{label}</label>{hint && <p id={`${id}-hint`} className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">{hint}</p>}<div className="mt-1.5">{children}</div>{error && <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-[#8b2525]">{error}</p>}</div>
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
  }} className="m-auto w-[min(94vw,30rem)] max-w-none border-t-4 border-gold bg-[var(--ui-paper)] p-6 shadow-2xl backdrop:bg-navy/70">
    <h2 className="section-title break-words text-xl text-navy">{title}</h2><p className="mt-3 break-words text-sm leading-6 text-[var(--ui-muted)]">{description}</p>
    {error && <p role="alert" className="mt-4 break-words text-sm font-semibold text-red-800">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-3"><button ref={cancelRef} type="button" disabled={pending} onClick={onClose} className="action-secondary">Cancel</button><button type="button" disabled={pending} onClick={onConfirm} className="action-primary !bg-[#8b2525] hover:!bg-[#731d1d]">{pending ? 'Deleting…' : 'Delete record'}</button></div>
  </dialog>
}
