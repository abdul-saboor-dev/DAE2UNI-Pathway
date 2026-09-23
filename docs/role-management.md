# Owner and administrator role management

```text
Owner
├── Co-Owners
├── Admins
└── Students
```

Owner, Co-Owner, and Admin have **identical project-content permissions** on the current dashboard, universities, campuses, programs, sources, publication, and verification. The same content-role set is intended for future eligibility, merit, entry-test, preparation, admission-cycle, and application/deadline management when those features are built. Their difference is **control over roles**: Owner manages Admins and Co-Owners; Co-Owner manages regular Admins; Admin manages no roles. Students register publicly and have no administrator access. The backend checks the current database role/status for every protected request; JWT role claims and frontend guards are not authority.

The Owner is unique and permanent. Browser setup creates it once (see [First Owner setup](./first-administrator-setup.md)). It cannot be demoted, suspended, replaced, or deleted through the website. No normal request can create a second Owner or transfer ownership. Unique partial indexes on Owner role and its nonserialized protected marker provide database-level second-Owner protection.

## Allowed transitions

| Transition | Actor | Result |
| --- | --- | --- |
| Student → Admin | Owner or Co-Owner | Full content access; account/profile retained |
| Admin → Student | Owner or Co-Owner | Content access removed; account/profile retained |
| Admin → Co-Owner | Owner only | Content plus regular-Admin management |
| Co-Owner → Admin | Owner only | Keeps content access, loses role-management access |

Student → Co-Owner, every transition to Owner, Owner demotion, and direct Co-Owner → Student are forbidden. To make a Co-Owner, first promote a Student to Admin, then make that Admin a Co-Owner. To remove all Co-Owner elevation, first return them to Admin, then remove Admin access. Role removal never deletes accounts or profiles.

## Team API

All routes require a Bearer token, an active account, and a database-backed authorized role. Success uses `{ "status": "success", "data": ... }`; errors use the normal structured API shape. The server never returns hashes, tokens, setup secrets, Owner markers, role-audit internals, or private student profiles.

| Endpoint | Roles | Body / query | Result |
| --- | --- | --- | --- |
| `GET /api/admin/administrators` | Owner, Co-Owner | `page` (1+), `pageSize` (1–100; default 20), literal `search` (name/email, max 80), `sort` (`name`, `-name`, `role`, `-role`, `createdAt`, `-createdAt`, `lastLoginAt`, `-lastLoginAt`) | `data.users` safe team rows and `data.pagination` |
| `POST /api/admin/administrators/promote` | Owner, Co-Owner | `{ "email": "registered@example.com", "currentPassword": "..." }` | Student → Admin |
| `POST /api/admin/administrators/:userId/revoke` | Owner, Co-Owner | `{ "currentPassword": "...", "confirmed": true }` | Admin → Student |
| `POST /api/admin/administrators/:userId/grant-co-owner` | Owner | `{ "currentPassword": "...", "confirmEmail": "target@example.com", "confirmed": true }` | Admin → Co-Owner |
| `POST /api/admin/administrators/:userId/revoke-co-owner` | Owner | Same typed-email confirmation body | Co-Owner → Admin |

Target IDs must be valid MongoDB ObjectIds. Requests and queries reject unknown fields, MongoDB operators, and prototype-pollution-style keys. Every target must be active and have the exact expected current role. Self-role changes are rejected. The acting user's current password is verified from an explicitly selected hash on **every** change, including a recheck under the operation lock. Incorrect-password errors are generic; the password is never logged or stored in browser storage. A focused 15-minute per-user/socket throttle returns `429` after excessive attempts.

Role changes use a database-backed global operation lease to serialize actors across processes. Expired claims may be recovered; failed password checks do not consume the claim. Each successful conditional target update atomically appends an internal audit event with actor ID/role, target ID, action (`admin_promoted`, `admin_access_revoked`, `co_owner_granted`, `co_owner_access_revoked`), old/new roles, and timestamp. Failed changes append no event. No password, JWT, secret, header, or request body is saved in audit records. There is no public audit endpoint or audit UI yet. The setup lock is separate and permanently completed.

## Management page

`/admin/administrators` is visible only to Owner and Co-Owner. It lists safe team fields with search, bounded pagination, role/status badges, current-account indication, and a protected Owner badge. The Owner row has no role-change action. Owner can remove Co-Owner access or make an Admin Co-Owner; both actions require a typed target email and current Owner password in a confirmation dialog. Owner and Co-Owner can promote a registered Student by email or remove an Admin's access with current-password confirmation. Admin and Student cannot load the page or call its API. A demoted account loses protected backend access immediately, even with an old JWT; the frontend refreshes `/api/auth/me` when an admin request is rejected and on window focus.

The page provides loading, empty, error/retry, success, mobile cards, visible focus, and a native modal. Closing or cancelling restores focus to the initiating control; after a successful role change, focus moves to the stable page heading because the initiating control may disappear when the list refreshes. Password and typed-email values are cleared when the dialog closes or fails. No account data is deleted. Content-management features remain available to an Admin after Co-Owner removal.

For isolated backend verification run `npm run check:roles` from `server/`; for frontend safeguards run `npm run check:roles-frontend` from `client/`. The backend suite uses and drops only its own random temporary database in `finally`.
