---
name: iieo-design-style
description: Visual style guide for the iieo (bauerleopold.de) portfolio and its tools. Use whenever building or modifying any UI in this repo — landing page sections, tool pages, or new tools — so new surfaces match the existing dark editorial look.
---

# iieo — Design Style

Style reference for `bauerleopold.de`. The site has two surfaces:

1. **Landing page** (`src/app/(app)/page.tsx`, `main-content.tsx`) — full-screen Three.js animation behind editorial scrollytelling sections.
2. **Tools** (`src/app/(app)/tools/*`) — same visual language, no background animation, fixed top header.

Both surfaces share the same tokens. Stay inside this system unless explicitly told otherwise.

## Mood

Dark, editorial, monolithic. Inspired by personal-portfolio sites that feel like a magazine spread, not a SaaS dashboard. Black canvas, white type, generous negative space, motion that introduces content rather than decorating it. No accent color — hierarchy comes from scale, weight, and `white/N` opacity layers.

## Color

Strictly monochrome on `bg-black`. Color is expressed only through opacity tiers of white.

| Token (Tailwind) | Use |
|---|---|
| `bg-black` | Page background. Tools layout sets it explicitly via `bg-black text-white`. |
| `text-white` | Primary headings, primary button text, hovered link state. |
| `text-white/70` | Active control labels, body text on inputs. |
| `text-white/55` | Form labels (uppercase tracking), secondary copy. |
| `text-white/45` | Eyebrow on tool pages. |
| `text-white/40` | Default body copy, card descriptions, secondary nav. |
| `text-white/30` | Section eyebrow on landing (`tracking-[0.2em] uppercase`). |
| `text-white/20` | Card arrow glyph, micro labels. |
| `border-white/[0.08]` | Resting card border (landing project cards). |
| `border-white/[0.15]` | Resting card border (tool surfaces — slightly stronger because no animation behind). |
| `border-white/20` | Form inputs and chip buttons. |
| `bg-white/[0.01]` / `bg-white/[0.02]` / `bg-white/[0.03]` | Card surfaces, ascending with importance. Always paired with `backdrop-blur-sm`. |
| `bg-white text-black` | Single primary CTA per surface (e.g. Download). |

Never introduce hue. If a status color is unavoidable, use `text-amber-300/80` (precedent: Lesbarkeitswarnung im QR-Tool) — but prefer phrasing the warning in plain copy first.

User-supplied content (QR foreground/background, image preview) may carry color; chrome around it must stay monochrome.

## Typography

Two fonts only, both wired through CSS variables in `tailwind.config.ts`:

- **Display / default body** — Rubik Mono One (`font-rubik`, also the default `body` font). Used for everything *unless* `font-sans` is applied.
- **Sans (UI)** — Inter (`font-sans`). Used for all running text, form labels, buttons, descriptions, eyebrows, micro-copy.

Rule of thumb: **headlines and the hero name use the default (Rubik Mono One); everything else gets `font-sans` explicitly.** Card titles (`<h3>`) inherit Rubik — do not add `font-sans` to them. Card descriptions get `font-sans`.

### Scale

```
Hero name                text-6xl sm:text-7xl md:text-8xl lg:text-9xl  leading-[0.95]
Tool / page H1           text-4xl sm:text-5xl md:text-6xl              leading-[0.95]
Tools index H1           text-5xl sm:text-6xl md:text-7xl lg:text-8xl  leading-[0.95]
Card H3                  text-xl md:text-2xl
Lead paragraph           text-lg md:text-xl  font-sans  tracking-wide
Body                     text-base / text-sm md:text-base  font-sans  leading-relaxed
Eyebrow (section)        text-xs  font-sans  tracking-[0.2em]  uppercase  text-white/30
Eyebrow (sub / tool)     text-xs  font-sans  tracking-[0.15em] uppercase  text-white/20
Form label               text-xs  font-sans  tracking-wider    uppercase  text-white/55
Micro / hint             text-xs  font-sans  text-white/55
```

`leading-[0.95]` on every large headline is non-negotiable — the tight leading is what gives the type its weight.

## Layout

- **Page padding:** `px-6 sm:px-8 md:px-16 lg:px-24` everywhere. Never deviate.
- **Tool content width:** `max-w-6xl mx-auto`. Card grids inside use `max-w-5xl`.
- **Landing sections:** `min-h-dvh md:snap-start md:snap-always flex flex-col justify-center` with vertical `py-20`–`py-24` on mobile, none on desktop (snap fills).
- **Snap scroll:** root `<main>` carries `md:snap-y md:snap-mandatory`. Footer is auto-hidden via `body:has(.snap-y) > footer { display: none }` in `globals.css` — leave that rule alone.
- **Tool pages:** wrapped by `tools/layout.tsx`, which provides the fixed top bar (`← Leopold Bauer` left, `Tools` right). Page bodies start with a `pt-20`-compensated section, eyebrow `Tool`, then H1, then a short German lead.
- **Tool form layout:** two columns on `lg`, form on the left, sticky preview on the right: `grid lg:grid-cols-[1fr_380px] gap-8`. Preview column uses `lg:sticky lg:top-6 lg:self-start space-y-4`.

## Cards (landing & tools-index)

The card is the most reused element. Always built the same way:

