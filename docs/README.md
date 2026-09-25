# Project Documentation

This directory contains DAE2UNI Pathway architecture notes, data-source guidance, API documentation, and final-year-project documentation.

## Current Documents

* [Domain model](./domain-model.md) — MongoDB/Mongoose entities, relationships, eligibility rules, merit formulas, admission cycles, and source verification
* [Authentication and student-profile API](./authentication-api.md) — endpoints, JWT usage, validation, security behavior, examples, and testing
* [Frontend authentication and student onboarding](./frontend-authentication.md) — browser session behavior, route guards, forms, profile flow, and manual testing
* [University and program catalogue API](./catalogue-api.md) — administrator CRUD, public browsing, queries, source visibility, integrity safeguards, and testing
* [Public catalogue frontend](./frontend-catalogue.md) — routes, URL-synchronized discovery, API integration, accessibility, responsive behavior, security, and testing
* [Administrator catalogue frontend](./admin-catalogue-frontend.md) — content-management routes, dashboard, university/campus/program workflows, source verification, and testing
* [First Owner setup](./first-administrator-setup.md) — one-time browser bootstrap, persistent lock, local/deployed workflow, and emergency recovery
* [Owner and administrator role management](./role-management.md) — content-role equality, role transitions, team API, audit, and recovery boundaries
* [Geographic catalogue, import, and verification](./geographic-catalogue.md) — separate geography/charter/HEC fields, draft-only JSON import, manual source-review queue, and backfill guidance
* [Frontend design system](./frontend-design.md) — academic-editorial tokens, responsive components, university media fallback, campus map-search links, and accessibility rules
* [Turnstile registration protection](./turnstile-registration.md) — local/deployed widget keys, mandatory backend verification, testing, and secret rotation

Calculation services, broader administrator workflows, and deployment remain future milestones.
