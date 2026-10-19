# Frontend Design System

DAE2UNI-Pathway uses a modern, dark academic interface combining clear information hierarchy, refined typography, subtle glassmorphism, and restrained indigo accents. The design prioritizes readability, accessibility, consistency, and practical navigation for DAE CIT students exploring university admission pathways.

The visual system follows a **midnight-dark aesthetic**, featuring near-black backgrounds, slate-colored surfaces, soft lavender highlights, translucent panels, and minimal decorative effects.

The redesign affects presentation only. Existing API contracts, authentication, authorization, catalogue visibility, and server-side import and verification rules remain authoritative.

## 1. Color Palette and Design Tokens

The frontend design tokens are defined in `client/src/index.css`, which serves as the source of truth for all shared visual styles.

### Background and Surface Colors

| Token | Hex Value | Purpose |
|---|---|---|
| `--ui-bg` | `#080B14` | Main application background |
| `--ui-bg-secondary` | `#0F172A` | Secondary background |
| `--ui-surface-solid` | `#141B29` | Cards and panels |
| `--ui-surface-subtle` | `#101725` | Subtle surfaces and rows |
| `--ui-surface-raised` | `#182233` | Elevated cards and records |

### Text Colors

| Token | Hex Value | Purpose |
|---|---|---|
| `--ui-text` | `#F8FAFC` | Primary text |
| `--ui-heading` | `#FFFFFF` | Headings |
| `--ui-muted` | `#AEB9CA` | Secondary text |
| `--ui-muted-strong` | `#CBD5E1` | Emphasized secondary text |

### Accent Colors

| Token | Value | Purpose |
|---|---|---|
| `--ui-accent` | `#C7D2FE` | Main lavender accent |
| `--ui-accent-strong` | `#A5B4FC` | Stronger indigo accent |
| `--ui-accent-soft` | `rgb(165 180 252 / .12)` | Subtle tinted backgrounds |
| `--academic-hover` | `#E0E7FF` | Light accent hover |
| `--academic-pressed` | `#A5B4FC` | Pressed interaction state |

Accent colors are used for active navigation, focus indicators, links, highlights, and interactive elements.

The previous ivory, academic-blue, navy, and muted-gold palette is no longer part of the active design system.

### Semantic Status Colors

| State | Hex Value | Purpose |
|---|---|---|
| Success | `#BBF7D0` | Verified and completed actions |
| Error | `#FECACA` | Validation errors and destructive actions |
| Warning | `#FDE68A` | Warnings and pending states |

Semantic colors must not replace the application's main accent palette.

## 2. Typography

The application uses two main font families.

**Headings: Archivo**

Used for large headings, page titles, section headings, card titles, and other prominent interface elements.

**Body: DM Sans**

Used for paragraphs, navigation, buttons, forms, tables, labels, and supporting content.

System sans-serif fonts provide fallbacks.

### Typography Hierarchy

- `display-type`: Large editorial statements and hero headings.
- `page-title`: Primary page headings.
- `section-title`: Section headings.
- `card-title`: Titles within cards.
- `eyebrow`: Small uppercase labels with expanded letter spacing.
- `body-copy`: Readable supporting paragraphs.
- `metadata`: Smaller secondary information.

The design uses compact heading letter spacing and controlled line heights to create a modern visual identity without compromising readability.

## 3. Dark Theme and Visual Effects

DAE2UNI currently uses a dark-only interface defined through `color-scheme: dark`.

### Background Effects

The main background combines a midnight base with a restrained indigo radial gradient.

The effect creates subtle depth without overwhelming the content.

### Glassmorphism

Selected surfaces use translucent backgrounds, soft borders, backdrop blur, and subtle shadows.

Examples include:

- General glass surfaces with 14px backdrop blur.
- Site header with 18px backdrop blur.
- Mobile navigation with 20px backdrop blur.
- Translucent elevated panels and dialogs.

Glass effects include solid-background fallbacks where needed.

### Borders, Shadows, and Corners

