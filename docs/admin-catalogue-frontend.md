# Administrator catalogue frontend

This local milestone adds a separate administrator workspace for managing the existing university and program API records. It does not seed real institutions or evaluate student eligibility or merit.

## Routes and access

| Route | Purpose |
| --- | --- |
| `/admin` | Live catalogue counts, readiness, recent updates, and shortcuts |
| `/admin/universities` | Search, filter, sort, page, edit, and delete universities |
| `/admin/universities/new` | Create a university and its campuses |
| `/admin/universities/:universityId/edit` | Edit a university and its campuses |
| `/admin/programs` | Search, filter, sort, page, edit, and delete programs |
| `/admin/programs/new` | Create a program |
| `/admin/programs/:programId/edit` | Edit a program |
| `/admin/administrators` | Owner/Co-Owner team management, search, and role changes |
| `/admin/import` | Draft-only JSON import, dry-run preview, and result subroutes |
| `/admin/verification-queue` | Manual official-source review queue |

The route guard waits for the session restoration request (`GET /api/auth/me`). Unauthenticated visitors go to login with an internal intended destination. Students go to `/unauthorized`. Owner, Co-Owner, and Admin have the same catalogue content access; only Owner and Co-Owner see `/admin/administrators`. After login, the safe intended route opens. These frontend checks are for navigation only: every admin API request still requires a Bearer token and the backend checks the account's current database role/status. Public catalogue requests remain token-free. Access tokens are retained only in `sessionStorage`; no JWT claims are decoded to decide a role. See [role management](./role-management.md) for transitions and the team API.

## Dashboard

Counts come from the `pagination.totalRecords` of bounded, filtered admin list requests (`pageSize=1`). The page shows totals, draft/published/verified counts, pending-review counts, and combined published-and-verified *record-level* states. A program is publicly visible only if its university is also published and verified, so the combined count is not a guaranteed public-visible count. Recently updated items come from `-updatedAt` admin list requests. The API does not expose a reliable count of universities without programs or programs without selected campuses, so those counts are not invented. All dashboard data has loading and retry states.

## University workflow

The form supports the fields accepted by the current API: name, abbreviation, slug, sector, institution type, physical province/territory, charter authority, HEC recognition status/profile URL, establishment year, recognition bodies, campuses (name, city, province/territory, district, address, main/active state), contact URLs/email/phone, official source URL, source verification status/date, and record publication status. The API does **not** accept a description or separate source title/publisher; these are intentionally absent. A published university requires exactly one main campus. On edit, the entire campus array is submitted with the original server-issued `id` for each retained campus. New campuses have no server ID in the request; client-only rendering keys are discarded. Removing a campus referenced by a program returns a conflict and leaves the form values intact.

## Program workflow

The form supports university, name, slug, degree title, credential type, undergraduate level, department, discipline code, years/semesters, study mode, selected campus IDs, source metadata, and publication status. University search requests at most 20 records per page; when more match, narrow the search. Selecting a university loads its admin detail and displays only its campuses. Changing the parent clears previous campus selections; checkboxes prevent duplicate selection. Zero selected campus IDs means the backend treats the program as offered at all active campuses. The backend rejects cross-university campuses, duplicate slugs in one university, and reassignment when dependent admission data/rules/formulas exist. The current API has no program description field.

## Publication, verification, and sources

Every record needs an official source URL. It must use HTTP or HTTPS, without embedded credentials. The URL alone does not verify any content. Marking a source verified requires a manual review and `lastVerifiedAt`; administrators are responsible for truthful dates. A changed URL is saved as `pending_review` rather than reusing an old verified claim. Unchanged source data is omitted on updates so existing verification history references are not cleared accidentally. The form does not edit verification-history references. Only published **and** verified universities are public, and programs also require a public parent. The backend remains the source of truth for these rules.

## Lists, deletion, and errors

Admin lists use the backend's allowlisted search, city, institution, credential, study mode, status, verification, sort, and pagination parameters as applicable. Query state is URL-synchronized, invalid values are normalized, search is debounced, and each request is capped at 20 records. Filters reset the page; pagination recovers after a deletion or narrower filter. Delete requires a named modal confirmation. Backend dependency conflicts appear in the dialog; no cascading deletion occurs. Client validation is for usability and backend field errors remain authoritative. Forms retain input after errors.

Native controls, visible focus states, labelled fields/fieldsets, live loading/error text, responsive record cards, mobile admin navigation, and a native modal with focus return are used. No HTML from API responses is interpreted. Do not paste secrets, tokens, or passwords into form fields.

## First Owner setup and recovery

The browser flow at `/setup/admin` creates the unique permanent Owner, not a regular Admin. Public registration remains Student-only; Owner and Co-Owner later promote existing Students to Admin. The retained CLI is restricted to explicit recovery of the existing exact Owner, plus a deliberately confirmed migration of one exact active legacy Admin if a legacy database has no Owner. It never creates a second Owner or default credentials. See [First Owner setup](./first-administrator-setup.md) for local/deployed steps, the hidden PowerShell password prompt, backup advice, and both CLI modes.

## Verification

From `client/`, run `npm run check:admin-frontend`, `npm run check:roles-frontend`, `npm run lint`, and `npm run build`. Existing frontend safeguards remain available through `check:frontend`, `check:catalogue`, and `check:setup-frontend`. The API's own role, validation, and integrity checks are exercised by `npm run check:catalogue`, `npm run check:setup`, and `npm run check:roles` in `server/`.

The server also provides `npm run check:security`, a repeatable authentication/authorization regression harness with temporary users and profiles removed in `finally`.

Current limits: no admin controls for eligibility rules, merit formulas, entry tests, admission cycles, verification-history UI, or admissions research. Optional API text fields cannot be explicitly cleared through the existing update contract; editing supplied values is supported. No account is created automatically.
