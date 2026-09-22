# Public Catalogue Frontend

The React client provides a public, read-only university and undergraduate-program catalogue for DAE CIT students. It consumes the verified/published records exposed by the existing catalogue API and does not make eligibility, merit, fee, deadline, ranking, or admission-status claims.

## Routes

| Route | Purpose |
| --- | --- |
| `/universities` | Search, filter, sort, and paginate universities |
| `/universities/:universityIdentifier` | University details by public slug or MongoDB ID |
| `/programs` | Search, filter, sort, and paginate programs |
| `/programs/:programId` | Program details by MongoDB ID |

All four routes are public. Logged-out visitors and authenticated students can use them. Login, registration, dashboard, profile, unauthorized, home, and not-found routes retain their existing behavior.

## API integration

The client uses the existing shared Axios instance and these public endpoints:

- `GET /api/universities`
- `GET /api/universities/:universityIdentifier`
- `GET /api/programs`
- `GET /api/programs/:programId`

Catalogue calls do not set `requiresAuth`, so the Axios request interceptor does not attach a Bearer token. API results are normalized before rendering: required record identity is checked, arrays and nested objects receive safe defaults, and malformed records cannot crash a complete page.

University details load related programs through `GET /api/programs?university=<slug-or-id>`. The program-filter university options are read through the paginated public university API rather than from hard-coded data.

## University discovery

The university list supports:

- Debounced keyword search
- City
- Institution type
- Name or established-year sorting
- Bounded pagination

Cards display only public API fields: name, abbreviation, institution/sector labels, active campus cities, and a safe official link when available.

University details display public campus information, establishment/recognition fields when present, public contact data, official-source attribution, verification date, and verified published related programs. The UI does not assume that description text exists because the current API does not return a description field.

## Program discovery

The program list supports:

- Debounced keyword search
- University
- City where the program is offered
- Credential type
- Degree level
- Study mode
- Name or degree-title sorting
- Bounded pagination

Program cards and details display only returned fields such as title, credential, university, active campuses, study mode, duration, department, discipline code, and official source. No eligibility badge or recommendation ranking is shown.

## URL query state

Search, filters, sorting, and page number use React Router search parameters. Supported values are allowlisted and normalized before requests are made.

University query parameters:

- `search`
- `city`
- `institutionType`
- `sort`
- `page`

Program query parameters:

- `search`
- `university`
- `city`
- `credentialType`
- `degreeLevel`
- `studyMode`
- `sort`
- `page`

Unknown or malformed values are removed with a history-replacing normalization. Defaults such as `sort=name` and `page=1` are omitted. Search updates are debounced by 350 milliseconds, producing one history entry after a typing pause instead of one per keystroke. A search or filter change resets the page to 1; sort changes preserve filters and the current valid page. Browser refresh, Back/Forward, and shared URLs reproduce the same catalogue view.

If a filtered result has fewer pages than the requested page, the client safely replaces the page parameter with the last valid page. Every API request is cancellable, and an older response cannot overwrite a newer search/filter result.

## Pagination

The reusable pagination component uses API metadata and provides:

- Previous and Next links with disabled boundary states
- Current-page `aria-current="page"`
- A compact set of numbered pages with gaps for large totals
- Keyboard-accessible native links
- Focus returns to the results region after a pagination link is activated
- Shareable URLs for every page

The client requests nine records per catalogue page. This page size is an intentional presentation default and is sent to the API without cluttering the browser URL.

## Loading and error behavior

List and detail views include explicit loading states. Lists distinguish empty filtered results from API failure. Errors use safe, general user-facing language and a retry button; internal API details are not rendered. Invalid or unavailable detail identifiers show a dedicated not-found state. A related-program failure does not hide otherwise valid university details.

## Responsive and accessible behavior

- Semantic page, section, heading, native form-control, and navigation elements
- Explicit labels for every search, filter, and sort control
- A native `details` filter panel that remains usable on narrow screens
- Minimum-size pagination, form, and action targets
- Visible focus indicators
- `role="status"` for loading/result updates and `role="alert"` for errors
- Breadcrumb and pagination navigation labels
- External links identified for assistive technology
- Wrapping and `min-width: 0` safeguards for long record names and URLs
- Grid layouts that collapse from desktop columns to a single mobile column without horizontal scrolling

## Security safeguards

- Public requests never opt into Authorization headers.
- Request parameters are constructed from an allowlist and encoded by Axios.
- Detail identifiers are encoded before being placed in API paths.
- External URLs must use HTTP or HTTPS and cannot contain embedded credentials.
- External links use `target="_blank"` with `rel="noopener noreferrer"`.
- API HTML is never rendered; `dangerouslySetInnerHTML` is not used.
- Tokens, passwords, full user objects, internal status fields, verification-history references, and raw campus IDs are not rendered or logged.
- Frontend filtering is presentation behavior only; backend publication/verification rules remain authoritative.

## Automated checks

```powershell
cd client
npm run check:frontend
npm run check:catalogue
npm run lint
npm run build
```

The catalogue safeguard harness verifies public route placement, navigation, public API usage, token omission, query normalization, default omission, page-reset behavior, safe links, encoded identifiers, UI states, pagination semantics, protected-field omission, and the absence of fake eligibility/ranking/fee output.

## Intentional limitations

- No administrator catalogue interface
- No eligibility or recommendation result
- No merit calculator
- No admission cycles, entry tests, deadlines, seat counts, fees, or application tracking
- No invented descriptions when the API does not provide one
- No real institutional fixtures or scraped content in the codebase
