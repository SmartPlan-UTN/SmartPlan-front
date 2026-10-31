import { claimUiKitElements } from "@/lib/api";

/**
 * Client side of SmartPlan's USD 0 guard for Google Places UI Kit: an
 * element is only instantiated after the backend granted it an allowance
 * (each instantiation is billed by Google; the backend caps grants below the
 * free monthly quota). Requests made in the same tick are batched into one
 * claim, and once the backend says the month is exhausted no more claims are
 * sent for the rest of the session.
 */

const BATCH_DELAY_MS = 30;
const MAX_PER_CLAIM = 24;

type Resolver = (granted: boolean) => void;

let queue: Resolver[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let exhausted = false;

async function flush(screen: string): Promise<void> {
  timer = null;
  const waiting = queue;
  queue = [];
  while (waiting.length > 0) {
    const batch = waiting.splice(0, MAX_PER_CLAIM);
    if (exhausted) {
      batch.forEach((resolve) => resolve(false));
      continue;
    }
    try {
      const { granted, remaining } = await claimUiKitElements(
        batch.length,
        screen,
      );
      if (remaining <= 0) exhausted = true;
      batch.forEach((resolve, index) => resolve(index < granted));
    } catch {
      // No allowance, no element: the card keeps SmartPlan's artwork.
      batch.forEach((resolve) => resolve(false));
    }
  }
}

/** Resolves `true` when this element may be instantiated. */
export function requestUiKitAllowance(screen = "explore"): Promise<boolean> {
  if (exhausted) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    queue.push(resolve);
    if (timer === null) {
      timer = setTimeout(() => {
        void flush(screen);
      }, BATCH_DELAY_MS);
    }
  });
}

/** Test hook: forget the session state. */
export function resetUiKitAllowanceForTests(): void {
  queue = [];
  if (timer !== null) clearTimeout(timer);
  timer = null;
  exhausted = false;
}
