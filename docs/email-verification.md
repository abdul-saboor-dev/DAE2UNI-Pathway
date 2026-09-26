# Student email verification

Turnstile protects public registration and resend requests from automated abuse; email verification separately proves control of the address. New public student accounts cannot log in until verification. Legacy accounts (whose `emailVerificationRequired` field is absent), Owner setup, and CLI recovery keep their existing login behavior. A Student must verify before promotion to Admin. Any future email-change feature must set verification required again and verify the new address.

## Configuration

Use a [Brevo transactional email account](https://developers.brevo.com/reference/sendtransacemail): create and verify a sender, then create a private API key. Set these **only on the backend** in ignored `server/.env` locally or the backend host's secret settings:

```dotenv
BREVO_API_KEY=<private API key>
EMAIL_FROM_ADDRESS=<verified sender address>
EMAIL_FROM_NAME=DAE2UNI Pathway
CLIENT_BASE_URL=http://localhost:5173
```

For deployment, `CLIENT_BASE_URL` must be the HTTPS origin of the actual frontend, with no path, query, fragment, or embedded credentials. Do not hard-code a future Vercel hostname. Configure the public Turnstile site key on the frontend and its secret/hostname allowlist on the backend as described in [Turnstile registration protection](./turnstile-registration.md). There is no email-provider bypass in production. Production startup rejects missing or unsafe Brevo/client URL configuration; development registration fails closed if it is absent. Never put `BREVO_API_KEY` in a `VITE_` variable or a tracked file. If leaked, revoke and rotate it in Brevo, update backend secrets, and redeploy. Brevo plan sending limits still apply; check the current plan in Brevo before launch.

Automated suites mock Brevo and Turnstile and send no external email. A real local manual test requires a configured sender and permitted Turnstile keys; do not commit either credential.

## Flow and endpoints

| Endpoint | Input | Result |
| --- | --- | --- |
| `POST /api/auth/register` | Existing name, email, password, `turnstileToken` | Creates an active but unverified Student, sends a 30-minute link, returns safe user only—no JWT. |
| `POST /api/auth/verify-email` | `{ "token": "..." }` | Atomically consumes a valid token, verifies the Student, returns a success message—no JWT. |
| `POST /api/auth/resend-verification` | `{ "email": "...", "turnstileToken": "..." }` | Requires Turnstile action `email_verification_resend`; returns the same generic message whether the account is missing, verified, cooling down, or accepted. |
| `POST /api/auth/login` | Existing credentials | Correct password for an unverified account returns `EMAIL_VERIFICATION_REQUIRED`, no JWT; unknown email and wrong password remain generic. |

The frontend uses `/verify-email#token=...`, immediately removes the fragment from the visible URL/history, then submits it by POST. A fragment is not sent in the initial HTTP request. It never stores the token in browser storage. The registration page shows “Check your email” rather than logging in. `/resend-verification` provides an accessible retry form. Verification does not mutate state through GET.

The server generates 32 random bytes, stores only a SHA-256 digest in `EmailVerificationToken`, and emails the raw one-use token. Links expire after 30 minutes. A new send replaces the previous token. Token claims are consumed with a conditional database update; a TTL index removes old token records after their retention period. The resend policy is persisted per account: at least 60 seconds between attempts and at most five sends per hour. Turnstile is also required on resend. These account limits do not replace upstream IP/WAF protections for anonymous traffic.

If account creation succeeds but Brevo delivery fails, the account remains unverified and registration returns a safe retryable `EMAIL_DELIVERY_UNAVAILABLE` error. Re-registering the same email does not create a duplicate; after the cooldown, use the resend form. Provider response details are never sent to clients. Successful delivery still depends on sender verification and Brevo account/plan status.

To test manually, register with a disposable address through the actual Turnstile widget, inspect the received email, open its link, then log in. Confirm that reuse and expiration fail, and that resend rotates the link. Never print tokens or use real inboxes in automated fixtures.
