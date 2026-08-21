<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

> The block above is maintained by Next.js tooling. Don't edit it by hand or
> remove its markers.

# SmartPlan Front - AI Agent Instructions

This file is the entry point. It's read by Claude Code (via `CLAUDE.md`),
Codex (`AGENTS.md`), and GitHub Copilot (via `.github/copilot-instructions.md`).

## What SmartPlan Is

A web application that automatically generates personalized recreational
plans based on budget, location, available time, outing type, and user
preferences. Final Project 2026 — UTN Facultad Regional Mendoza.

This repository is the **frontend**. The backend lives in `SmartPlan-back`
(NestJS + REST API + JWT).

## Before Writing Code, Read This

| File | When to read it |
|---|---|
| [`skills/00-project/SKILL.md`](skills/00-project/SKILL.md) | Always first: what the system is, scope, modules, team, stack |
| [`skills/01-domain/SKILL.md`](skills/01-domain/SKILL.md) | Before naming tables, endpoints, routes, types, or components |
| [`skills/02-git-flow/SKILL.md`](skills/02-git-flow/SKILL.md) | Before any git operation and before opening an issue or PR |
| [`skills/02-git-flow/DEFINITION-OF-DONE.md`](skills/02-git-flow/DEFINITION-OF-DONE.md) | Before declaring a task complete |
| [`skills/03-frontend/SKILL.md`](skills/03-frontend/SKILL.md) | Before writing a component or a page |
| [`skills/04-quality/SKILL.md`](skills/04-quality/SKILL.md) | Before disabling a lint rule or silencing a warning |
| [`skills/05-architecture/SKILL.md`](skills/05-architecture/SKILL.md) | Before adding a service, an external integration, or a background process |
| [`skills/06-design-system/SKILL.md`](skills/06-design-system/SKILL.md) | Before writing a style, choosing a color, or building a component |
| [`skills/07-testing/SKILL.md`](skills/07-testing/SKILL.md) | Before adding or modifying component and hook tests |
| [`TRACKING.md`](TRACKING.md) | To find out the status of each feature |

## Non-Negotiable Rules

1. **Never commit to `main` or `develop`.** They're protected and require a
   PR with 2 approvals. Always work on a branch that starts from `develop`.
2. **Write all code in English.** This includes files, folders,
   identifiers, technical routes, API contracts, and the database schema.
   User-visible text may remain in Spanish. See `skills/00-project/` and
   `skills/01-domain/`.
3. **Use pnpm**, never npm or yarn, and **Node 24** (`.nvmrc`). Below Node
   22.13 pnpm won't even start.
4. **Run `pnpm lint`, `pnpm test`, and `pnpm build` before declaring a change complete.**
5. **Every promise is handled.** ESLint has `no-floating-promises` set to error.
6. **No hardcoded credentials, tokens, or URLs.** Use environment variables.
7. **Reference the use case (CU) in commits and PRs** when the task has one.

## Repository Status

The **foundations** are in place: design system tokens and primitives,
domain types, an HTTP client with JWT, testing, and —since F19— the folder
structure, the layout with the navbar, and protected routes.

**No use case is implemented yet**: the screens exist as placeholders
(`PendingScreen`) so the navigation can be fully exercised. Before assuming
something exists, check the code and look at [`TRACKING.md`](TRACKING.md).

## Commands

```bash
pnpm install      # install dependencies
pnpm dev          # development server
pnpm build        # production build
pnpm lint         # static analysis
pnpm lint:fix     # auto-fix what's fixable
pnpm test         # unit tests, a single run
pnpm test:watch   # unit tests in watch mode
```

## When You Finish a Task

Check the [Definition of Done](skills/02-git-flow/DEFINITION-OF-DONE.md)
before calling it done. The short checklist is preloaded in the PR.

Update the corresponding row in [`TRACKING.md`](TRACKING.md): status, date,
branch, and PR. That's what lets the next agent (or the next person) pick
up without rereading the whole history.
