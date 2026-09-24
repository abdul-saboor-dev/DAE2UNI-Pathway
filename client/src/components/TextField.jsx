function TextField({ id, label, error, description, className = '', ...inputProps }) {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label className="text-sm font-bold text-navy" htmlFor={id}>{label}</label>
      {description && <p id={descriptionId} className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">{description}</p>}
      <input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="site-input mt-2 text-sm placeholder:text-[var(--ui-muted)]"
      />
      {error && <p id={errorId} className="mt-1.5 text-sm font-semibold text-[#8b2525]">{error}</p>}
    </div>
  )
}

export default TextField
