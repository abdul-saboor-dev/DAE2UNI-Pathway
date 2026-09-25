import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink/60">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.to ? (
              <Link className="rounded font-bold text-academic underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-academic" to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
