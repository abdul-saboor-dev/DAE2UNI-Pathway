# University and Program Catalogue API

The catalogue API provides administrator-managed university and undergraduate-program records and a separate public, read-only view. It does not evaluate eligibility, calculate merit, manage entry tests/admission cycles, seed institutional facts, or provide a catalogue frontend.

All requests and responses use JSON. Success responses use `{ "status": "success", "data": { ... } }`. Errors use `{ "status": "error", "code": "...", "message": "..." }`; request-validation errors also include a `details` array with field paths and safe messages.

## Visibility and trust rules

Administrator endpoints return record status, timestamps, campus identifiers, and the compact source-verification reference needed for management. They require a valid access token and an active user whose current database role is `owner`, `co_owner`, or `admin`. These roles have identical catalogue content permissions; only role-management powers differ.

Public endpoints return only records where both conditions are true:

- `recordStatus` is `published`.
- `source.verificationStatus` is `verified`.

A public program is shown only when its university also meets those conditions. Public responses omit record status, timestamps, source-verification history references, raw program campus IDs, and internal campus IDs. They retain useful official-source attribution: `officialUrl`, `verificationStatus`, and `lastVerifiedAt`.

Source and contact URLs must use HTTP or HTTPS and cannot contain embedded credentials. Changing an official source URL without explicitly supplying a new verification state resets the record to `pending_review` and clears its prior verification date/reference. Changing verification state or date clears any old detailed-verification reference. Marking a source `verified` requires `lastVerifiedAt`. The API does not infer, scrape, or claim facts; administrators are responsible for supplying authoritative source data.

## Authentication

Send the access token to every `/api/admin/*` endpoint:

```http
Authorization: Bearer <access-token>
```

Missing or invalid authentication returns `401`. Students receive `403`; public routes need no token. The current database role/status, not JWT role claims, governs access. See [role management](./role-management.md).

## Administrator endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/admin/universities` | Create a university |
| `GET` | `/api/admin/universities` | List/search all universities |
| `GET` | `/api/admin/universities/:universityId` | Read one university by MongoDB ID |
| `PUT` | `/api/admin/universities/:universityId` | Partially update a university |
| `DELETE` | `/api/admin/universities/:universityId` | Delete an unreferenced university |
| `POST` | `/api/admin/programs` | Create a program |
| `GET` | `/api/admin/programs` | List/search all programs |
| `GET` | `/api/admin/programs/:programId` | Read one program by MongoDB ID |
| `PUT` | `/api/admin/programs/:programId` | Partially update a program |
| `DELETE` | `/api/admin/programs/:programId` | Delete an unreferenced program |

### University body

Create requires `name`, `slug`, `sector`, at least one Punjab `campus`, and `source`. A published university must have exactly one main campus. Optional fields are `abbreviation`, `institutionType`, `establishedYear`, `recognitionBodies`, and `contact`. Updates accept the same fields partially, but a supplied `campuses` array replaces the campus collection; include each existing campus `id` that should be preserved.

```json
{
  "name": "Example University",
  "slug": "example-university",
  "abbreviation": "EU",
  "sector": "public",
  "institutionType": "technology",
  "establishedYear": 2001,
  "recognitionBodies": ["Example body"],
  "campuses": [
    {
      "name": "Main Campus",
      "city": "Lahore",
      "province": "Punjab",
      "isMainCampus": true,
      "isActive": true
    }
  ],
  "contact": {
    "websiteUrl": "https://www.example.edu",
    "admissionsUrl": "https://www.example.edu/admissions",
    "email": "admissions@example.edu",
    "phone": "+92 00 0000000"
  },
  "source": {
    "officialUrl": "https://www.example.edu/admissions",
    "verificationStatus": "pending_review"
  },
  "recordStatus": "draft"
}
```

University slugs are lowercase/hyphenated and globally unique. Supported sectors are `public` and `private`; institution types are `general`, `engineering`, `technology`, and `specialized`. Record statuses are `draft`, `published`, and `archived`.

### Program body

The referenced university and every supplied campus ID must exist and belong together. A program slug is unique within its university.

```json
{
  "university": "64f000000000000000000001",
  "name": "Bachelor of Technology in Example Computing",
  "slug": "btech-example-computing",
  "degreeTitle": "Bachelor of Technology",
  "credentialType": "BTech",
  "degreeLevel": "undergraduate",
  "department": "Computing",
  "disciplineCode": "CIT",
  "duration": { "years": 4, "semesters": 8 },
  "campusIds": ["64f000000000000000000002"],
  "studyMode": "morning",
  "source": {
    "officialUrl": "https://www.example.edu/programs/example",
    "verificationStatus": "pending_review"
  },
  "recordStatus": "draft"
}
```

