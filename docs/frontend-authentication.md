# Frontend Authentication and Student Onboarding

The React client provides student registration, login, session restoration, protected navigation, a student dashboard, and draft/complete profile onboarding. The backend API remains authoritative for identity, roles, account status, ownership, and validation.

## Browser Session Model

The access token is stored under `dae2uni.accessToken` in `sessionStorage`. No password or complete user object is stored in browser storage. The current user exists only in React state and is restored by sending the stored token to `GET /api/auth/me`.

`sessionStorage` keeps the access token available across refreshes in the same tab and normally clears it when that tab session ends. It reduces persistence compared with `localStorage`, but JavaScript can still read it; therefore this is an access-token-only development milestone, not a substitute for an HttpOnly-cookie/refresh-token production design.

The client removes the token when a protected request reports an invalid or expired session, or when the API reports that the account is disabled. It does not decode JWT claims to establish the current user or role.

## Frontend Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Existing DAE2UNI landing page |
| `/register` | Signed-out only | Create a student account |
| `/login` | Signed-out only | Authenticate an existing account |
| `/dashboard` | Authenticated student | Account and profile status |
| `/profile` | Authenticated student | Draft/complete profile onboarding |
| `/unauthorized` | Public | Role-aware access denial |
| `*` | Public | Not-found page |

Protected navigation preserves an internal intended destination. Redirect targets must begin with one `/`, cannot contain backslashes, and cannot point back to login or registration, which prevents external/open redirects and authentication loops.

## Registration and Login

Registration submits exactly `name`, `email`, and `password`. Confirmation is checked only in the browser and is never sent. Role, status, password hash, user ID, and unknown properties are absent from the request.

The current registration endpoint returns a safe user but not an access token. To establish the session without changing the backend contract, the client completes registration and then calls the existing login endpoint using the submitted credentials. Only the token returned from login is placed in `sessionStorage`.

Client validation mirrors the API:

- Name: 2–120 trimmed characters
- Email: valid format, up to 254 characters, normalized to lowercase before submission
- Password: 8–72 characters, no more than 72 UTF-8 bytes, with lowercase, uppercase, and numeric characters
- Matching password confirmation

Backend validation and authorization remain required even when the browser validates first.

## Axios Authentication Behavior

The shared Axios client attaches `Authorization: Bearer <access-token>` only when a request opts into `requiresAuth`. Login, registration, and health requests do not receive the token. Protected `401` responses clear the session; `403 ACCOUNT_DISABLED` does the same. Other `403` responses retain the valid session and allow the role guard to show the unauthorized page.

No request or response logger is configured, and the UI does not render tokens, passwords, or password hashes.

## Student Profile Flow

The profile page loads `GET /api/student/profile`. `404 PROFILE_NOT_FOUND` is treated as a new profile rather than a fatal error. Both actions use `PUT /api/student/profile`:

- **Save draft** sends `profileStatus: "draft"` and only supported, non-empty profile sections.
- **Complete profile** sends `profileStatus: "complete"` and checks the required DAE, Matric, and domicile fields before submission.

The payload builder uses an explicit allowlist and never includes `user`, `userId`, or another owner identifier. DAE and Matric percentages shown in the UI come from the saved server response. Backend model-validation details are mapped back to relevant fields without clearing the student's entered values.

## Manual Testing

Start MongoDB, the API, and the client in separate terminals:

```powershell
Start-Service MongoDB

cd server
npm run dev

cd client
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) and verify:

1. Open `/profile` while signed out and confirm redirection to login.
2. Follow the registration link, submit a new temporary student, and confirm arrival at the intended page.
3. Refresh the tab and confirm the current user is restored through `/api/auth/me`.
4. Save a partial profile draft, refresh, and confirm its values reload.
5. Try completing with missing required fields and confirm field errors appear without losing values.
6. Enter valid DAE and Matric totals/obtained marks, complete the profile, and confirm server-derived percentages appear.
7. Log out and confirm protected pages redirect to login and the session token is removed.
8. Test an incorrect password and confirm the generic API error does not identify whether an email exists.

Use temporary accounts only and remove their user/profile documents after verification. Never display or copy tokens, password hashes, or the JWT secret into test output.

## Automated Checks

```powershell
cd client
npm run check:frontend
npm run lint
npm run build

cd ..\server
npm run check:models
```

The frontend safeguard harness checks client validation, UTF-8 password limits, safe redirects, allowlisted profile payloads, required completion fields, nested values, and owner-identifier exclusion.
