import { Link } from 'react-router-dom'

function pageItems(currentPage, totalPages) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)
  const items = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push(`gap-${page}`)
    items.push(page)
  })
  return items
}

function PageLink({ page, currentPage, href, children, label, onNavigate }) {
  if (page === currentPage) {
    return (
      <span aria-current="page" aria-label={`Page ${page}, current page`} className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-forest px-3 text-sm font-black text-white">
        {children}
      </span>
    )
  }
  return (
    <Link aria-label={label || `Go to page ${page}`} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-forest/15 bg-white px-3 text-sm font-bold text-forest hover:bg-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf" to={href} onClick={onNavigate}>
      {children}
    </Link>
  )
}

export default function Pagination({ page, totalPages, hrefForPage, focusTargetId }) {
  if (totalPages <= 1) return null
  const focusResults = () => document.getElementById(focusTargetId)?.focus()
  return (
    <nav aria-label="Catalogue pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <PageLink page={page - 1} currentPage={page} href={hrefForPage(page - 1)} label="Go to previous page" onNavigate={focusResults}>Previous</PageLink>
      ) : (
        <span aria-disabled="true" className="grid min-h-11 place-items-center rounded-xl border border-forest/10 px-4 text-sm font-bold text-ink/35">Previous</span>
      )}
      {pageItems(page, totalPages).map((item) => typeof item === 'number' ? (
        <PageLink key={item} page={item} currentPage={page} href={hrefForPage(item)} onNavigate={focusResults}>{item}</PageLink>
      ) : (
        <span key={item} aria-hidden="true" className="px-1 text-ink/45">…</span>
      ))}
      {page < totalPages ? (
        <PageLink page={page + 1} currentPage={page} href={hrefForPage(page + 1)} label="Go to next page" onNavigate={focusResults}>Next</PageLink>
      ) : (
        <span aria-disabled="true" className="grid min-h-11 place-items-center rounded-xl border border-forest/10 px-4 text-sm font-bold text-ink/35">Next</span>
      )}
    </nav>
  )
}
