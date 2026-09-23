import { useEffect, useRef, useState } from 'react'
import { adminButtonClass, adminInputClass } from './AdminUi.jsx'

const descriptions = {
  promote: 'The registered Student will become an Admin with full project-content access. No account or profile data is deleted.',
  revoke: 'Remove admin access returns this person to Student. Their account, profile, and other data remain intact.',
  grant: 'Co-Owners can manage all project content and can appoint or remove regular administrators. They cannot manage the Owner or other Co-Owners.',
  revokeCoOwner: 'Remove Co-Owner access returns this person to Admin. They retain full content-management access.',
}
const titles = { promote: 'Make Admin', revoke: 'Remove admin access', grant: 'Make Co-Owner', revokeCoOwner: 'Remove Co-Owner access' }

export default function RoleActionDialog({ action, onClose, onConfirm }) {
  const dialogRef = useRef(null)
  const passwordRef = useRef(null)
  const returnFocusRef = useRef(document.activeElement)
  const completedRef = useRef(false)
  const [password, setPassword] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const needsEmail = action.type === 'grant' || action.type === 'revokeCoOwner'

  useEffect(() => {
    const dialog = dialogRef.current
    const focusTarget = returnFocusRef.current
    dialog.showModal()
    passwordRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
      if (!completedRef.current && focusTarget?.isConnected) focusTarget.focus()
      else document.getElementById('team-page-heading')?.focus()
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (pending) return
    if (!password) { setError('Enter your current password.'); return }
    if (needsEmail && confirmEmail.trim().toLowerCase() !== action.target.email) {
      setError('Typed email does not match the target account.'); setPassword(''); return
    }
    setPending(true)
    setError('')
    try {
      await onConfirm(action, password, confirmEmail.trim().toLowerCase())
      setPassword('')
      setConfirmEmail('')
      setPending(false)
      completedRef.current = true
      onClose()
      return
    } catch (caught) {
      setError(caught.response?.data?.message || 'The role change could not be completed. Please try again.')
    }
    setPassword('')
    setPending(false)
  }

  return <dialog ref={dialogRef} onCancel={(event) => { if (pending) event.preventDefault(); else onClose() }}
    className="m-auto w-[min(94vw,32rem)] max-w-none rounded-2xl border border-slate-200 p-5 shadow-2xl backdrop:bg-slate-950/55 sm:p-7">
    <form onSubmit={submit} className="space-y-5">
      <h2 className="break-words text-xl font-black">{titles[action.type]}</h2>
      <p className="break-words text-sm leading-6 text-slate-700">{descriptions[action.type]}</p>
      <p className="break-all text-sm font-bold text-slate-900">{action.target.email}</p>
      {needsEmail && <div><label htmlFor="role-confirm-email" className="block text-sm font-bold">Type the target email to confirm</label><input id="role-confirm-email" className={`${adminInputClass} mt-1`} value={confirmEmail} onChange={(event) => { setConfirmEmail(event.target.value); setError('') }} autoComplete="off" aria-describedby={error ? 'role-dialog-error' : undefined} required /></div>}
      <div><label htmlFor="role-current-password" className="block text-sm font-bold">Your current password</label><input ref={passwordRef} id="role-current-password" type="password" className={`${adminInputClass} mt-1`} value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} autoComplete="current-password" aria-describedby={error ? 'role-dialog-error' : undefined} required /></div>
      {error && <p id="role-dialog-error" role="alert" className="break-words text-sm font-semibold text-red-800">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={pending} onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold focus-visible:ring-4 focus-visible:ring-teal-400/50">Cancel</button><button type="submit" disabled={pending} className={adminButtonClass}>{pending ? 'Confirming…' : titles[action.type]}</button></div>
    </form>
  </dialog>
}
