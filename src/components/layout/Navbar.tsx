"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { Icon, LoadingDots, Logo, MoodBackground } from "@/components/ui";
import { isActiveRoute, ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { NavLink } from "./NavLink";
import { MAIN_LINKS } from "./links";
import { UserMenu } from "./UserMenu";
import styles from "./layout.module.css";

// How long the Explorar transition stays up — purely decorative (no real
// fetch to wait on here, unlike a search result), so it's just a fixed
// delay before `router.push`'s navigation is revealed.
const EXPLORE_TRANSITION_MS = 3000;

/**
 * 60px navigation bar (`--navbar-h`), fixed at the top with a
 * `backdrop-filter` over the content, as required by the EMBER design system.
 *
 * Always the light variant (cream, ink logo, dark text): the
 * SmartPlanSystemDesign prototype's `Navbar` component still has a `dark`
 * prop, but the shipped build hardcodes it to light for every screen. The
 * border below the bar stays transparent until the page scrolls, same as
 * the prototype.
 *
 * Below 900px the links collapse into a dropdown panel; the user menu
 * stays visible at every size.
 *
 * Explorar also gets a full-screen "Armando tu plan perfecto..." transition
 * (matching `Results.jsx`'s own loading state) when it's clicked from
 * anywhere else in the app — not a per-screen loading state, a navigation
 * one, so it lives here rather than inside the Explorar screen itself.
 * Switching between Explorar's own Actividades/Planes tabs never touches
 * this link, so it never re-triggers.
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const currentRoute = usePathname();
  const [menuRoute, setMenuRoute] = useState(currentRoute);
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigating has to close the panel: otherwise the new screen appears
  // covered. This is adjusted during render instead of with an effect,
  // which would trigger a second render with the panel still open:
  // https://react.dev/learn/you-might-not-need-an-effect
  if (currentRoute !== menuRoute) {
    setMenuRoute(currentRoute);
    setMenuOpen(false);
  }

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

          <Link href={ROUTES.createPlan} className={styles.createPlanNavBtn}>
            <Icon name="plus" size={15} aria-hidden="true" />
            <span className={styles.createPlanNavLabel}>Crear plan</span>
          </Link>

          <UserMenu />

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="collapsible-navigation"
            aria-label={menuOpen ? "Cerrar la navegación" : "Abrir la navegación"}
            onClick={() => {
              setMenuOpen((isOpen) => !isOpen);
            }}
          >
            <Icon name={menuOpen ? "x" : "menu"} size={20} />
          </button>
        </div>

        {menuOpen ? (
          <nav
            id="collapsible-navigation"
            className={styles.mobilePanel}
            aria-label="Navegación principal plegable"
          >
            {MAIN_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                variant="option"
                onClick={link.href === ROUTES.explore ? handleExploreClick : undefined}
                onNavigate={() => {
                  setMenuOpen(false);
                }}
              />
            ))}
            <NavLink
              href={ROUTES.createPlan}
              label="Crear plan"
              icon="plus"
              variant="option"
              onNavigate={() => {
                setMenuOpen(false);
              }}
            />
          </nav>
        ) : null}
      </header>

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
                  `<MoodBackground mood="idle" />` rather than assuming one
                  from a parent. Temporary (unmounts with the overlay in
                  `EXPLORE_TRANSITION_MS`), so it doesn't compete with the
                  ambient canvas' own tide continuity. */}
              <MoodBackground mood="idle" />
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
