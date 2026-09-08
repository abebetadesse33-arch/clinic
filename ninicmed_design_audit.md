# NiniMed — Design Audit Note
**Scope**: Theme · Style · Fonts · App Structure  
**Date**: September 2026 · Source: `src/` codebase review

---

## 1. Theme

### Identity & Concept
NiniMed is positioned as a **premium clinical healthcare network** inspired by One Medical's human-centered aesthetic. The theme can be described as:

> **"Luminous Clinical Blue"** — clean, trustworthy, airy, and modern.

### Color System
The palette is defined in two places: `tailwind.config.ts` (design tokens) and `globals.css` (CSS custom properties). A significant refactor has already been applied to **replace all legacy dark-green / mint tones** with a unified light-blue brand:

| Token Group | Light Mode | Dark Mode | Purpose |
|---|---|---|---|
| **Brand primary** | `#075985` / `#0284C7` | `#7dd3fc` / `#38bdf8` | CTAs, icons, links |
| **Brand dark** | `#12304A` / `#0C2B4E` | `#071521` | Dark hero backgrounds, card-forest |
| **Canvas / surface** | `#F5FAFF` → `#EAF4FB` | `#06131f` → `#0d2233` | Page backgrounds |
| **Text heading** | `#16324F` | `#f8fafc` | H1–H3 |
| **Text body** | `#334E68` | `#e2e8f0` | Paragraphs |
| **Text muted** | `#58738A` | `#94a3b8` | Captions, labels |
| **Accent: Sky blue** | `#0284C7` | `#38bdf8` | Hover, focus, borders |
| **Accent: Amber** | `#E5A93C` | `#fcd34d` | Star ratings, gold badges |
| **Semantic danger** | HSL `0 72% 51%` | HSL `0 62% 40%` | Alerts, destructive |

> [!NOTE]
> The `accent.terracotta` and `accent.gold` tokens in `tailwind.config.ts` are **vestigial** — they map to blue values at runtime via CSS overrides. This is a technical debt remnant from an earlier warm-palette iteration.

### Color Mode Support
- ✅ Full **light / dark mode** via `html.dark` class (managed by `ThemeContext`)
- ✅ **High-contrast mode** (`html.dark.contrast-mode`) — WCAG AAA target: black bg, white text, amber buttons, cyan borders
- Body background in light mode is a **multi-stop radial gradient** giving a softly glowing feel. Dark mode uses a deep navy linear gradient.

---

## 2. Style Language

### Design Vocabulary
The app uses a consistent set of named CSS utility classes (defined in `globals.css`) that form a design language layer on top of Tailwind:

| Class | Description |
|---|---|
| `.card-warm` | White card, subtle blue shadow, 1.25rem radius |
| `.card-warm-hover` | Lifts +3px, blue border on hover |
| `.card-forest` | Dark navy `#0C2B4E` card for CTA hero blocks |
| `.glass-panel` | `rgba(255,255,255,0.76)` + `backdrop-filter: blur(18px)` |
| `.glass-card` | Lighter glassmorphism for compact surfaces |
| `.soft-panel` | Mid-weight frosted glass for dashboards |
| `.minimal-dashboard-shell` | Muted glass shell for clinical workspaces |
| `.btn-pill-primary` | Full pill (border-radius: 9999px), solid `#0284C7`, lift on hover |
| `.btn-pill-secondary` | Outlined, white fill, transitions to light blue bg |
| `.btn-pill-ghost` | Transparent, used for tertiary nav actions |
| `.badge-mint / .badge-gold / .badge-sage` | Small inline status pills, currently all render blue |
| `.input-warm` | 0.875rem radius input with focus ring glow |
| `.glow-teal-sm/md` | Box-shadow glow for highlighted UI elements |

### Motion & Animations
| Name | Duration | Easing | Use |
|---|---|---|---|
| `fadeIn` | 0.25s | `cubic-bezier(0.16,1,0.3,1)` | Page section entrances |
| `slideUp` | 0.35s | `cubic-bezier(0.16,1,0.3,1)` | Bottom drawer, modal open |
| `slideIn` | 0.3s | `ease-out` | Panel slide-in from right |
| `pulse-slow` | 3s | `cubic-bezier(0.4,0,0.6,1)` | Live status indicators |
| `subtleFloat` | 4s | `ease-in-out` | Decorative floating elements |
| `shimmerEffect` | 2.5s | `linear` | Skeleton / shimmer overlays |
| `pulseGlow` | — | — | Glow accent pulse |
| `accordion-down/up` | 0.2s | `ease-out` | Radix accordion components |
| Card hover | 0.25s | `cubic-bezier(0.16,1,0.3,1)` | All `.card-warm-hover` |

