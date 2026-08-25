import type { Metadata } from "next";
import Link from "next/link";

import { PendingScreen } from "@/components/layout";
import { Icon } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import styles from "./favorites.module.css";

export const metadata: Metadata = {
  title: "Favoritos",
};

export default function FavoritesPage() {
  return (
    <PendingScreen
      title="Favoritos"
      description="Las solapas de actividades, planes y colecciones guardadas, cada una con su estado vacío."
      references="CU39–CU43 · PAN 12"
    >
      <Link className={styles.createLink} href={ROUTES.createCollection}>
        <Icon name="folder-plus" />
        Crear colección
      </Link>
    </PendingScreen>
  );
}
