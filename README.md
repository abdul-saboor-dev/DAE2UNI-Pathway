# DAE2UNI Pathway

A Punjab-focused university discovery and admission guidance platform designed specifically for DAE CIT students.

## About

DAE2UNI Pathway helps DAE CIT students explore universities, degree programs, eligibility requirements, admission criteria, entry tests, merit calculations, deadlines, and other important admission information.

The initial version is a web application focused on universities and undergraduate programs in Punjab, Pakistan. It is intended to answer a practical question for DAE CIT students: **“What can I do after DAE?”**

## Features

* 🎓 University discovery
* 📚 DAE CIT eligibility checker
* 🧮 Merit and aggregate calculator
* 📝 Entry-test information
* 📅 Admission deadlines
* 📄 Document checklist
* 📌 Application tracker
* 👨‍🎓 Student admission experiences
* 🧪 Entry-test preparation resources

> The features above describe the planned product. The current implementation includes the full-stack foundation, domain models, student authentication/profile onboarding, public catalogue APIs/pages, and an administrator catalogue workspace.

## Tech Stack

### Frontend

* React
* Vite
* JavaScript
* Tailwind CSS
* React Router
* Axios
* Recharts (planned when needed)

### Backend

* Node.js
* Express.js
* REST API
* JWT authentication
* bcryptjs password hashing
* Zod request validation

### Database

* MongoDB
* Mongoose
* MongoDB Atlas (planned for deployment)

## Project Status

🚧 **Foundation, domain-model, student authentication/onboarding, public catalogue, and administrator catalogue-management milestones are implemented; core admission features are still in development.**

This project is being developed as a **DAE CIT Final Year Project**.

The foundation currently includes:

* A responsive React/Vite landing page
* React Router and an Axios API service
* Tailwind CSS styling
* An Express REST API connected to MongoDB through Mongoose
* A database-aware `GET /api/health` endpoint
* Centralized API not-found and error handling
* Graceful application startup and shutdown
* Mongoose domain models for student, university, admission-rule, merit, deadline, and source-verification data
* Student registration, login, JWT authentication, and role authorization
* Student-owned profile read and partial-update APIs
* Centralized request and Mongoose validation errors
* Responsive registration, login, student dashboard, and profile-onboarding pages
* Session restoration through `GET /api/auth/me` with access tokens kept in `sessionStorage`
* Public-only and role-aware protected frontend routes
* Administrator-protected university and undergraduate-program CRUD APIs
* Public verified/published catalogue browsing with safe search, filters, sorting, and bounded pagination
* Source-verification visibility rules and relationship-safe catalogue deletion
* Public university/program discovery pages with URL-synchronized search, filters, sorting, and pagination
* Responsive detail pages with official-source attribution and related programs
* Academic-editorial public and administrator interface with branded university-card fallbacks and address-based campus map-search links
* Administrator dashboard and responsive university, campus, and program management forms
* One-time browser setup for the permanent Owner, backed by a persistent MongoDB lock
* Owner/Co-Owner/Admin content access and password-confirmed administrator role management
* Explicit, password-safe CLI recovery for the existing Owner and legacy migration

Refresh tokens, email verification, password recovery, eligibility evaluation, merit calculation services, application tracking, and deployment are intentionally not implemented yet.

The database relationships are documented in [docs/domain-model.md](docs/domain-model.md), authentication/profile endpoints in [docs/authentication-api.md](docs/authentication-api.md), the browser authentication/profile flow in [docs/frontend-authentication.md](docs/frontend-authentication.md), catalogue endpoints in [docs/catalogue-api.md](docs/catalogue-api.md), public catalogue pages in [docs/frontend-catalogue.md](docs/frontend-catalogue.md), the administrator workflow in [docs/admin-catalogue-frontend.md](docs/admin-catalogue-frontend.md), [role management](docs/role-management.md), [first-Owner setup](docs/first-administrator-setup.md), and the [frontend design system](docs/frontend-design.md).

## Project Structure

```text
DAE2UNI-Pathway/
├── client/                 React and Vite frontend
│   └── src/
│       ├── components/     Reusable interface components
│       ├── context/        Authentication state and session restoration
│       ├── hooks/          Reusable catalogue loading and URL-state hooks
│       ├── layouts/        Shared page layouts
│       ├── pages/          Route-level pages
│       ├── services/       API client modules
│       └── utils/          Validation, navigation, errors, and profile payloads
├── docs/                   Project documentation
├── server/                 Express and Mongoose backend
│   └── src/
│       ├── config/         Database and application configuration
│       ├── controllers/    Request handlers
│       ├── middleware/     Express middleware
│       ├── models/         Mongoose domain models
│       ├── routes/         API routes
│       ├── services/       Authentication, profile, and catalogue business logic
│       ├── utils/          Backend utilities
│       └── validation/     Zod request schemas
├── .gitignore
├── LICENSE
└── README.md
```

## Requirements

* Node.js 20 or newer
* npm 10 or newer
* MongoDB Community Server running locally
* Git

