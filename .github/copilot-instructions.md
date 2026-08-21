# SmartPlan Front - GitHub Copilot Instructions

The source of truth for this repository's conventions is
[`AGENTS.md`](../AGENTS.md) and the [`skills/`](../skills/) folder. **Read them
before proposing code.** What follows is the operational summary.

## ⚠️ Next.js 16

This repository uses **Next.js 16.2.3**, with breaking changes compared to
previous versions. Consult `node_modules/next/dist/docs/` before using any
Next.js API. Don't suggest `next lint`: it was removed in version 16.

## Context

SmartPlan automatically generates personalized recreational plans (budget,
location, time, outing type, preferences). This repo is the frontend; the
backend is `SmartPlan-back` (NestJS, REST API, JWT).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5 (`strict`) · Tailwind CSS 4 ·
axios · lucide-react · ESLint 9 · **pnpm** as the package manager.

## Conventions

- **All code and technical names are in English.** Entities are called
  `plan`, `plan_detail`, `activity`, `place`, `collection`, `rating`,
  `feedback`. In TypeScript, `PascalCase`: `PlanDetail`. User-visible text
  may remain in Spanish.
- Components in `PascalCase`, hooks with a `use` prefix, route folders in
  `kebab-case`.
- Import with the `@/*` alias instead of long relative paths.
- API calls go through the centralized axios client in `src/lib/api/`.
- The API URL goes in `NEXT_PUBLIC_API_URL`. Never hardcode URLs, tokens, or
  credentials.

## Lint Rules Set to Error

Copilot must not suggest code that violates these:

- `no-floating-promises` — every promise is handled with `await` or `.catch()`.
- `no-explicit-any` — no `any`.
- `eqeqeq` — always `===` / `!==`.
- `no-var`, `prefer-const`.
- `react-hooks/exhaustive-deps` — complete dependencies in `useEffect`,
  `useMemo`, and `useCallback`.
- `@next/next/no-img-element` — use `<Image>` from `next/image`, never `<img>`.
- `@next/next/no-html-link-for-pages` — use `<Link>` from `next/link` for
  internal routes.

## Git

`main` and `develop` are protected: they require a PR with 2 approvals.
Never suggest committing directly to them. Work branches start from
`develop` and are named `SMART-<ticket-id>-<description>`, where the id is
the one in brackets in the issue title (`[CU17]`, `[F21]`).

Commit messages are in English, in the imperative mood, referencing the use case:

```
Implement automatic plan generation (CU17)
```

Issues are opened with the templates in `.github/ISSUE_TEMPLATE/` and PRs
use `.github/pull_request_template.md`: what it does, how to test it, what's
out of scope, and `Closes #NN`. A task is done when it satisfies
`skills/02-git-flow/DEFINITION-OF-DONE.md`, not when the code just works.

## Design system

Tokens in `src/styles/tokens.css`, full guide in
`skills/06-design-system/SKILL.md`.

**Never suggest a hand-written hex color.** Use the CSS variables:
`--ember #E85D20` (primary) · `--char #1A1109` (text and dark surfaces) ·
`--cream #F5F0E8` (background) · `--surface-card #FFFCF8` (cards, never pure white) ·
`--electric #2B5BFF` (AI) · `--gold #FFD166` (ratings) · `--hairline #E2DDD5` ·
`--success #22C06B` · `--warning #F5A623` · `--error #F04040`.

Single typeface: **Bricolage Grotesque** (self-hosted in `src/app/fonts/`).
Classes `.sp-display` `.sp-h1` ... `.sp-label`.

Radii: buttons `10px`, cards `16px`, chips and badges `99px`.
Spacing on a scale of 4 (`--s-1` through `--s-8`).

Icons: `lucide-react`, always outline, stroke 1.75-2. No emoji.

Logos in `public/brand/`: `ink` variants for light backgrounds, `white` for dark.

The brand is written `smartplan` in lowercase, never "SmartPlan", in interface text.
