"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui";
import { rutaActiva } from "@/lib/rutas";
import { cn } from "@/lib/utils";

import styles from "./layout.module.css";

export type VarianteEnlace = "barra" | "opcion";

export interface EnlaceNavProps {
  href: string;
  etiqueta: string;
  icono?: IconName;
  /** `barra` para la navegación horizontal, `opcion` para los desplegables. */
  variante?: VarianteEnlace;
  /** Se ejecuta al navegar; sirve para cerrar el menú que contiene al enlace. */
  onNavegar?: () => void;
}

const CLASE_BASE: Record<VarianteEnlace, string> = {
  barra: styles.enlace,
  opcion: styles.opcion,
};

const CLASE_ACTIVA: Record<VarianteEnlace, string> = {
  barra: styles.enlaceActivo,
  opcion: styles.opcionActiva,
};

/**
 * Enlace de navegación que se marca solo cuando la ruta actual cae dentro de su
 * destino. El estado activo se comunica con `aria-current="page"`, no solo con
 * color: quien navega con lector de pantalla también necesita saber dónde está.
 */
export function EnlaceNav({
  href,
  etiqueta,
  icono,
  variante = "barra",
  onNavegar,
}: EnlaceNavProps) {
  const rutaActual = usePathname();
  const activo = rutaActiva(rutaActual, href);

  return (
    <Link
      href={href}
      className={cn(CLASE_BASE[variante], activo && CLASE_ACTIVA[variante])}
      aria-current={activo ? "page" : undefined}
      onClick={onNavegar}
    >
      {icono ? <Icon name={icono} size={16} /> : null}
      {etiqueta}
    </Link>
  );
}
