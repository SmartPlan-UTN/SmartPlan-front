# skills/

SmartPlan project conventions, written for both people and AI agents (Claude,
Codex, Copilot) to read.

## Contents

| Directory | Contains | Scope |
|---|---|---|
| `00-project/` | What SmartPlan is, its goal, scope, modules, team, stack | Shared |
| `01-domain/` | Entities, 62 use cases, screens, glossary | Shared |
| `02-git-flow/` | Branches, protection, PRs, commit messages, templates, and Definition of Done | Shared |
| `03-frontend/` | Next.js 16, Tailwind, visual guide, API consumption | This repo only |
| `04-quality/` | ESLint, active rules, what to do about an error | This repo only |
| `05-architecture/` | Components, communication, technologies, environments | Shared |
| `06-design-system/` | EMBER tokens, typography, primitives, logos, brand voice | This repo only |
| `07-testing/` | Vitest, React Testing Library, component and hook tests | This repo only |

**Shared** means the file is identical in `SmartPlan-front` and
`SmartPlan-back`. If you modify one, replicate the change in the other
repository.

## How each tool consumes it

None of the three read this folder on their own: they all enter through a
root file that points here.

| Tool | File it reads |
|---|---|
| Claude Code | `CLAUDE.md` → `@AGENTS.md` |
| Codex | `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |

All three point to the same content, so **`AGENTS.md` is the source of
truth** and this folder holds the detail.

> If you want Claude Code to load these files as native (auto-discoverable)
> skills, copy or link them under `.claude/skills/<name>/SKILL.md`. They
> already have the `name` / `description` frontmatter that format requires.

## When adding a new skill

1. Create the folder with a numeric prefix and a `SKILL.md` inside.
2. Add `name` and `description` frontmatter. The description must state
   **when** to consult the file, not just what it contains.
3. Add it to the table above and to `AGENTS.md`'s table.
4. If it's shared, replicate it in the other repository.

## Source

The content comes from `SmartPlan.md`, the Final Project document (~3800
lines). It's an OCR of a PDF, so it has noise. Data that remained ambiguous
is flagged in each file. When in doubt, verify against the original
document.
