/**
 * Une clases CSS descartando las vacías, `null`, `undefined` y `false`.
 *
 * Sirve para componer una clase condicional sin ensuciar el JSX:
 *
 * ```ts
 * cn(styles.enlace, activo && styles.enlaceActivo, className)
 * ```
 */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(" ");
}
