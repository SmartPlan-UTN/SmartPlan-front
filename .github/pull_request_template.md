<!--
PR base: develop. Never main.
Title: same as the issue's, with the id in brackets. E.g.: [CU17] Generar plan automatico
-->

Closes #

## What it does

<!-- What changes from the point of view of someone using the application, and which CU / task it covers.
     If there's no associated CU (tooling, configuration, documentation), say so. -->

## How to test it

<!-- Concrete commands and what to look at. Whoever reviews this needs to be able to follow it without asking you anything.
     If the backend needs to be running, or an environment variable is needed, say so here. -->

```bash
git switch <branch>
node --version    # 24.x, see .nvmrc
pnpm install
pnpm lint
pnpm test
pnpm build
```

1.
2.

## What's out of scope

<!-- What was left out of scope, and why. If everything was included, write "Nothing".
     If you left technical debt behind, also link the issue that follows up on it. -->

---

## Definition of Done

Full criteria in [`skills/02-git-flow/DEFINITION-OF-DONE.md`](https://github.com/SmartPlan-UTN/SmartPlan-front/blob/develop/skills/02-git-flow/DEFINITION-OF-DONE.md).

- [ ] The branch starts from `develop` and the PR targets `develop`
- [ ] `pnpm lint` with no errors
- [ ] `pnpm test` green
- [ ] `pnpm build` passes
- [ ] The issue's acceptance criteria are met
- [ ] No hardcoded credentials, tokens, or URLs
- [ ] Styles use design system tokens, no hand-written hex values
- [ ] Loading, error, and empty states are covered (if the screen consumes the API)
- [ ] [`TRACKING.md`](https://github.com/SmartPlan-UTN/SmartPlan-front/blob/develop/TRACKING.md) updated: status, branch, and PR
- [ ] Documented where relevant (`README.md` or `skills/`)
