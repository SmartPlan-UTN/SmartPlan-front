/**
 * Application shell: navigation and screen containers.
 *
 * Always import from `@/components/layout`.
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
export { MoodBackground, type Mood, type MoodBackgroundProps } from "./MoodBackground";
export {
  PendingScreen,
  type PendingScreenProps,
  type ScreenTone,
} from "./PendingScreen";
