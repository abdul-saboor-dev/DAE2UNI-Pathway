import { useEffect, useId, useState } from 'react'
import { removeCatalogueImage, uploadCatalogueImage } from '../services/mediaLibraryApi.js'
import { getApiErrorMessage } from '../utils/apiErrors.js'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxBytes = 5 * 1024 * 1024

export default function MediaUploadField({ label, hint, media, target, alt, aspect = 'cover', onChange }) {
  const inputId = useId()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function choose(event) {
    const selected = event.target.files?.[0]
    setError('')
    if (!selected) return
    if (!allowedTypes.has(selected.type)) { setError('Choose a JPG, PNG, WebP, or AVIF image.'); return }
    if (selected.size > maxBytes) { setError('The image must be no larger than 5 MB.'); return }
    if (preview) URL.revokeObjectURL(preview)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  async function upload() {
    if (!file || !target || busy) return
    setBusy(true); setError('')
    try {
      const next = await uploadCatalogueImage(file, target)
      onChange(next)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(''); setFile(null)
    } catch (uploadError) { setError(getApiErrorMessage(uploadError, 'The image could not be uploaded.')) }
    finally { setBusy(false) }
  }

  async function remove() {
    if (!target || !media || busy) return
    setBusy(true); setError('')
    try { await removeCatalogueImage(target); onChange(null) }
    catch (removeError) { setError(getApiErrorMessage(removeError, 'The image could not be removed.')) }
    finally { setBusy(false) }
  }

  const source = preview || media?.url
  return <div className="min-w-0 rounded-[var(--ui-radius-md)] border border-[var(--ui-border)] bg-[var(--ui-surface-subtle)] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><label htmlFor={inputId} className="font-semibold">{label}</label>{hint && <p className="mt-1 text-sm text-[var(--ui-muted)]">{hint}</p>}</div>{media && <button type="button" disabled={busy} onClick={remove} className="min-h-11 text-sm font-semibold text-[var(--ui-error)] underline disabled:opacity-50">Remove</button>}</div>
    {source ? <img src={source} srcSet={preview ? undefined : media?.srcSet || undefined} sizes="(min-width: 768px) 36rem, 100vw" alt={alt} className={`mt-4 w-full rounded-[var(--ui-radius-sm)] border border-[var(--ui-border)] object-cover ${aspect === 'logo' ? 'h-40 object-contain p-3' : 'aspect-[16/9]'}`} /> : <div className={`mt-4 grid place-items-center rounded-[var(--ui-radius-sm)] border border-dashed border-[var(--ui-border-strong)] text-sm text-[var(--ui-muted)] ${aspect === 'logo' ? 'h-40' : 'aspect-[16/9]'}`}>No image assigned</div>}
    <div className="mt-4 flex flex-wrap items-center gap-3"><input id={inputId} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={!target || busy} onChange={choose} className="min-h-11 max-w-full text-sm file:mr-3 file:rounded-[var(--ui-radius-sm)] file:border file:border-[var(--ui-border)] file:bg-[var(--ui-surface-raised)] file:px-3 file:py-2 file:font-semibold" />{file && <button type="button" disabled={busy} onClick={upload} className="action-primary">{busy ? 'Uploading…' : media ? 'Replace image' : 'Upload image'}</button>}</div>
    {!target && <p className="mt-2 text-sm text-[var(--ui-muted)]">Save this record first, then add its image.</p>}
    {error && <p role="alert" className="field-error mt-3">{error}</p>}
  </div>
}
