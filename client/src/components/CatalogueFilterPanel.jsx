export default function CatalogueFilterPanel({ activeCount, onClear, children }) {
  return (
    <details className="group paper-surface p-5 lg:open" open>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-black text-navy lg:cursor-default">
        <span>Filter results{activeCount ? ` (${activeCount})` : ''}</span>
        <span aria-hidden="true" className="text-lg lg:hidden">▾</span>
      </summary>
      <div className="mt-4 border-t border-[var(--ui-border)] pt-5 lg:block">
        <div className="space-y-5">{children}</div>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="action-secondary mt-6 w-full">
            Clear all filters
          </button>
        )}
      </div>
    </details>
  )
}

export function FilterField({ id, label, description, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-black text-ink">{label}</label>
      {description && <p id={`${id}-description`} className="mt-1 text-xs leading-5 text-ink/50">{description}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

export const filterControlClass = 'site-input text-sm'
