# Geographic catalogue, import, and verification

The research scope is HEC-recognized universities/campuses physically in Punjab, plus federally chartered universities across Pakistan, and undergraduate programs relevant to DAE CIT. Four independent facts are recorded: physical `provinceOrTerritory` (and each campus `province`), `charterAuthority` (federal/provincial), `sector` (public/private), and `hecRecognitionStatus`. A source URL or source-verification state does **not** establish HEC recognition. This milestone adds no real institutions and makes no eligibility decisions.

Existing universities remain readable with default/serialized `provinceOrTerritory: "unknown"`, `charterAuthority: "unknown"`, and `hecRecognitionStatus: "unverified"`. No data migration runs automatically. Backfill an existing draft such as UET Lahore only after researching its actual charter, campus locations, HEC profile/recognition, and official source. Update it through the admin form; do not infer facts from its name or old source status. Published legacy records keep the prior source-verified/public visibility contract pending manual review.

## Protected endpoints

Owner, Co-Owner, and Admin may use these endpoints with a Bearer token. Students get `403`; unauthenticated callers get `401`. Import accepts JSON bodies only; the browser file picker reads a local JSON file and posts its parsed content, never a persisted upload. Import requests have a 512 KB limit, at most 50 universities, 30 campuses per university, 100 programs per university, and 500 programs total. Other API bodies retain their 10 KB limit.

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/admin/catalogue-import/preview` | Strict validation and dry-run, zero writes |
| `POST` | `/api/admin/catalogue-import/apply` | Recheck and write eligible groups; requires `confirmed: true` |
| `GET` | `/api/admin/verification-queue` | Search/filter/sort/page pending review records |
| `POST` | `/api/admin/verification-queue/:entityType/:recordId/verify` | Record deliberate manual source verification |

An import root has `strategy` (`skip` or `update_drafts`) and `universities`; apply adds `confirmed: true`. See the [fictional downloadable template](../client/public/catalogue-import-example.json) for the required nested shape. Universities require `slug`, `name`, `sector`, `provinceOrTerritory`, `charterAuthority`, `source.officialUrl`, and `campuses`; optional fields are `abbreviation`, `institutionType`, `hecProfileUrl`, and `programs`. A campus needs stable `key`, `name`, `city`, and `province`; an existing campus may also provide its ID, while `district`, `address`, `isMainCampus`, and `isActive` are optional. A program needs `slug`, `name`, `degreeTitle`, `credentialType`, `duration.years`, `campusKeys`, and `source.officialUrl`; `department`, `disciplineCode`, `duration.semesters`, and `studyMode` are optional. Program campus keys must belong to its university group. Provincially chartered imported universities need a Punjab campus; federally chartered ones may be elsewhere. URLs must be HTTP(S) without embedded credentials. Unknown fields, operators, prototype keys, malformed IDs, duplicate campus keys/IDs, duplicate university/program slugs, and cross-university campus references are rejected.

`skip` leaves matching universities and nested programs untouched. `update_drafts` can update only matching draft/unverified records, matching universities by global slug and programs by university plus slug. Existing campus IDs are retained using a stable key or explicit existing ID. No record absent from a document is deleted. Imports refuse overwriting published/source-verified records or HEC-recognized universities. All new records are **draft**, source-`pending_review`, and HEC-`unverified`; imports never publish or verify. The JSON response includes `dryRun`, `strategy`, `totals` (`created`, `updated`, `skipped`, `conflicted`, `invalid`), and grouped university/program entries with validation issues. Counts include nested programs. Apply checks current data again, so it may differ from preview; valid groups can succeed while another group fails. Applied runs store actor ID and counts, never raw JSON.

On Atlas/replica sets, each university group and its programs use a transaction. On standalone MongoDB, failed writes restore snapshots of records successfully written in that group. This compensation is best-effort under process crashes or out-of-band concurrent writes; production imports should use replica-set transactions and backups. Duplicate-key races are reported as conflicts.

## Manual verification queue

`GET /api/admin/verification-queue` accepts `entityType=university|program` (default university), optional `verificationStatus=unverified|pending_review|needs_update|unavailable`, literal `search` over name/slug, `sort=name|-name|updatedAt|-updatedAt|lastVerifiedAt|-lastVerifiedAt` (default `-updatedAt`), `page` (default 1), and `pageSize` (default 20, max 100). Unknown/invalid query keys receive structured `400` validation errors. The response has `records` and `pagination: { page, pageSize, totalRecords, totalPages }`. Records contain name, slug, type, optional parent name, source URL/status/date, publication status, and update date—not internal verification history.

Manual verification requires `{ "officialUrl": "https://...", "sourceTitle": "...", "sourceType": "official_webpage", "confirmed": true }`; source types also include `prospectus`, `admission_notice`, `policy`, and `other`. The safe URL must match the current record source exactly. An administrator must actually inspect it; the application never scrapes or automatically confirms a source. Success creates `SourceVerification` history with verifier ID/timestamp, links it to the record, and leaves publication untouched. Changed/already-verified source returns `409`; malformed input/ID `400`; missing record `404`.

## Administrator pages and commands

`/admin/import` offers file/paste JSON and a fictional template. `/admin/import/preview` groups validation and conflict results and requires explicit confirmation. `/admin/import/results` shows applied outcomes. Preview/results stay in active React state; refresh requires a new import. `/admin/verification-queue` offers type/status filters, search, sort, URL-backed pages, safe external links, edit links, and a manual-review dialog. The university editor and public catalogue display geography and HEC metadata as separate informational fields. Neither UI invents admission or eligibility claims.

With a temporary `$token` variable set to your own login token, PowerShell can preview the fictional example:

```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = Get-Content .\client\public\catalogue-import-example.json -Raw
Invoke-RestMethod http://localhost:5000/api/admin/catalogue-import/preview -Method Post -Headers $headers -ContentType 'application/json' -Body $body
Invoke-RestMethod 'http://localhost:5000/api/admin/verification-queue?entityType=university&page=1&pageSize=20' -Headers $headers
```

Only apply an independently reviewed real-data document after adding `confirmed: true`; the template is **not** real university data. Validate with `npm run check:geographic-catalogue` in `server` and `npm run check:geographic-frontend` in `client`. The backend suite uses and drops its own uniquely named temporary database.
