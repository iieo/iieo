# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Leopold Bauer (bauerleopold.de). Built with Next.js 16, React 19, Tailwind CSS v4, and Three.js for WebGL background animations.

## Commands

- `pnpm dev` — Start development server
- `pnpm build` — Production build (TypeScript errors are ignored via `ignoreBuildErrors`)
- `pnpm lint` — ESLint
- `pnpm types` — TypeScript type checking (`tsc --noEmit`)
- `pnpm format` — Format with Prettier
- `pnpm format:check` — Check formatting

## Architecture

**Routing:** Next.js App Router with a `(app)` route group. The main portfolio page is `src/app/(app)/page.tsx`. Legal pages (impressum, datenschutz) are under `(app)/(legal)/`.

**Animation system:** The page renders a full-screen fixed background (`animation-viewer.tsx`, client component) with Three.js WebGL animations layered behind the main content. Three animation components exist in `src/components/`:
- `vortex-animation.tsx` — Fragment shader vortex effect
- `particle-animation.tsx` — Interactive particle system with mouse attraction
- `dripping-animation.tsx` — Flowing ink/drip simulation

All animations use raw Three.js (no React wrapper like @react-three/fiber). The `AnimationViewer` cycles between them via state (currently only shows the first one since the cycle button was removed).

**Content overlay:** `main-content.tsx` renders the name and project links on top of the animation with `pointer-events: none` (links re-enable pointer events individually).

**Database:** Drizzle ORM with PostgreSQL (`src/db/`). Uses `@t3-oss/env-nextjs` for typed environment variables. The DB layer has a user table with auth fields — this appears to be scaffolding from a template and isn't actively used by the portfolio.

**Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`. The v4 config uses `@import 'tailwindcss'` and `@config` directive in `globals.css`. The `tailwind.config.ts` defines a shadcn/ui-compatible color system with CSS custom properties. Fonts: Inter (sans) and Rubik Mono One (display, used as default body font).

## Key Patterns

- Path alias: `@/*` maps to `./src/*`
- Package manager: pnpm (v9)
- Prettier config from `@titanom/prettier-config`
- Footer is in the root layout, fixed to bottom of viewport