```tsx
<motion.div
  className="border border-white/[0.08] rounded-2xl p-6 md:p-8 bg-white/[0.01] backdrop-blur-sm h-full"
  whileHover={{ borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.03)', y: -4 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
  <div className="flex items-start justify-between gap-4">
    <div>
      <h3 className="text-white text-xl md:text-2xl mb-2">{title}</h3>
      <p className="text-white/40 font-sans text-sm md:text-base leading-relaxed">{description}</p>
    </div>
    <span className="text-white/20 text-lg font-sans mt-1 shrink-0 group-hover:text-white/50 transition-colors">→</span>
  </div>
</motion.div>
```

- `rounded-2xl`, `backdrop-blur-sm`, lift `-4px` on hover, border softens to `white/20`.
- An arrow glyph (`→`) belongs in the top-right; it brightens to `white/50` on group hover.
- Wrap the entry-animation in `motion.div` with `useInView({ once: true, margin: '0px 0px -40px 0px' })` and stagger via a `delay` prop.

## Tool form surfaces

Tool pages use the **same card shell** but with `border-white/[0.15]` and `bg-white/[0.02]` (one tier brighter than landing because there's no animated background to push contrast). Each settings group is its own card:

```tsx
<div className="border border-white/[0.15] rounded-2xl p-5 md:p-6 bg-white/[0.02] backdrop-blur-sm space-y-5">
  ...
</div>
```

Reusable class strings (copy these verbatim — they are duplicated across both tools today):

```ts
const labelClass  = 'block text-white/55 text-xs font-sans tracking-wider uppercase mb-1.5';
const inputClass  = 'w-full bg-white/[0.03] border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm font-sans focus:outline-none focus:border-white/40 transition-colors';
const buttonClass = 'px-4 py-2.5 text-sm font-sans rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
```

When adding a third tool, **extract these to a shared module** rather than redefining them again.

### Buttons

- **Chip / segmented (inactive):** `border border-white/25 text-white/70 hover:border-white/40 hover:text-white`, `rounded-full` for filter chips, `rounded-lg` for segmented controls.
- **Chip / segmented (active):** `bg-white text-black border-white` (filter chip) or `bg-white/15 border-white/40 text-white` (segmented inside a card).
- **Primary CTA:** `bg-white text-black border-white hover:bg-white/90`. One per surface.
- **Sliders:** native `<input type="range">` with `accent-white`.
- **Checkboxes:** native, `accent-white`.

## Motion

Framer Motion only. The shared easing curve is **always** `[0.22, 1, 0.36, 1]` exported as `const ease = [0.22, 1, 0.36, 1] as const`.

Three patterns cover ~everything:

1. **`LetterPull`** — splits a string per character, each letter rises from `y: '100%'` over `0.6s` with `i * 0.04` stagger. Used for hero name and tools index headline. Wrapped in `<span class="inline-flex overflow-hidden">`.
2. **`SectionReveal`** — `useInView({ once: true, margin: '0px 0px -40px 0px' })` then `opacity 0→1, y 50→0` over `0.7s`. Use for every section eyebrow / block.
3. **Card reveal** — same `useInView`, plus `scale 0.97→1`. Stagger siblings with `delay` increments of `0.05`.

Other motion rules:

- Page-load delays start at ~`0.3s` and cascade. Hero copy lands at `1.1s`, scroll hint at `1.8s`, nav dots at `2.0s`. Don't compress this — the slow reveal is the brand.
- Hovers are `0.3s easeOut`, never longer.
- Loops (scroll-hint chevron, mouse-circle) use `easeInOut` and `repeat: Infinity`.
- Keep transforms compositor-friendly (`y`, `opacity`, `scale`). Never animate layout properties.

## Iconography

No icon library. Inline SVG only, sized small (≤ 20px), `currentColor`, opacity ≤ `white/20`. Arrows are typed glyphs (`→`, `←`) — do not replace with icons.

## Copy voice

- Tool UIs are **German**; landing page is **English**. Keep this split.
- German copy uses the friendly `du`-form (`Fülle den Inhalt aus…`, `keine Daten verlassen deinen Browser`).
- Eyebrows are short, uppercase, generous tracking. `Projects`, `Tool`, `Get in touch`, `Werkzeuge.`
- Privacy is a recurring promise — when a tool runs locally, say so explicitly.
- Em-dashes (`—`) over hyphens for parentheticals. Use the HTML entity `&mdash;` in JSX strings.

## Do / Don't checklist

Before shipping a new surface:

- [ ] Background is `bg-black`, type is white-on-black, no hue introduced.
- [ ] Headlines use Rubik Mono One (default), everything else is explicit `font-sans`.
- [ ] All horizontal padding is `px-6 sm:px-8 md:px-16 lg:px-24`.
- [ ] Section eyebrow uses `text-white/30 text-xs font-sans tracking-[0.2em] uppercase`.
- [ ] Cards use `rounded-2xl`, `backdrop-blur-sm`, lift `-4px` on hover, border softens to `white/20`.
- [ ] Reveal animations use the shared `ease = [0.22, 1, 0.36, 1]`.
- [ ] Tools share `labelClass` / `inputClass` / `buttonClass` (extract a shared module if duplication appears).
- [ ] One primary CTA per page (`bg-white text-black`). Everything else is ghost / chip.
- [ ] German copy on tools, English on landing — `du`-form, em-dash, privacy callout where it applies.
- [ ] No new fonts, no new colors, no icon libraries, no `console.log`.
