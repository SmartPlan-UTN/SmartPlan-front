# SmartPlan Front

SmartPlan frontend — Final Project 2026, UTN Facultad Regional Mendoza. The
backend lives in [`SmartPlan-back`](https://github.com/SmartPlan-UTN/SmartPlan-back).

## Requirements

- **Node 24.** The version is set in [`.nvmrc`](.nvmrc) and in `package.json`'s
  `devEngines`. With nvm on macOS or Linux, `nvm use` is enough; nvm-windows
  doesn't read `.nvmrc`, so there you need to install and activate 24 by
  hand. It's not a whim: pnpm 11 won't start below Node 22.13, and the error
  it throws doesn't explain why (`ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`).
- **pnpm** doesn't need to be installed by hand: the version comes from
  `packageManager` in `package.json` and pnpm switches to it automatically.

## How to Work in This Repository

| | Where |
|---|---|
| Project conventions | [`skills/`](skills/) — start with [`00-project`](skills/00-project/SKILL.md) |
| Branches, commits, and PRs | [`skills/02-git-flow/SKILL.md`](skills/02-git-flow/SKILL.md) |
| **What "done" means** | [`skills/02-git-flow/DEFINITION-OF-DONE.md`](skills/02-git-flow/DEFINITION-OF-DONE.md) |
| Status of each feature | [`TRACKING.md`](TRACKING.md) |

In short:

1. Open the issue with the matching template: **use case** for what comes
   out of the traceability matrix, **bug** for something that already
   exists and is broken. Foundational work (tooling, configuration,
   documentation) goes in a blank issue, with the id in brackets.
2. Branch off `develop`: `SMART-<id>-<kebab-case-description>`.
   **Never commit directly to `main` or `develop`**: they're protected.
3. Before opening the PR, `pnpm lint`, `pnpm test`, and `pnpm build` must
   all be green.
4. Open the PR **against `develop`**. The template already includes the
   three sections —what it does, how to test it, what's out of scope—, the
   `Closes #NN`, and the Definition of Done checklist. It needs
   **2 approvals**.
5. Update your row in `TRACKING.md`.

```bash
pnpm install      # install dependencies
pnpm dev          # development server
pnpm build        # production build
pnpm lint         # static analysis
pnpm lint:fix     # auto-fix what's fixable
pnpm test         # unit tests, a single run
pnpm test:watch   # unit tests in watch mode
```

## Testing

Unit tests use Vitest, React Testing Library, and jsdom. They're placed next
to the code with the `.test.ts` or `.test.tsx` suffix; `Button.test.tsx` and
`useToggle.test.ts` are the initial templates for components and hooks.

The full conventions are in
[`skills/07-testing/SKILL.md`](skills/07-testing/SKILL.md). There's no
global coverage threshold or end-to-end infrastructure for the frontend yet.

## Structure and Routes

```
src/app/
├── (auth)/      login, signup, and password recovery — no navbar
├── (main)/      screens with a navbar
│   ├── page.tsx     home
│   ├── explore/
│   └── (private)/   favorites, history, profile, preferences — require a session
└── admin/       administration panel
```

A new screen is protected **by where it lives**: if it goes inside
`(private)`, the group's layout wraps it in `ProtectedRoute`, which sends
the user to login with `?redirect=<route>` when there's no session.
Navigation destinations and URLs come from
[`src/lib/routes.ts`](src/lib/routes.ts); they're never hand-written in
`<Link>`.

Logging in (CU1) opens a session against `POST /sessions` and keeps the
access token in memory only — never in `localStorage` or a readable cookie.
It survives a page reload through `POST /sessions/refresh`, which rehydrates
it from the `httpOnly` refresh cookie the backend sets on login.

The details —navbar, session, where each screen lives— are in
[`skills/03-frontend/SKILL.md`](skills/03-frontend/SKILL.md).

## Typography

The project's typeface is **Bricolage Grotesque**, self-hosted with
[`next/font/local`](https://nextjs.org/docs/app/api-reference/components/font).
The type scale is in
[`skills/06-design-system/SKILL.md`](skills/06-design-system/SKILL.md).

- The variable font file lives at
  [`src/app/fonts/BricolageGrotesque-VariableFont_opsz_wdth_wght.ttf`](src/app/fonts/BricolageGrotesque-VariableFont_opsz_wdth_wght.ttf),
  downloaded from [Google Fonts](https://fonts.google.com/specimen/Bricolage+Grotesque)
  under the [SIL Open Font License](https://openfontlicense.org/).
- It's loaded once in [`src/app/layout.tsx`](src/app/layout.tsx) with
  `weight: "200 800"`: since it's a variable font, that enables every
  weight in the range instead of a fixed set.
- The loader exposes the family as the CSS variable
  `--font-bricolage-grotesque`, mapped to Tailwind's `--font-sans` in
  [`src/app/globals.css`](src/app/globals.css). It's used with the
  `font-sans` utility and any weight between `font-extralight` (200) and
  `font-extrabold` (800).
- Geist and Geist Mono, which came from the `create-next-app` template,
  were removed.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
