/**
 * Application route map.
 *
 * Routes are written once here and referenced from `<Link>`, redirects, and
 * tests. A loose string in a component breaks silently when the folder is
 * renamed; a constant breaks the build instead.
 *
 * Route folders use `kebab-case` and English, as required by
 * `skills/01-domain/`.
 */
export const ROUTES = {
  home: "/",
  explore: "/explore",
  exploreMap: "/explore/map",
  plans: "/plans",
  favorites: "/favorites",
  history: "/history",
  profile: "/profile",
  preferences: "/preferences",
  login: "/login",
  signup: "/signup",
  recoverPassword: "/recover-password",
  admin: "/admin",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/** `/explore/:id` — activity detail (CU14). */
export function activityDetailRoute(id: number): string {
  return `${ROUTES.explore}/${id}`;
}

/** `/plans/:id` — plan detail (CU13). */
export function planDetailRoute(id: number): string {
  return `${ROUTES.plans}/${id}`;
}

/** Name of the query parameter that stores where to return after logging in. */
export const REDIRECT_PARAM = "redirect";

/**
 * Validates a redirect destination before navigating to it.
 *
 * Only internal routes are accepted: a value like `https://other-site.com` or
 * `//other-site.com` in `?redirect=` would turn the login page into an open
 * redirector to any domain.
 *
 * @param destination Value received from the query string, or `null` if none was provided.
 * @returns The internal route, or `null` if the value is not safe.
 */
export function safeDestination(destination: string | null | undefined): string | null {
  if (!destination || !destination.startsWith("/") || destination.startsWith("//")) {
    return null;
  }

  return destination;
}

/**
 * Builds the login URL while preserving the route the visitor was redirected from.
 *
 * Home is not preserved: it's already the default place to return to, so
 * adding it to the parameter would only clutter the URL.
 *
 * @param destination Route to return to once the session is started.
 * @returns `/login` with the `redirect` parameter when the destination is valid.
 */
export function loginRoute(destination?: string | null): string {
  const route = safeDestination(destination);

  if (!route || route === ROUTES.login || route === ROUTES.home) {
    return ROUTES.login;
  }

  return `${ROUTES.login}?${REDIRECT_PARAM}=${encodeURIComponent(route)}`;
}

/**
 * Indicates whether a route is nested under another, to mark the active nav
 * link. `/plans` does not activate `/plans-archive`, but `/plans/7` does
 * activate `/plans`.
 */
export function isActiveRoute(currentRoute: string, href: string): boolean {
  if (href === ROUTES.home) {
    return currentRoute === ROUTES.home;
  }

  return currentRoute === href || currentRoute.startsWith(`${href}/`);
}