> [!TIP]
> `prefers-reduced-motion` is respected — all animations are killed to `0.01ms` for accessibility.

### Border Radii
The radius scale is generous and modern:
- Standard card: `1.25rem` (`.card-warm`), `1.5rem–2rem` (`.card-forest`, large drawers)
- Buttons: `9999px` (full pill)
- Inputs: `0.875rem`
- Icons within cards: `0.75rem` (rounded-xl) / `1rem` (rounded-2xl)
- Custom Tailwind extends: `3xl = 1.5rem`, `4xl = 2rem`

### Glassmorphism Usage
Extensively used for the **Navigation Header** (`surface-glass-navbar`), **dashboards** (`.minimal-dashboard-shell`), **clinical workspaces** (`.glass-panel`), and **drawers** (`.drawer-backdrop` with blur(4px) backdrop).

---

## 3. Typography / Fonts

### Font Stack
Fonts are loaded via Google Fonts `@import` in `globals.css` and configured in `tailwind.config.ts`:

| Role | Family | Weights | Usage |
|---|---|---|---|
| **Body** | `DM Sans` | 400, 500, 600, 700 | `body` default — all prose text |
| **Heading / Display** | `Manrope` | 500, 600, 700, 800 | `h1`, `h2`, `h3`, `.font-display`, `.font-serif-heading` |
| **Mono** | `JetBrains Mono` | 400, 500, 600 | Code blocks, clinical data values |
| *Tailwind alias (sans)* | `Inter` (fallback) | system | `.font-sans` class |
| *Tailwind alias (serif)* | `Newsreader` | — | `.font-serif` class (not imported, fallback to Georgia) |
| *Tailwind alias (display)* | `Outfit` | — | `.font-display` in Tailwind (overridden by Manrope in CSS) |

> [!WARNING]
> **Font conflict**: `tailwind.config.ts` maps `font-display` to `Outfit` but `globals.css` overrides `.font-display` with `Manrope`. Similarly, `font-serif` maps to `Newsreader` in Tailwind but `Newsreader` is **not imported** in the CSS `@import` — it would silently fall back to Georgia. This should be resolved.

> [!WARNING]
> **Missing Google Font**: `Inter`, `Outfit`, and `Newsreader` are referenced in `tailwind.config.ts` but **none of them are imported** in the `@import` statement in `globals.css`. Only `DM Sans`, `Manrope`, and `JetBrains Mono` are actually loaded.

### Type Scale & Treatment
- Headings: `font-bold` / `font-extrabold`, `text-3xl` → `text-4xl` for section headers; `text-lg` for navigation brand.
- Body: `text-xs` / `text-sm` dominant in clinical card content (compact density).
- Heading color: `#16324F` light / `#f8fafc` dark — enforced globally via CSS selectors.
- Anti-aliased globally: `-webkit-font-smoothing: antialiased`.

---

## 4. App Structure

### Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v3 + custom CSS in `globals.css`
- **Component library**: shadcn/ui (Radix primitives), configured via `components.json`
- **Icons**: Lucide React (consistent throughout)
- **State**: React Context (`ClinicContext`, `ThemeContext`, `LanguageProvider`)
- **Data fetching**: React Query (`QueryProvider`)
- **Mobile**: Capacitor (PWA + Android build support)

### Directory Layout

