# Student-registration Turnstile setup

Only `POST /api/auth/register` uses Cloudflare Turnstile. Backend [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) is mandatory; client widget state is never proof by itself. Login, Owner setup, role management, profiles, and catalogue endpoints do not use Turnstile.

## Cloudflare dashboard and deployment

1. Create a free Turnstile widget in the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile). Configure allowed hostnames. For local development, add `localhost` and/or `127.0.0.1`. For deployment, add the actual future Vercel frontend hostname; do not guess or hard-code it. Cloudflare recommends separate production hostnames without localhost.
2. Copy the public site key into the frontend host's `VITE_TURNSTILE_SITE_KEY` setting. Vite embeds this public key in its build. A missing key shows a safe unavailable message and disables registration.
3. Set the private `TURNSTILE_SECRET_KEY` only in the backend host's secret/environment settings. Never use a `VITE_` prefix for it. Set `TURNSTILE_ALLOWED_HOSTNAMES` to the comma-separated frontend hostnames expected in Siteverify responses (hostnames only, no scheme or path). Production startup rejects a missing, placeholder, weak, or official test secret and rejects localhost in this allowlist.
4. Deploy over HTTPS. Test registration, then confirm that replaying an old token fails. Siteverify tokens expire after five minutes and are single-use. Never put a token or secret in a URL or log.

The widget uses action `student_register`. The backend requires Siteverify `success: true`, the matching action, a hostname, and an allowed hostname when configured. Failed verification creates no account and returns only a generic error. A network outage fails closed. `TURNSTILE_SECRET_KEY` must be separate from the JWT and Owner-setup secrets.

## Local development and automated tests

Copy `client/.env.example` to ignored `client/.env.local` and set `VITE_TURNSTILE_SITE_KEY`. Set `TURNSTILE_SECRET_KEY` in ignored `server/.env`. Start both servers as usual. If keys are missing, the frontend disables registration and the development backend returns `503 HUMAN_VERIFICATION_UNAVAILABLE` for otherwise valid registration requests. No bypass flag exists.

Use [Cloudflare's official dummy keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) only for local/browser tests: the visible always-pass site key is `1x00000000000000000000AA` and the matching always-pass backend test secret is `1x0000000000000000000000000000000AA`. The backend regression harness mocks Siteverify and does not call Cloudflare. Official test secrets are rejected when `NODE_ENV=production`; real production secrets reject dummy tokens. Do not commit even test-key overrides in a real `.env` file. Run `npm run check:turnstile` in both `server/` and `client/`.

## Failure and rotation

If a secret leaks, rotate it in Cloudflare's Turnstile settings, update the backend host secret, restart/redeploy, and invalidate the old secret. Do not place a replacement secret in Git, frontend code, Vite variables, screenshots, or issue logs. For a failed challenge, refresh/reset the widget and submit a new token; reusing a spent token cannot succeed.
