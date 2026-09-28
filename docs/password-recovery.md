# Password recovery

DAE2UNI password recovery is a public, enumeration-resistant flow for active verified Students and active Owner, Co-Owner, and Admin accounts. It does not change first-Owner setup, CLI recovery, role management, catalogue behavior, or email addresses.

## Routes and endpoints

| Browser route | API endpoint | Purpose |
| --- | --- | --- |
| `/forgot-password` | `POST /api/auth/forgot-password` | Request a recovery email after Turnstile action `password_reset_request`. |
| `/reset-password#token=...` | `POST /api/auth/reset-password` | Choose a new password with a one-use token. |

The email link uses a URL fragment, not a query string. The browser reads the token once, immediately removes the fragment with `history.replaceState`, keeps it only in a component ref, and sends it in the POST body. It is never put in `localStorage`, `sessionStorage`, logs, or API responses.

## Security design

The server generates 32 cryptographically random bytes and emails only the raw token. MongoDB stores its SHA-256 hash in `PasswordResetToken`; serialization removes both the token hash and normalized-email hash. Tokens expire after 30 minutes, are atomically consumed once, and are removed later through a TTL index. Issuing a new token replaces the prior active token. Records with unsuccessful email delivery have no usable token.

Forgot-password responses are identical for eligible, unknown, inactive, unverified, cooling-down, rate-limited, and provider-failure cases. Database-backed limits allow no more than one attempt per normalized email per minute and five per one-hour window. A small in-memory IP limit is an additional per-process safeguard; edge/WAF throttling remains recommended for multi-instance deployments. Turnstile backend verification is mandatory and uses the distinct recovery action.

Successful reset reuses the registration password policy and bcrypt cost 12. It increments the database-backed `authVersion`, so every JWT issued before the reset fails current-user authentication immediately. The operation does not modify name, email, role, account status, profile, verification state, or the permanent Owner marker. Students still awaiting email verification cannot use recovery; they use the verification resend flow instead. Legacy accounts whose `emailVerificationRequired` field is absent remain compatible.

## Configuration and operations

Recovery reuses the existing backend-only Brevo settings:

```dotenv
BREVO_API_KEY=<private API key>
EMAIL_FROM_ADDRESS=<verified sender address>
EMAIL_FROM_NAME=DAE2UNI Pathway
CLIENT_BASE_URL=http://localhost:5173
```

It also reuses `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`, and the frontend-only `VITE_TURNSTILE_SITE_KEY`. No additional environment variable is required. Never put the Brevo key or Turnstile secret in a `VITE_` variable. Production requires HTTPS for `CLIENT_BASE_URL`, a production Turnstile secret, and an allowed production hostname. Backend action validation remains authoritative.

Provider outcomes are intentionally hidden behind the generic forgot-password response. An explicit Brevo rejection or a pre-send configuration failure removes the unusable token. A timeout or lost network acknowledgement is ambiguous because Brevo may already have accepted the message, so the hash-only token is retained rather than invalidating a potentially delivered link. No post-acceptance parsing or database update is required. The account and existing password remain unchanged until a valid reset is submitted. Repeated reset-link use returns the same safe invalid-or-expired response.

## Manual testing

1. Open `/forgot-password`, enter an eligible account email, complete Turnstile, and submit.
2. Confirm the UI always shows the generic check-email state.
3. Inspect the received email without logging its link, then open it in the browser.
4. Confirm the fragment disappears immediately, select a compliant password, and submit once.
5. Confirm the old password and any pre-reset JWT no longer work, while the new password does.
6. Confirm the account role, profile, verification status, and permanent Owner protection are unchanged.
7. Remove only unmistakably temporary test accounts and token records.

Automated testing mocks Brevo and Turnstile and never sends external email:

```powershell
cd server
npm run check:password-recovery

cd ..\client
npm run check:password-recovery
```
