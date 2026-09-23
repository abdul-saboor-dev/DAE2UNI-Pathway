import { AdminField, adminInputClass } from './AdminUi.jsx'
import { fieldDescription } from '../utils/adminFields.js'
import { verificationOptions } from '../utils/adminCatalogue.js'

export default function SourceVerificationFields({ value, onChange, errors, originalUrl, publicationStatus }) {
  const urlChanged = Boolean(originalUrl && value.officialUrl.trim() !== originalUrl)
  return <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
    <legend className="px-2 text-lg font-black">Official source and verification</legend>
    <p className="mb-5 text-sm leading-6 text-slate-600">A URL does not verify a record. Enter “verified” only after personally checking the official source and providing the review date. Draft and unverified records stay private.</p>
    {urlChanged && <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">The official source URL changed. Existing verification will be invalidated and this form will save it as pending review. Review the new URL before verifying again.</p>}
    {publicationStatus === 'published' && value.verificationStatus !== 'verified' && <p role="status" className="mb-4 text-sm font-semibold text-amber-900">Published records appear publicly only after verification.</p>}
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <AdminField id="source-url" label="Official source URL" hint="HTTP or HTTPS official page, without embedded credentials." error={errors['source.officialUrl']}><input id="source-url" type="url" required maxLength={2048} value={value.officialUrl} onChange={(event) => onChange('officialUrl', event.target.value)} aria-invalid={Boolean(errors['source.officialUrl'])} aria-describedby={fieldDescription('source-url', errors['source.officialUrl'], true)} className={adminInputClass} /></AdminField>
      <AdminField id="source-status" label="Verification status" error={errors['source.verificationStatus']}><select id="source-status" value={value.verificationStatus} onChange={(event) => onChange('verificationStatus', event.target.value)} className={adminInputClass}>{verificationOptions.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></AdminField>
      <AdminField id="source-verified-date" label="Date and time manually verified" hint="Required only for verified status. Never backdate an unperformed review." error={errors['source.lastVerifiedAt']}><input id="source-verified-date" type="datetime-local" step="1" value={value.lastVerifiedAt} onChange={(event) => onChange('lastVerifiedAt', event.target.value)} aria-invalid={Boolean(errors['source.lastVerifiedAt'])} aria-describedby={fieldDescription('source-verified-date', errors['source.lastVerifiedAt'], true)} className={adminInputClass} /></AdminField>
    </div>
  </fieldset>
}
