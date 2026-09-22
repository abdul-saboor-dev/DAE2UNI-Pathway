function TextField({ id, label, error, description, className = '', ...inputProps }) {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label className="text-sm font-bold text-ink/80" htmlFor={id}>{label}</label>
      {description && <p id={descriptionId} className="mt-1 text-xs leading-5 text-ink/55">{description}</p>}
      <input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-leaf focus:ring-4 focus:ring-mint/70"
      />
      {error && <p id={errorId} className="mt-1.5 text-sm text-rose-700">{error}</p>}
    </div>
  )
}

export default TextField
