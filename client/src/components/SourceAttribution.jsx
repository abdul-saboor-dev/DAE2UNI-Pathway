import { getSafeExternalUrl } from '../utils/externalLinks.js'

function formatVerificationDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(date)
}

export default function SourceAttribution({ source, label = 'Official source' }) {
  const url = getSafeExternalUrl(source?.officialUrl)
  if (!source || !url) return null
  const verifiedDate = formatVerificationDate(source.lastVerifiedAt)
  return (
    <aside className="rounded-2xl border border-leaf/20 bg-mint/35 p-4 text-sm">
      <p className="font-black text-forest">Verified source attribution</p>
      <p className="mt-1 leading-6 text-ink/60">
        {verifiedDate ? `Last verified ${verifiedDate}.` : 'Verification date is not available.'}
      </p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full break-all rounded font-bold text-forest underline decoration-leaf/40 underline-offset-4 hover:decoration-leaf focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf">
        {label} <span className="sr-only">(opens in a new tab)</span>
      </a>
    </aside>
  )
}