MongoDB Compass and Postman are optional but useful during development.

## Installation

Install the client and server dependencies from the repository root:

```powershell
cd client
npm install

cd ..\server
npm install
```

## Environment Setup

Copy the server environment example before starting the API:

```powershell
Copy-Item server\.env.example server\.env
```

The development defaults are:

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/dae2uni
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_EXPIRES_IN=1d
# ADMIN_SETUP_SECRET=replace-with-a-separate-random-secret-at-least-32-characters
```

Replace `JWT_SECRET` locally with a cryptographically random value of at least 32 varied characters; the example value is deliberately rejected at startup. `JWT_EXPIRES_IN` must use a positive duration with a unit, such as `15m`, `1h`, or `1d`. For the first Owner only, uncomment and replace the separate `ADMIN_SETUP_SECRET` placeholder with a strong random value and visit `/setup/admin`; see [the setup guide](docs/first-administrator-setup.md). Remove that variable after successful setup if desired. The local `.env` file is ignored by Git. Never commit real credentials, secrets, or production connection strings.

## Start MongoDB

If MongoDB was installed as a Windows service, open PowerShell as Administrator and run:

```powershell
Start-Service MongoDB
```

You can confirm the service state with:

```powershell
Get-Service MongoDB
```

The application uses `mongodb://127.0.0.1:27017/dae2uni` for local development. Starting the app does not delete or replace existing database data.

## Run the Application

Use two terminals from the repository root.

Terminal 1 — backend on port 5000:

```powershell
cd server
npm run dev
```

Terminal 2 — frontend on port 5173:

```powershell
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). During development, Vite proxies `/api` requests to the backend to avoid CORS issues.

## Test the Health Endpoint

With the backend running, use a browser, Postman, or PowerShell:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

A healthy response reports the API as `up` and MongoDB as `connected`.

## Authentication and Student Profiles

The backend exposes registration, login, current-user, and student-owned profile endpoints. Protected requests use this header:

```http
Authorization: Bearer <access-token>
```

See [docs/authentication-api.md](docs/authentication-api.md) for endpoint details, request/response examples, security behavior, and manual testing commands.

The React client provides `/register`, `/login`, `/dashboard`, and `/profile`. Access tokens are kept in `sessionStorage` for this access-token-only milestone; passwords and complete user objects are never stored. Refreshing the same browser tab restores the current user by calling `GET /api/auth/me`. See [docs/frontend-authentication.md](docs/frontend-authentication.md) for route behavior, the security tradeoff, profile onboarding, and browser testing steps.

## University and Program Catalogue

Owner, Co-Owner, and Admin have identical content-management access under `/api/admin/universities` and `/api/admin/programs`. Public, read-only browsing is available at `/api/universities` and `/api/programs`; public results are limited to verified, published records. Lists provide allowlisted filters and sorting plus bounded pagination. See [docs/catalogue-api.md](docs/catalogue-api.md) for field contracts, visibility rules, safe deletion behavior, and PowerShell examples.

The React client exposes public discovery routes at `/universities`, `/universities/:universityIdentifier`, `/programs`, and `/programs/:programId`. Search, filters, sorting, and pagination are synchronized with shareable URL parameters. See [docs/frontend-catalogue.md](docs/frontend-catalogue.md) for interaction, accessibility, security, and testing details.

The administrator workspace lives at `/admin`, with university and program management under `/admin/universities` and `/admin/programs`. Owner and Co-Owner also use `/admin/administrators` to manage regular Admin access; only Owner can manage Co-Owners. Admins cannot manage roles. Role removal never deletes an account or profile. See [administrator workflow](docs/admin-catalogue-frontend.md) and [role management](docs/role-management.md).

Geographic catalogue fields now distinguish physical province/territory, charter authority, sector, and HEC recognition. Content managers can preview/apply draft-only JSON at `/admin/import` and manually review official sources at `/admin/verification-queue`. No real university data was added. See the [geographic catalogue guide](docs/geographic-catalogue.md) for import limits, existing-draft backfill, endpoints, and verification safeguards.

## Quality Checks

Run the frontend checks before sharing changes:

```powershell
cd client
npm run check:frontend
npm run check:catalogue
npm run check:admin-frontend
npm run check:setup-frontend
npm run check:roles-frontend
npm run check:geographic-frontend
npm run check:design
npm run lint
npm run build

cd ..\server
npm run check:models
npm run check:security
npm run check:catalogue
npm run check:setup
npm run check:roles
npm run check:geographic-catalogue
```

## Git Workflow

* Create a focused feature branch for each milestone or feature.
* Review `git status` before staging files.
* Never stage `node_modules/` or `.env` files.
* Keep commits small and descriptive.
* Pull and resolve conflicts before pushing.
* Open a pull request for review when a feature is ready.

## Author

**Abdul Saboor**

DAE CIT Student & Full-Stack Developer

GitHub: [abdul-saboor-dev](https://github.com/abdul-saboor-dev)
