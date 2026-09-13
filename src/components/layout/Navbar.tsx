"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { Icon, LoadingDots, Logo, MoodBackground } from "@/components/ui";
import { isActiveRoute, ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { NavLink } from "./NavLink";
import { CREATE_PLAN_LINK, MAIN_LINKS, MOBILE_LINKS } from "./links";
import { UserMenu } from "./UserMenu";
import styles from "./layout.module.css";

// How long the Explorar transition stays up — purely decorative (no real
// fetch to wait on here, unlike a search result), so it's just a fixed
// delay before `router.push`'s navigation is revealed.
const EXPLORE_TRANSITION_MS = 900;

/**
 * The one bottom-bar tab that owns the current route. `isActiveRoute` alone
 * isn't enough there: `/plans/create` also falls inside `/plans`, which lit
 * up Crear plan and Mis planes at once. The longest matching `href` wins, so
 * a nested destination with its own tab takes precedence over its parent.
 */
function activeMobileHref(currentRoute: string): string | undefined {
  return MOBILE_LINKS.filter((link) => isActiveRoute(currentRoute, link.href))
    .map((link) => link.href)
    .sort((a, b) => b.length - a.length)[0];
}

/**
 * 60px navigation bar (`--navbar-h`), fixed at the top with a
 * `backdrop-filter` over the content, as required by the EMBER design system.
 *
 * Always the light variant (cream, ink logo, dark text): the
 * SmartPlanSystemDesign prototype's `Navbar` component still has a `dark`
 * prop, but the shipped build hardcodes it to light for every screen. The
 * hairline below the bar stays transparent until the page scrolls, same as
 * the prototype.
 *
 * Below 900px the top bar keeps identity and session only; the frequent
 * destinations move to a persistent, thumb-reachable bottom bar.
 *
 * Explorar also gets a full-screen "Armando tu plan perfecto..." transition
 * (matching `Results.jsx`'s own loading state) when it's clicked from
 * anywhere else in the app — not a per-screen loading state, a navigation
 * one, so it lives here rather than inside the Explorar screen itself.
 * Switching between Explorar's own Actividades/Planes tabs never touches
 * this link, so it never re-triggers.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const currentRoute = usePathname();
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileActiveHref = activeMobileHref(currentRoute);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!transitioning || !isActiveRoute(currentRoute, ROUTES.explore)) return;

    const timer = window.setTimeout(() => {
      setTransitioning(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentRoute, transitioning]);

  // `Navbar` is mounted once by the `(main)` layout and never unmounts on
  // in-app navigation, so this is mostly a safety net (a hard reload during
  // the transition, say) rather than something that fires in normal use.
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  function handleExploreClick(event: MouseEvent<HTMLAnchorElement>) {
    // A modified click (new tab, new window) should behave like a plain
    // link — only a genuine in-app left-click gets the transition.
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    // Already on (or inside) Explorar: e.g. clicking the link again, or the
    // Actividades/Planes tabs, which never call this handler in the first
    // place. Nothing to transition into.
    if (isActiveRoute(currentRoute, ROUTES.explore)) {
      return;
    }

    event.preventDefault();
    setTransitioning(true);
    router.push(ROUTES.explore);
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null;
      setTransitioning(false);
    }, EXPLORE_TRANSITION_MS);
  }

  return (
    <>
      <header className={cn(styles.navbar, scrolled && styles.navbarScrolled)}>
        <div className={styles.navbarInner}>
          <Link href={ROUTES.home} className={styles.brand}>
            <Logo variant="ink" kind="full" height={22} priority />
          </Link>

          <nav className={styles.nav} aria-label="Navegación principal">
            {MAIN_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                onClick={link.href === ROUTES.explore ? handleExploreClick : undefined}
              />
            ))}
          </nav>

          <div className={styles.actions}>
            <Link href={CREATE_PLAN_LINK.href} className={styles.createPlanNavBtn}>
              <Icon name={CREATE_PLAN_LINK.icon} size={15} aria-hidden="true" />
              {CREATE_PLAN_LINK.label}
            </Link>

            <UserMenu />
          </div>
        </div>
      </header>

      <nav className={styles.mobileNav} aria-label="Navegación móvil">
        {MOBILE_LINKS.map((link) => {
          const active = link.href === mobileActiveHref;
          const isCreate = link.href === CREATE_PLAN_LINK.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                styles.mobileNavLink,
                active && styles.mobileNavLinkActive,
                isCreate && styles.mobileNavCreate,
              )}
              aria-current={active ? "page" : undefined}
              onClick={link.href === ROUTES.explore ? handleExploreClick : undefined}
            >
              <span className={styles.mobileNavIcon}>
                <Icon name={link.icon} size={isCreate ? 22 : 20} aria-hidden="true" />
              </span>
              <span className={styles.mobileNavLabel}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Portaled to `document.body`, not rendered as a child of `<header>`
          above: `.navbar` sets `backdrop-filter` for its sticky-blur
          effect, which establishes a containing block for `position: fixed`
          descendants — the same bug `UserMenu`'s `LogoutConfirmModal` hit,
          fixed with the same portal. */}
      {transitioning
        ? createPortal(
            <div className={styles.exploreTransition} role="status" aria-live="polite">
              {/* A second `MoodBackground` instance, not the app-wide one
                  `AppBackground` already mounts: this overlay sits *above*
                  that ambient canvas and everything else in `<main>`, opaque
                  on purpose (the destination is already navigating
                  underneath — a see-through overlay would let it peek
                  through before the illusion finishes), so nothing behind
                  it would otherwise be visible here. Same reasoning
                  `ResultsLoading` in `Results.jsx` has its own
                  `<MoodBackground />` rather than assuming one from a
                  parent. It fills the whole overlay, unlike the app-wide
                  canvas' low horizon band. Temporary (unmounts with the
                  overlay in `EXPLORE_TRANSITION_MS`), so it doesn't compete
                  with the ambient canvas' own tide continuity. */}
              <MoodBackground />
              <div className={styles.exploreTransitionContent}>
                <LoadingDots
                  title="Armando tu plan perfecto..."
                  label="Buscando lo mejor cerca tuyo"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
