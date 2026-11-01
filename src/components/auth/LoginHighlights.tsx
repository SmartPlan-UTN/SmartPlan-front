import { Icon, type IconName } from "@/components/ui";

import styles from "./LoginHighlights.module.css";

const HIGHLIGHTS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "sparkles",
    title: "Planes a tu medida",
    description: "Según tu presupuesto, tu tiempo y lo que te gusta.",
  },
  {
    icon: "map",
    title: "Actividades cerca",
    description: "Explorá y filtrá por categoría, precio y distancia.",
  },
  {
    icon: "heart",
    title: "Todo lo que guardaste",
    description: "Tus favoritos, colecciones y salidas te esperan.",
  },
];

/**
 * Context strip under the login card (#143): fills the otherwise empty
 * lower area of the form panel and tells the person what signing in gives
 * them back, including whoever lands here from a protected route.
 */
export function LoginHighlights() {
  return (
    <section className={styles.highlights} aria-labelledby="login-highlights-title">
      <h2 id="login-highlights-title" className={styles.title}>
        Al ingresar a SmartPlan
      </h2>
      <ul className={styles.list}>
        {HIGHLIGHTS.map(({ icon, title, description }) => (
          <li key={title} className={styles.item}>
            <span className={styles.iconWrap} aria-hidden="true">
              <Icon name={icon} size={18} />
            </span>
            <span className={styles.copy}>
              <span className={styles.itemTitle}>{title}</span>
              <span className={styles.itemDescription}>{description}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