The interface uses translucent slate borders, stronger indigo-tinted borders for emphasis, and deep shadows for elevated surfaces.

Shared border-radius tokens are:

- Small: `0.7rem`
- Standard: `0.95rem`
- Large: `1.3rem`

These values establish a consistent rounded design language.

## 4. Components and Interaction Design

Catalogue cards, filters, pagination, breadcrumbs, forms, status panels, alerts, loading states, empty states, administrator dialogs, and navigation elements follow the shared dark design system.

### Buttons

Primary buttons use near-white backgrounds with dark text. Their hover state transitions to the lavender accent.

Secondary buttons use translucent dark backgrounds with subtle borders.

Destructive buttons use semantic error colors.

Disabled controls reduce opacity and disable interaction.

### Inputs and Forms

Form elements use dark backgrounds, rounded corners, slate borders, and lavender focus indicators.

Existing input labels, validation relationships, request payloads, and accessibility behavior remain unchanged.

### Navigation

The public website features a sticky, translucent dark header with backdrop blur.

The administrator workspace uses a compact midnight-dark sidebar on larger screens and responsive disclosure navigation on smaller screens.

Active navigation elements use subtle indigo-highlighted backgrounds and borders.

Public and administrative interfaces share design tokens while maintaining different information densities.

## 5. Responsive Design and Accessibility

The interface targets responsive layouts at:

- 375px — Mobile
- 768px — Tablet
- 1024px — Laptop
- 1440px — Desktop

Flexible grids, wrapping text, bounded dialogs, and responsive records maintain usability across viewport sizes.

Accessibility considerations include visible focus outlines, keyboard-operable controls, semantic feedback messages, and explicit status text rather than color-only indicators.

The `prefers-reduced-motion` media query reduces nonessential animations and transitions.

Interactive surfaces use restrained hover feedback, subtle elevation changes, and consistent focus states.

## 6. University Media and Campus Maps

University cards use a branded dark media area with an abbreviation or generated monogram.

The current documented component does not require or request university images from the API.

The optional `imageUrl` property remains a future integration point. University, campus, and program image management will require an approved media source, appropriate image rights, and supported backend contracts.

No external university photographs should be hard-coded or hotlinked without an approved integration.

### Campus Information

Public campus information comes from existing catalogue responses.

Available information may include campus name, city, district, address, main-campus status, and active state.

Google Maps search links are generated only when usable address information exists.

These links use `encodeURIComponent`, open in a separate tab, and use `noopener noreferrer`.

A search link does not guarantee an exact geographic coordinate.

## 7. Security and Design Safeguards

The frontend design must preserve existing application behavior and server-side protections.

Public catalogue requests remain token-free.

External URLs must use HTTP or HTTPS and reject embedded credentials.

Untrusted catalogue content must not be inserted as raw HTML.

Student and administrator route guards, backend-enforced permissions, safe redirects, session restoration, debounce, request cancellation, and query-state behavior must remain intact.

Features still under development, including eligibility evaluation, merit calculations, admission deadlines, university media management, and recommendations, must not be presented as completed unless actually implemented and verified.

## 8. Validation and Testing

Run the frontend design safeguards from the `client/` directory:

`npm run check:design`

Also execute the existing ESLint and production build checks.

After modifying shared styles, manually inspect the interface at the supported responsive breakpoints.

Verify keyboard focus, form interaction, dialog behavior, navigation, text contrast, and reduced-motion behavior.

## 9. Design Principles

DAE2UNI follows these principles:

1. **Consistency:** Shared tokens and components across public and administrative interfaces.
2. **Readability:** Clear typography, strong hierarchy, and sufficient contrast.
3. **Accessibility:** Keyboard support, focus visibility, and semantic status feedback.
4. **Minimalism:** Restrained visual effects and limited decorative elements.
5. **Scalability:** Reusable components for expanding university and program catalogues.
6. **Reliability:** Visual improvements must not compromise existing application functionality.

The intended result is a modern, professional academic platform with a recognizable midnight-and-lavender identity, suitable for future university catalogue expansion and additional student guidance features.
