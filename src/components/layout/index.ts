/**
 * Cáscara de la aplicación: navegación y containeres de pantalla.
 *
 * Importar siempre desde `@/components/layout`.
 */

export { AppShell, type AppShellProps } from "./AppShell";
export { Container, type ContainerProps } from "./Container";
export { NavLink, type NavLinkProps, type LinkVariant } from "./NavLink";
export {
  MAIN_LINKS,
  USER_LINKS,
  type NavigationLink,
} from "./links";
export { UserMenu } from "./UserMenu";
export { Navbar } from "./Navbar";
export {
  PendingScreen,
  type PendingScreenProps,
  type ScreenTone,
} from "./PendingScreen";
