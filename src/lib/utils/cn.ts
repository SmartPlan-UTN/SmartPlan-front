/**
 * Joins CSS classes, discarding empty strings, `null`, `undefined`, and `false`.
 *
 * Useful for composing a conditional class without cluttering the JSX:
 *
 * ```ts
 * cn(styles.link, active && styles.activeLink, className)
 * ```
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
