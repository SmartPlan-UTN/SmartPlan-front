/**
 * Une classes CSS descartando las vacías, `null`, `undefined` y `false`.
 *
 * Sirve para componer una clase condicional sin ensuciar el JSX:
 *
 * ```ts
 * cn(styles.link, active && styles.linkActivo, className)
 * ```
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
