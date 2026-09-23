# Authentication and Student-Profile API

The API implements Student registration, login, JWT authentication, role authorization, and student-owned profile access. First-Owner setup and focused administrator role management are documented separately in [the setup guide](./first-administrator-setup.md) and [role management](./role-management.md). Refresh tokens, email verification, password recovery, and OAuth are not implemented.

## Environment Variables

Copy `server/.env.example` to `server/.env` and replace the JWT placeholder locally:

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/dae2uni
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-with-a-cryptographically-random-value-at-least-32-characters
JWT_EXPIRES_IN=1d
```

`JWT_SECRET` is required and must contain at least 32 varied characters. Example and obviously weak values are rejected at startup. `JWT_EXPIRES_IN` must be a positive duration with a unit, such as `15m`, `1h`, or `1d`. Never commit the real `.env` file or disclose its JWT secret.

## Authentication Header

Protected endpoints require an access token returned by the login endpoint:

```http
Authorization: Bearer <access-token>
```

Missing, malformed, invalid, and expired tokens return `401`. Suspended, archived, or otherwise inactive accounts return `403`.

## Response Shape

Successful responses use:

```json
{
  "status": "success",
  "data": {}
}
```

Errors use:

```json
{
  "status": "error",
  "code": "REQUEST_VALIDATION_ERROR",
  "message": "Request validation failed.",
  "details": [
    {
      "path": "body.email",
      "message": "Enter a valid email address."
    }
  ]
}
```

Password hashes are excluded from model serialization and every API response.

## POST `/api/auth/register`

Creates an active student account. Public clients cannot select a role; including `role`, `accountStatus`, `passwordHash`, or another unknown field causes request validation to fail.

Password requirements:

- 8–72 characters and no more than 72 UTF-8 bytes
- At least one lowercase letter
- At least one uppercase letter
- At least one number

Request:

```json
{
  "name": "Ayesha Khan",
  "email": "ayesha@example.com",
  "password": "SecurePass123!"
}
```

Response — `201 Created`:

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "000000000000000000000000",
      "name": "Ayesha Khan",
      "email": "ayesha@example.com",
      "role": "student",
      "accountStatus": "active",
      "lastLoginAt": null,
      "createdAt": "2026-09-22T00:00:00.000Z",
      "updatedAt": "2026-09-22T00:00:00.000Z"
    }
  }
}
```

Duplicate normalized emails return `409` with code `EMAIL_IN_USE`.

## POST `/api/auth/login`

Request:

```json
{
  "email": "ayesha@example.com",
  "password": "SecurePass123!"
}
```

Response — `200 OK`:

```json
{
  "status": "success",
  "data": {
    "token": "<access-token>",
    "user": {
      "id": "000000000000000000000000",
      "name": "Ayesha Khan",
      "email": "ayesha@example.com",
      "role": "student",
      "accountStatus": "active",
      "lastLoginAt": "2026-09-22T00:05:00.000Z"
    }
  }
}
```

Unknown emails and incorrect passwords both return the same `401 INVALID_CREDENTIALS` response. Successful login updates `lastLoginAt`.

## GET `/api/auth/me`

Requires a valid Bearer token and returns the current active user:

```powershell
Invoke-RestMethod http://localhost:5000/api/auth/me `
  -Headers @{ Authorization = "Bearer $accessToken" }
```

## GET `/api/student/profile`

Requires an active student token. It returns only the profile whose `user` value matches the authenticated token. If no profile exists, the endpoint returns `404 PROFILE_NOT_FOUND`.

The endpoint accepts no user ID, path parameter, query parameter, or request body.

## PUT `/api/student/profile`

Creates the authenticated student's profile on the first update, or partially updates the existing profile. The API ignores no unknown properties: attempts to submit `user`, `userId`, or unsupported fields return `400`.

Partial draft example:

```json
{
  "dae": {
    "boardName": "Punjab Board of Technical Education",
    "marks": {
      "totalMarks": 3450
    }
  }
}
```

Completed-profile example:

```json
{
  "profileStatus": "complete",
  "dae": {
    "boardName": "Punjab Board of Technical Education",
    "instituteName": "Example Institute of Technology",
    "passingYear": 2026,
    "marks": {
      "totalMarks": 3450,
      "obtainedMarks": 2760
    }
  },
  "matric": {
    "boardName": "BISE Lahore",
    "group": "Science",
    "passingYear": 2023,
    "marks": {
      "totalMarks": 1100,
      "obtainedMarks": 880
    }
  },
  "domicile": {
    "district": "Lahore"
  }
}
```

The model derives marks percentages. Changing `profileStatus` to `complete` invokes the existing completed-profile validation and fails with `400 MODEL_VALIDATION_ERROR` if required academic or domicile data is missing.

## GET `/api/admin/ping`

This minimal endpoint verifies content-role middleware. Active `owner`, `co_owner`, and `admin` accounts are allowed; Students receive `403 FORBIDDEN`. The current database role/status, not JWT role claims, governs the result. Administrator catalogue and team APIs are documented separately.

## Manual Testing

Start MongoDB and the API:

```powershell
Start-Service MongoDB
cd server
npm run dev
```

Register and log in:

```powershell
$registration = @{
  name = "Ayesha Khan"
  email = "ayesha@example.com"
  password = "SecurePass123!"
} | ConvertTo-Json

Invoke-RestMethod http://localhost:5000/api/auth/register `
  -Method Post `
  -ContentType "application/json" `
  -Body $registration

$credentials = @{
  email = "ayesha@example.com"
  password = "SecurePass123!"
} | ConvertTo-Json

$login = Invoke-RestMethod http://localhost:5000/api/auth/login `
  -Method Post `
  -ContentType "application/json" `
  -Body $credentials

$accessToken = $login.data.token
```

Then use `$accessToken` with the authentication header shown above. Use temporary email addresses for testing and remove their user/profile records afterward. Never print access tokens, password hashes, or the JWT secret in logs.

Run local quality checks:

```powershell
cd server
npm run check:models

cd ..\client
npm run lint
npm run build
```