```
src/
├── app/                   # Next.js App Router pages
│   ├── globals.css        # Global design system
│   ├── layout.tsx         # Root shell (Nav + Footer + Providers)
│   ├── page.tsx           # Role-based home (guest / patient / staff)
│   ├── admin/             # Admin portal pages
│   ├── patient/           # Patient portal pages
│   ├── clinical/          # Clinical workspace pages
│   ├── appointments/      # Scheduling
│   ├── pharmacy/          # Pharmacy module
│   ├── billing/           # Billing & payments
│   ├── telemedicine/      # Video visit rooms
│   ├── triage/            # Urgent triage flows
│   └── [15+ more modules]
│
├── components/
│   ├── NavigationHeader.tsx   # Global nav (1015 lines — very large)
│   ├── CommandPalette.tsx     # ⌘K search palette
│   ├── landing/               # Guest-facing landing sections
│   ├── dashboards/            # Role-specific clinical dashboards
│   │   ├── PhysicianDashboard.tsx
│   │   ├── NurseDashboard.tsx
│   │   ├── PharmacistDashboard.tsx
│   │   └── [8 more specialties]
│   ├── treat-me-now/          # Virtual urgent care flow
│   ├── patient/               # Patient-specific widgets
│   ├── layout/                # AppFooter, NotificationBell
│   ├── mobile/                # PWA registrar, MobileBottomNav
│   ├── ui/                    # shadcn/ui components
│   └── widgets/               # Modular dashboard grid
│
├── context/
│   ├── ClinicContext.tsx       # Global role, user, auth state
│   └── ThemeContext.tsx        # Dark/light/high-contrast theme
│
├── lib/
│   ├── i18n/                   # Multi-language support
│   ├── security/               # RBAC: roles-permissions matrix
│   ├── services/               # Triage, provider-matching services
│   └── types/                  # TypeScript type definitions
│
└── db/                         # Drizzle ORM schema
```

### Layout Shell (Root)
```
<html>
  <body>
    <QueryProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ClinicProvider>
            <PwaRegistrar />
            <NavigationHeader />     ← sticky top-0, glassmorphism
            <main max-w-7xl>         ← px-3 sm:px-6 lg:px-8, py-4–6
              {children}
            </main>
            <MobileBottomNav />      ← mobile only, pb-16 body offset
            <AppFooter />            ← desktop only, hidden md:block
          </ClinicProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryProvider>
  </body>
</html>
```

### Role-Based Rendering
The home page (`page.tsx`) acts as a **role router**:

| Condition | Component Rendered |
|---|---|
| `isGuest` | `GuestLandingView` (landing/marketing) |
| `currentRole === "patient"` | `PatientDashboardPage` |
| `system_admin` / `tenant_admin` | `AdminPortalPage` |
| `auditor` | `AuditorDashboard` |
| Clinical specialists (10+ roles) | Dedicated `[Specialty]Dashboard` |

Specialist dashboards can switch between **"Specialist Workstation"** and **"Modular Widget Grid"** views via an in-page toggle.

### Navigation Structure
The `NavigationHeader` (1,015 lines) provides:
- Top announcement bar (24/7 status + "Treat Me Now™" CTA + phone number)
- Role-adaptive nav links (Guest / Patient / Provider / Admin each have distinct nav trees)
- Dropdown menus per section (clinical modules)
- User avatar + role badge + role-switcher menu
- Theme toggle + Language selector + Notification bell
- Mobile hamburger menu + `⌘K` Command Palette

---

## 5. Key Issues & Observations

### 🔴 Critical
1. **Font import mismatch**: `Inter`, `Outfit`, and `Newsreader` are defined in Tailwind but not imported via Google Fonts. They silently fall back to system fonts.
2. **`NavigationHeader.tsx` is 1,015 lines** — a monolithic component that will become difficult to maintain. Should be split into sub-components (GuestNav, PatientNav, StaffNav, MobileMenu, etc.).

### 🟡 Moderate
3. **Badge naming is misleading**: `.badge-terracotta`, `.badge-gold`, `.badge-sage` all render identical light-blue styles — their semantic names no longer match their visual output after the brand color refactor.
4. **Hardcoded hex values in JSX**: Many components use inline hex strings (e.g. `text-[#162E27]`, `bg-[#005C4B]`) that are then globally overridden in CSS. This is fragile — a single token change requires CSS regex overrides rather than a token update.
5. **`tailwind.config.ts` vs `globals.css` conflict on display font**: `font-display` resolves to `Outfit` in Tailwind but `Manrope` in CSS — the actual behavior depends on class application order.

### 🟢 Strengths
6. **Design system is coherent**: The `.btn-pill-*`, `.card-warm`, `.glass-*`, `.badge-*` classes form a reliable vocabulary that keeps component files lean and consistent.
7. **Accessibility is considered**: `skip-link`, `*:focus-visible` ring, reduced-motion support, and high-contrast mode are all implemented.
8. **Dark mode is thorough**: Every component class has a dark-mode override — including scrollbars, inputs, badges, glass panels, and drawers.
9. **Responsive layout is solid**: Mobile-first with `sm:`, `md:`, `lg:` breakpoints, safe-area insets for notch devices, and mobile-bottom-nav with body pb-16 offset.
10. **Multi-role architecture is clean**: The context-based role system and per-specialist dashboard pattern scale well to the 15+ clinical roles defined.
