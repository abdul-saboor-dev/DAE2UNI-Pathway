function FormAlert({ message, tone = 'error' }) {
  if (!message) return null

  const styles = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : 'border-rose-200 bg-rose-50 text-rose-900'

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-6 ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  )
}

export default FormAlert
