import Link from "next/link";

import { Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import styles from "./footer.module.css";

/**
 * Every link resolves to a route that exists in `ROUTES`. No column of
 * placeholders for pages the product does not have — a footer full of
 * dead links is the fastest way to make a real product look like a
 * template.
 */
const GROUPS = [
  {
    title: "Descubrir",
    links: [
      { label: "Inicio", href: ROUTES.home },
      { label: "Explorar", href: ROUTES.explore },
      { label: "Mapa", href: ROUTES.exploreMap },
    ],
  },
  {
    title: "Tu cuenta",
    links: [
      { label: "Mi perfil", href: ROUTES.profile },
      { label: "Favoritos", href: ROUTES.favorites },
      { label: "Historial", href: ROUTES.history },
      { label: "Preferencias", href: ROUTES.preferences },
    ],
  },
  {
    title: "Empezar",
    links: [
      { label: "Crear una cuenta", href: ROUTES.signup },
      { label: "Iniciar sesión", href: ROUTES.login },
    ],
  },
] as const;

/**
 * The application's footer.
 *
 * Lives in `layout/` rather than with the landing because it is meant to
 * be reused across smartplan — it is a shell component, not a landing
 * section.
 *
 * The oversized wordmark bled off the bottom edge is doing real work: it
 * closes the page with the brand at a size nothing else on the site uses,
 * so the end of a scroll feels like an ending rather than like running
 * out of content. It is `aria-hidden` because the same word is already
 * announced by the logo above it.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.shell}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Logo variant="white" kind="full" height={28} />
            <p className={styles.pitch}>
              Un buscador que entiende lo que tenés ganas de hacer y lo devuelve
              como una salida posible.
            </p>
            <span className={styles.place}>
              <span className={styles.placeDot} aria-hidden="true" />
              Hecho en Mendoza, Argentina
            </span>
          </div>

          <nav className={styles.nav} aria-label="Navegación del pie de página">
            {GROUPS.map((group) => (
              <div key={group.title} className={styles.group}>
                <p className={styles.groupTitle}>{group.title}</p>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className={styles.link}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className={styles.bottom}>
          <span>© 2026 smartplan</span>
        </div>
      </div>

      <p className={styles.wordmark} aria-hidden="true">
        smartplan
      </p>
    </footer>
  );
}
