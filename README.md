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

> The features above describe the planned product. The current milestone provides only the full-stack foundation and health-check workflow.

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
* JWT and bcryptjs (planned)

### Database

* MongoDB
* Mongoose
* MongoDB Atlas (planned for deployment)

## Project Status

🚧 **Foundation and initial domain-model milestones complete; core product features are still in development.**

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

Registration, login, role enforcement, management APIs, eligibility evaluation, merit calculation services, application tracking, and deployment are intentionally not implemented yet.

The database relationships and rule structures are documented in [docs/domain-model.md](docs/domain-model.md). Authentication remains a later milestone.

## Project Structure

```text
DAE2UNI-Pathway/
├── client/                 React and Vite frontend
│   └── src/
│       ├── components/     Reusable interface components
│       ├── context/        React context providers (future)
│       ├── layouts/        Shared page layouts
│       ├── pages/          Route-level pages
│       ├── services/       API client modules
│       └── utils/          Frontend utilities (future)
├── docs/                   Project documentation
├── server/                 Express and Mongoose backend
│   └── src/
│       ├── config/         Database and application configuration
│       ├── controllers/    Request handlers
│       ├── middleware/     Express middleware
│       ├── models/         Mongoose models (future)
│       ├── routes/         API routes
│       └── utils/          Backend utilities (future)
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
```

The local `.env` file is ignored by Git. Never commit real credentials or production connection strings.

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

## Quality Checks

Run the frontend checks before sharing changes:

```powershell
cd client
npm run lint
npm run build
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
