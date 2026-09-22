export default function ResultSummary({ pagination, noun }) {
  if (!pagination) return null
  const first = pagination.totalRecords === 0 ? 0 : ((pagination.page - 1) * pagination.pageSize) + 1
  const last = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)
  return (
    <p role="status" aria-live="polite" className="text-sm font-bold text-ink/60">
      Showing {first}–{last} of {pagination.totalRecords} {noun}
    </p>
  )
}
