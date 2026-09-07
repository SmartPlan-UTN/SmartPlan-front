import type { Metadata } from "next";

import { FavoritesTabs } from "./FavoritesTabs";

export const metadata: Metadata = {
  title: "Favoritos",
};

export default function FavoritesPage() {
  return <FavoritesTabs />;
}
