---
name: smartplan-quality
description: Static analysis with ESLint — active rules, how to run it, and what to do when an error shows up. Consult before disabling a rule or silencing a warning.
---

# SmartPlan - Quality and Static Analysis

## Tool

**ESLint 9** in *flat config* format (`eslint.config.mjs`), the only format
supported by Next.js 16.

ESLint was chosen because it's the standard analyzer for the
JavaScript/TypeScript ecosystem, has official Next.js integration through
`eslint-config-next`, allows type-aware analysis through
`typescript-eslint`, and runs locally without additional infrastructure
(unlike SonarQube).

## Commands

```bash
pnpm lint         # reports errors and warnings
pnpm lint:fix     # fixes what's auto-fixable
```

**Run `pnpm lint` before opening a PR.** A PR with lint errors shouldn't be merged.

## What's configured

On top of the `eslint-config-next/core-web-vitals` and
`eslint-config-next/typescript` presets, custom rules are added, grouped by category:

| Category | Rules | Why |
|---|---|---|
| Promise handling | `no-floating-promises`, `await-thenable`, `no-misused-promises` | The frontend consumes the API with axios; an unhandled promise silently loses the error |
| Type safety | `no-explicit-any` (error), `no-non-null-assertion` (warn) | `any` voids TypeScript's guarantees |
| Dead code | `no-unused-vars`, `no-debugger`, `no-console`, `no-alert` | Oversights that shouldn't reach a commit |
| Best practices | `eqeqeq`, `no-var`, `prefer-const`, `no-case-declarations` | Avoid implicit coercions and accidental scope |
| React / Next.js | `exhaustive-deps` (raised to error), `no-img-element`, `no-html-link-for-pages` | Stale closures and Core Web Vitals metrics |

The `eslint.config.mjs` file has each rule commented with the problem it
prevents. **Read it before touching it.**

## Type-aware analysis

The configuration enables `projectService`, which makes ESLint query the
TypeScript compiler. That lets it catch errors that syntax-only analysis
can't see — the typical case is a promise without `await`.

Practical consequence: the root `.mjs` files are excluded from type-aware
analysis because they don't belong to the TypeScript project. If you add a
new configuration file at the root and the parser fails, this is why.

## What to do about a lint error

In order of preference:

1. **Fix the code.** This is the right call in the vast majority of cases.
2. If the variable is intentionally unused, prefix it with `_`:
   ```ts
   } catch (_error) {
   ```
3. If a line genuinely needs to be ignored, use a disable **with a written reason**:
   ```ts
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- library X doesn't export the type
   ```

**Don't disable a rule in `eslint.config.mjs` just to make it stop bothering
you.** If a rule generates systematic noise, discuss it in the PR and
document the reason for the change.

## Conventions ESLint doesn't check

- Code, files, and identifiers in English (see `skills/01-domain/`).
- No hardcoded credentials or URLs: everything through environment variables.
- No debug `console.log` calls (ESLint warns, but only as a warning).
- Small components with a single clear responsibility.
