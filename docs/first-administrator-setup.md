# First Owner setup

The one-time `/setup/admin` page creates the **permanent Owner**, not an Admin. Public registration creates Students only. The setup link is deliberately absent from normal navigation. Use HTTPS for deployed setup and login.

## Local setup

1. Generate a separate random setup secret in PowerShell: `$setupSecret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))`. This stores it without printing it. Copy it privately into ignored `server/.env` as `ADMIN_SETUP_SECRET=...`, then run `Remove-Variable setupSecret`.
2. Start MongoDB, the backend (`cd server; npm run dev`), and the frontend (`cd client; npm run dev`).
3. Visit `http://localhost:5173/setup/admin`. Enter the Owner's name, email, password, confirmation, and setup secret.
4. Sign in normally at `/login`, then verify `/admin` and `/admin/administrators`. Remove the setup secret from the server environment if desired; restart and confirm setup stays locked.

The setup secret authorizes initial setup; it is **not** the Owner password, JWT secret, database password, or an email password. Use at least 32 varied characters. Example values are rejected. Never put the real value in source code, Vite variables, a URL, screenshots, or logs.

## Deployed setup

1. Put `ADMIN_SETUP_SECRET` in the backend host's protected secret/environment settings. Configure MongoDB Atlas and the normal backend variables separately.
2. Deploy backend and frontend, configure `VITE_API_URL` to the backend `/api` base and `CLIENT_URL` to the frontend origin, and verify HTTPS.
3. Visit the deployed `/setup/admin`, create the Owner, then sign in at `/login` and verify both content and team-management access.
4. Remove `ADMIN_SETUP_SECRET` from the host settings. Redeploy/restart if necessary. The Owner and completed setup lock persist in MongoDB/Atlas; neither removal nor restart reopens setup.

Back up MongoDB before major administrative operations.

## API and permanent lock

`GET /api/setup/status` returns only `{ "data": { "ownerSetupRequired": true|false } }` with no-store headers. It does not reveal accounts or secret configuration. `POST /api/setup/admin` accepts only `name`, `email`, `password`, `passwordConfirmation`, and `setupSecret`. It creates a safe Owner response without a JWT; login is separate. Validation errors use the normal structured format. Completed setup returns `409`, missing server configuration `503`, invalid authorization `403`, and throttling `429`.

A singleton MongoDB claim serializes first-Owner requests. Unique partial database indexes on Owner role and protected Owner marker fence competing claims. Success permanently completes the setup lock; failed validation or secret checks do not claim it. An abandoned claim can expire. No plaintext setup secret is stored. An existing legacy Admin or Co-Owner without an Owner also locks browser setup; no account is selected automatically.

The setup endpoint has a 10 KB JSON limit and a per-socket-address in-memory limit of 20 attempts per 15 minutes. This throttle is supplemental to the strong secret and persistent database lock. Express proxy trust is disabled, so spoofed forwarding headers are not accepted as client identity. In multi-instance deployments, use host/WAF rate controls for distributed abuse protection.

## Emergency Owner recovery and legacy migration

The retained `provision:admin` script is an **explicit emergency Owner recovery tool**, with a separate deliberate legacy migration mode. It never creates a second Owner, default credentials, or a public recovery path. Restrict server-shell access and back up MongoDB before use.

To reset the existing exact Owner's password and reactivate that account, run from `server/`:

```powershell
$securePassword = Read-Host 'New Owner password' -AsSecureString
$plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
try {
  $env:DAE2UNI_OWNER_PASSWORD = $plainPassword
  npm run provision:admin -- --recover-owner owner@example.com
} finally {
  Remove-Item Env:DAE2UNI_OWNER_PASSWORD -ErrorAction SilentlyContinue
  $plainPassword = $null
  $securePassword.Dispose()
}
```

Replace the example with the exact existing Owner email. Remove the temporary environment variable immediately after use. The password obeys the registration length/72-byte policy and is hashed with bcrypt cost 12. No web request can demote, suspend, replace, or delete the Owner.

For a legacy database with Admins but no Owner, browser setup stays locked. After backup and deliberate selection, run `npm run provision:admin -- --migrate-legacy-admin exact-admin@example.com --confirm-legacy-migration`. The selected account must already be an active Admin. This mode does not choose an account, create one, or reset its password. Unique Owner indexes prevent a second Owner. It is a one-time explicit migration, not general provisioning.

If the Owner becomes unavailable, recover the existing account; never reopen browser setup. Future account-management APIs must preserve the last active Owner. Run `npm run check:setup` in `server/` and `npm run check:setup-frontend` in `client/` for isolated setup checks.
