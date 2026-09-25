import { useState } from 'react'

function PasswordField({ id, label, error, description, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label className="text-sm font-bold text-navy" htmlFor={id}>{label}</label>
      {description && <p id={descriptionId} className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">{description}</p>}
      <div className="relative mt-2">
        <input
          {...inputProps}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="site-input pr-16 text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 min-w-14 px-3 text-xs font-bold text-academic hover:text-navy focus-visible:outline-3"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <p id={errorId} className="mt-1.5 text-sm font-semibold text-[#8b2525]">{error}</p>}
    </div>
  )
}

export default PasswordField
