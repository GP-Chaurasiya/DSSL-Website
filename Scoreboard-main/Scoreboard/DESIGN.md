# Design Brief

## Direction

DSSL Scoreboard Manager — A premium, clean sports tournament management dashboard with dual-theme support for light and dark modes.

## Tone

Minimal + Professional + Modern SaaS — clean spacing, intentional hierarchy, and refined restraint over decoration, balancing premium feel with functional clarity.

## Differentiation

Dual-theme implementation preserves gold and royal blue branding in both light and dark modes, with carefully tuned OKLCH tokens ensuring AA+ contrast and visual hierarchy across all interface states.

## Color Palette

| Token (Light / Dark) | OKLCH Light | OKLCH Dark | Role |
| ---- | ---- | ---- | ---- |
| background | 0.99 0.002 240 / 0.12 0.008 265 | Background surface |
| foreground | 0.12 0.02 250 / 0.95 0.008 265 | Text and primary content |
| card | 1.0 0.0 0 / 0.18 0.01 265 | Elevated card/container surface |
| primary (Blue) | 0.49 0.19 261 / 0.62 0.19 261 | Royal blue (#003E8A) brand color |
| accent (Gold) | 0.83 0.21 78 / 0.76 0.19 78 | Gold (#ffbc01) highlight and active states |
| muted | 0.96 0.004 240 / 0.25 0.01 265 | Secondary/disabled state surface |
| border | 0.91 0.004 240 / 0.3 0.01 265 | Structural dividers |
| sidebar | 0.975 0.003 240 / 0.16 0.01 265 | Sidebar background |
| success | 0.55 0.18 150 / 0.65 0.18 150 | Positive action feedback |
| warning | 0.7 0.15 85 / 0.75 0.15 85 | Alert and cautionary states |
| destructive | 0.55 0.22 25 / 0.65 0.2 25 | Dangerous/delete actions |

## Typography

- Display: Space Grotesk — page headers, section titles, premium headings
- Body: General Sans — body copy, UI labels, default text
- Scale: h1 text-3xl font-display font-bold, h2 text-xl font-display font-semibold, label text-sm font-body font-medium, body text-base font-body

## Elevation & Depth

Three-tier surface hierarchy: flat background, raised cards with subtle 1–2px borders, and elevated containers with soft shadows; dark mode maintains depth through incremental background lightness shifts (0.12 → 0.16 → 0.18 → 0.22) without relying on shadows alone.

## Structural Zones

| Zone | Light Background | Dark Background | Border | Notes |
| ---- | ---- | ---- | ---- | ---- |
| Header | sidebar 0.975 0.003 240 | sidebar 0.16 0.01 265 | border 0.91 0.004 240 / 0.3 0.01 265 | Collapsible left sidebar with logo, navigation |
| Content | background 0.99 0.002 240 | background 0.12 0.008 265 | — | Main dashboard area, alternates muted sections |
| Cards | card 1.0 0.0 0 | card 0.18 0.01 265 | border | Quick Match Setup, Stats, Upcoming Matches |
| Sections | muted 0.96 0.004 240 / background | muted 0.25 0.01 265 / background | — | Subtle alternation for visual grouping |

## Spacing & Rhythm

Open, spacious grid with 2rem section gaps, 1rem padding inside cards, and 0.5rem micro-spacing between UI elements; mobile-first responsive breakpoints at sm (640px), md (768px), lg (1024px), xl (1280px) maintain breathing room across all screen sizes.

## Component Patterns

- Buttons: Rounded 0.75rem, primary uses blue with white text, accent uses gold, secondary uses muted, hover via opacity/darkening
- Cards: Rounded 0.75rem, border 1px, soft shadow (xs), light background for grouped content
- Badges: Inline labels with rounded md, semantic colors (success/warning/destructive)
- Inputs: Rounded 0.75rem, border + light background, focus ring using primary color
- Tables: Striped rows (alternating muted-light background), header with border-bottom

## Motion

- Entrance: Sidebar slides from left on mount (0.3s cubic-bezier(0.4, 0, 0.2, 1))
- Hover: Button color transition (0.2s), scale lift on cards (0.1s)
- Decorative: None; all motion serves functional purpose

## Constraints

- No full-page gradients; use layered surfaces and borders for visual separation
- Maintain gold and blue visibility in both light and dark modes
- AA+ contrast for all text-on-background and text-on-card combinations
- Responsive mobile-first design; sidebar collapses on mobile with hamburger toggle
- No rainbows or scattered color; 5-color max palette (blue, gold, neutrals, success, warning, destructive)

## Signature Detail

Dual-theme OKLCH token system that preserves brand colors and intent while automatically tuning contrast and visual hierarchy for readability in low-light environments — gold remains warm and accent-rich in dark mode, blue maintains authority without washout.
