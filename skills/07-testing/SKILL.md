---
name: smartplan-testing-frontend
description: How to write and run component and hook tests with Vitest and React Testing Library. Read before adding or modifying frontend tests.
---

# SmartPlan Front - Testing

## Stack

Unit tests use **Vitest**, **React Testing Library**, and **jsdom**. This
combination allows testing the observable behavior of components and hooks
without spinning up the Next.js server.

Vitest doesn't support asynchronous Server Components. Those flows are
tested with end-to-end tests once the project adopts that infrastructure;
client components and synchronous Server Components can be covered with
unit tests.

## Commands

```bash
pnpm test          # a single full run; this is the command CI uses
pnpm test:watch    # reruns affected tests while you work
```

`pnpm lint`, `pnpm test`, and `pnpm build` must all pass before opening a PR.

## Location and naming

Tests are placed next to the code they cover:

```text
src/components/ui/Button.tsx
src/components/ui/Button.test.tsx
src/hooks/useToggle.ts
src/hooks/useToggle.test.ts
```

Use `.test.tsx` when the file renders JSX and `.test.ts` for hooks or logic
without JSX. The shared setup lives in `src/test/setup.ts`; don't repeat
`cleanup` or `jest-dom` configuration in every suite.

Only `.test.ts` and `.test.tsx` run. A file that's checked at compile time
instead of at runtime —like `src/types/catalogs.type-check.ts`— doesn't
carry that suffix, precisely so it's clear `pnpm build` validates it, not
`pnpm test`.

## Components

- Query by role, accessible name, label, or visible text. Avoid
  `data-testid` unless there's no semantic alternative.
- Interact through `userEvent`, since it better reproduces the real
  sequence of events than calling handlers directly.
- Verify visible results and public callbacks, not internal classes or
  implementation details.
- For asynchronous operations, wait for the interaction and use `findBy*`
  or `waitFor` when appropriate. Every promise must be handled.

`Button.test.tsx` is the reference template for rendering, accessible
queries, and a user interaction.

## Modules resolved by the Next compiler

`next/font` doesn't exist outside a Next build. Any test that reaches —even
indirectly— a file that declares a font, like `src/app/layout.tsx`, dies
with `TypeError: default is not a function` and no clue as to why. That's
why `vitest.config.mts` redirects `next/font/local` to
`src/test/mocks/next-font.ts`.

If `next/font/google` is ever imported, it will need its own mock: there,
fonts are named exports and a default export isn't enough.

## Hooks

Use `renderHook` to run the hook and `act` for any operation that updates
its state:

```ts
const { result } = renderHook(() => useToggle());

act(() => {
  result.current[1]();
});
```

Test the initial value, the relevant transitions, and any public option.
`useToggle.test.ts` is the reference template.

## Current scope

F20 sets up unit tests and examples, but doesn't define a global coverage
threshold, snapshots, or end-to-end infrastructure. Adding those policies
requires a separate team decision.
