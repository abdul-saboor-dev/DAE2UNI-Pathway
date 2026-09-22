export default function CatalogueFilterPanel({ activeCount, onClear, children }) {
  return (
    <details className="group rounded-3xl border border-forest/10 bg-white/75 p-5 shadow-sm lg:open" open>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg font-black text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf lg:cursor-default">
        <span>Filter results{activeCount ? ` (${activeCount})` : ''}</span>
        <span aria-hidden="true" className="text-xl group-open:rotate-45 lg:hidden">+</span>
      </summary>
      <div className="mt-5 border-t border-forest/10 pt-5 lg:block">
        <div className="space-y-5">{children}</div>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="mt-6 min-h-11 w-full rounded-xl border border-forest/20 px-4 py-2.5 text-sm font-black text-forest hover:bg-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">
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

export const filterControlClass = 'min-h-11 w-full rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-leaf focus:ring-4 focus:ring-leaf/15'
