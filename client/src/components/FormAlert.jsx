function FormAlert({ message, tone = 'error' }) {
  if (!message) return null

  const styles = tone === 'success'
    ? 'status-panel status-panel--positive'
    : 'status-panel status-panel--critical'

  return (
    <div className={`px-4 py-3 text-sm leading-6 ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  )
}

export default FormAlert