Credential types are `BS`, `BSc`, `BE`, `BTech`, `ADP`, and `other`. The current degree level is `undergraduate`; study modes are `morning`, `evening`, `weekend`, and `multiple`. Program record statuses are `draft`, `published`, `suspended`, and `archived`.

Create returns `201`; read, update, and delete return `200`. Duplicate slugs return `409`. Missing related records return `404`. Invalid identifiers, unknown properties, MongoDB operator keys, and unsupported values return structured `400` validation errors.

## Public endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/universities` | Browse verified published universities |
| `GET` | `/api/universities/:universityIdentifier` | Read by slug or valid MongoDB ID |
| `GET` | `/api/programs` | Browse verified published programs |
| `GET` | `/api/programs/:programIdentifier` | Read by MongoDB ID |

University slugs are globally unique, so public university detail supports either slug or ID. Slugs cannot consist of exactly 24 hexadecimal characters, avoiding ambiguity with MongoDB IDs. Program slugs are scoped to a university and are therefore ambiguous on their own; public program detail deliberately accepts only a valid MongoDB ID.

## Queries, sorting, and pagination

Unknown query parameters and invalid values are rejected. All list endpoints default to page `1` and page size `20`; page size is capped at `100`. Search is case-insensitive and treats regular-expression metacharacters literally. Sort fields are allowlisted and every sort includes `_id` as a deterministic secondary key.

University lists support:

- `search`: name, abbreviation, or slug
- `city`, `sector`, `institutionType`
- Admin only: `recordStatus`, `verificationStatus`
- `sort`: `name`, `-name`, `establishedYear`, or `-establishedYear`
- Admin only additionally: `createdAt`, `-createdAt`, `updatedAt`, `-updatedAt`
- `page`, `pageSize`

Program lists support:

- `search`: name, degree title, department, or slug
- `university`: university slug or ID
- `city` (active campus where the program is offered), `institutionType`, `credentialType`, `degreeLevel`, `studyMode`
- Admin only: `recordStatus`, `verificationStatus`
- `sort`: `name`, `-name`, `degreeTitle`, or `-degreeTitle`
- Admin only additionally: `createdAt`, `-createdAt`, `updatedAt`, `-updatedAt`
- `page`, `pageSize`

List responses include:

```json
{
  "status": "success",
  "data": {
    "universities": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalRecords": 0,
      "totalPages": 0
    }
  }
}
```

Program lists use `programs` instead of `universities`.

## Relationship-safe deletion

Universities cannot be deleted while referenced by programs, admission cycles, eligibility rules, merit formulas, or source-verification history. Programs cannot be deleted while referenced by admission cycles, eligibility rules, merit formulas, or source-verification history. A program also cannot move to another university while an admission cycle, eligibility rule, or merit formula references it. The API returns `409` with a dependency summary. No cascading deletion is performed; remove or reassign dependencies deliberately first.

A campus likewise cannot be removed from a university while a program references that campus.

## PowerShell examples

Keep the token only in the current terminal variable:

```powershell
$token = '<access-token>'
$headers = @{ Authorization = "Bearer $token" }

Invoke-RestMethod `
  -Uri 'http://localhost:5000/api/admin/universities?page=1&pageSize=20&recordStatus=draft' `
  -Headers $headers

$body = @{
  name = 'Synthetic Review University'
  slug = 'synthetic-review-university'
  sector = 'public'
  institutionType = 'technology'
  campuses = @(@{
    name = 'Synthetic Main Campus'
    city = 'Lahore'
    province = 'Punjab'
    isMainCampus = $true
    isActive = $true
  })
  source = @{
    officialUrl = 'https://example.invalid/synthetic-review'
    verificationStatus = 'unverified'
  }
  recordStatus = 'draft'
} | ConvertTo-Json -Depth 6

Invoke-RestMethod `
  -Method Post `
  -Uri 'http://localhost:5000/api/admin/universities' `
  -Headers $headers `
  -ContentType 'application/json' `
  -Body $body

Invoke-RestMethod 'http://localhost:5000/api/universities?city=Lahore&page=1&pageSize=20'
Invoke-RestMethod 'http://localhost:5000/api/programs?credentialType=BTech&sort=name'
```

The sample is intentionally synthetic and unverified. Delete it after manual testing; do not present it as an institutional fact.

## Automated validation

With MongoDB running and `server/.env` configured:

```powershell
cd server
npm run check:catalogue
```

The harness creates uniquely named temporary admin/student users, universities, and programs; validates authorization, CRUD, queries, public visibility, source handling, injection rejection, and deletion conflicts; then removes every temporary record in a `finally` block. It never targets existing application records.
