import { useState } from 'react'

function PasswordField({ id, label, error, description, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label className="text-sm font-bold text-ink/80" htmlFor={id}>{label}</label>
      {description && <p id={descriptionId} className="mt-1 text-xs leading-5 text-ink/55">{description}</p>}
      <div className="relative mt-2">
        <input
          {...inputProps}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 pr-16 text-sm outline-none transition focus:border-leaf focus:ring-4 focus:ring-mint/70"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 px-4 text-xs font-bold text-forest hover:text-leaf focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <p id={errorId} className="mt-1.5 text-sm text-rose-700">{error}</p>}
    </div>
  )
}

export default PasswordField
