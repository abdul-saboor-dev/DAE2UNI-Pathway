# Frontend design system

DAE2UNI uses an academic-editorial interface: clear reading order, restrained technical cues, and practical actions for DAE CIT students. The redesign changes presentation only. Existing API contracts, authentication, authorization, catalogue visibility, and import/verification rules remain authoritative on the server.

## Tokens and typography

The shared styles in `client/src/index.css` use structural navy `#102A43`, academic action blue `#285F8F`, warm ivory `#F7F4ED`, muted gold `#C9963B`, ink `#17212B`, and muted text `#5D6873`. White text on academic blue has a 6.72:1 contrast ratio (WCAG AA). Hover, pressed, disabled, focus, and bluewash states derive from this blue. Green is reserved for genuine semantic success such as connected, verified, completed, and active states; it is not a brand or action color. Red remains destructive/error, while gold signals warnings or editorial accents. Subtle warm borders and restrained shadows separate surfaces. Georgia/Times provides the editorial display fallback and Segoe UI/Helvetica/Arial/system sans-serif supplies readable controls and body copy. No external font request is required.

The type hierarchy is `display-type` for major editorial statements, `page-title` for route headings, `section-title` for sections/cards, `eyebrow` for short overlines, and `body-copy` for supporting text. The `site-container` caps long lines. Controls share `action-primary`, `action-secondary`, and `site-input`. The public shell and administrator workspace have related colors but different navigation and information density.

## Components and responsive behavior

Existing catalogue cards, filter panels, pagination, breadcrumbs, source attribution, loading/empty/error states, alerts, form fields, status badges, and administrator dialogs now use the same visual language. The administrator workspace uses a compact navy sidebar on large screens and native disclosure navigation on small screens. Public navigation also uses a native mobile disclosure. Forms retain their existing labels, validation relationships, request payloads, and focus behavior. Save actions remain reachable in long admin and student forms.

Layouts are intended for 375, 768, 1024, and 1440 px widths. Flexible grids, wrapping text, bounded dialogs, and responsive record layouts keep controls usable. Focus outlines are visible; native links, buttons, details, inputs, and dialogs remain keyboard-operable. Status text accompanies color, loading and errors retain accessible announcements, and `prefers-reduced-motion` removes nonessential transitions and smooth scrolling.

## University media and campus maps

The university card currently renders a branded navy media area with an abbreviation or generated monogram. It does **not** require or request an image from the API. Its optional `imageUrl` prop is only a future integration point: a later milestone must define an approved image source, rights, and backend contract before supplying images. No real university photo URL is hard-coded or hotlinked.

Public campus information comes from the existing catalogue response. The UI shows campus name, city, district, address, main-campus state, and active state where available. A Google Maps **search** link appears only when the campus has a usable address; it is built in the browser with `encodeURIComponent`, opens in a new tab with `noopener noreferrer`, and needs no API key or map embed. The link is a search aid, not an assertion about precise coordinates.

## Safeguards and limitations

Public catalogue requests remain token-free. External links accept only HTTP/HTTPS and reject embedded credentials. Catalogue text is not inserted as raw HTML. Student and administrator route guards, backend-enforced permissions, safe redirects, session restoration, query-state behavior, debounce, and request cancellation are unchanged. Future eligibility, merit, deadlines, university images, and recommendations are not presented as completed features.

Run `npm run check:design` from `client/` with the existing frontend safeguards, ESLint, and production build. Browser-check responsive widths and keyboard focus when changing shared layout or dialog styles.
