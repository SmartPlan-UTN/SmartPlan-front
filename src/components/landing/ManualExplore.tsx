"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";

import { Icon, type IconName } from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { useEntrance, EASE_OUT, viewportOnce } from "@/lib/motion";

import { Reveal } from "./Reveal";
import styles from "./manual-explore.module.css";

const CAPABILITIES: readonly { icon: IconName; label: string }[] = [
  { icon: "search", label: "Búsqueda" },
  { icon: "tag", label: "Categorías" },
  { icon: "wallet", label: "Precio" },
  { icon: "star", label: "Rating" },
  { icon: "map-pin", label: "Cercanía y mapa" },
  { icon: "sliders-horizontal", label: "Ordenamiento" },
];

const LIST: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06 } },
};

const ROW: Variants = {
  hidden: { opacity: 0, x: -12 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

export function ManualExplore() {
  const { active } = useEntrance();

  return (
    <section className={styles.section} aria-labelledby="manual-explore-title">
      <div className={styles.shell}>
        <Reveal className={styles.copy}>
          <h2 id="manual-explore-title">¿Preferís buscar vos?</h2>
          <p>Explorá lugares con los criterios que ya conocés y armá tu propia salida.</p>
          <Link href={ROUTES.explore} className={styles.link}>
            Explorar lugares
            <Icon name="arrow-right" size={18} aria-hidden="true" />
          </Link>
        </Reveal>
        <motion.ul
          className={styles.capabilities}
          variants={active ? LIST : undefined}
          initial={active ? "hidden" : false}
          whileInView={active ? "shown" : undefined}
          viewport={viewportOnce}
        >
          {CAPABILITIES.map((item) => (
            <motion.li key={item.label} variants={active ? ROW : undefined}>
              <Icon name={item.icon} size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
