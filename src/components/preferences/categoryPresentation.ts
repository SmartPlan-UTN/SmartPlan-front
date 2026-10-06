import type { CategoryOption } from "@/types";
import type { IconName } from "@/components/ui";
import { categoryLabel } from "@/lib/utils";

export interface CategoryPresentation {
  label: string;
  description: string | null;
  iconName: IconName;
  displayOrder: number | null;
}

/**
 * Spanish presentation for the ten category names seeded by SmartPlan-back.
 * The label comes from the shared `categoryLabel` so Explorar, Inicio and
 * Preferencias name each category the same way.
 * IDs and API values stay untouched: this is display-only, so preference
 * reads and writes continue using the backend's numeric contract.
 */
const SEEDED_CATEGORY_DETAILS: Readonly<
  Record<string, Omit<CategoryPresentation, "label">>
> = {
  Gastronomy: {
    description: "Restaurantes, bodegas, cafés y experiencias para comer rico.",
    iconName: "utensils",
    displayOrder: 0,
  },
  Outdoors: {
    description: "Parques, montaña, trekking y actividades al aire libre.",
    iconName: "trees",
    displayOrder: 1,
  },
  Culture: {
    description: "Museos, teatro, patrimonio y recorridos guiados.",
    iconName: "drama",
    displayOrder: 2,
  },
  Entertainment: {
    description: "Cine, juegos, parques temáticos y espectáculos.",
    iconName: "popcorn",
    displayOrder: 3,
  },
  Nightlife: {
    description: "Bares, clubes y salidas para disfrutar la noche.",
    iconName: "martini",
    displayOrder: 4,
  },
  Sports: {
    description: "Actividades deportivas para practicar o mirar.",
    iconName: "dumbbell",
    displayOrder: 5,
  },
  "Live music": {
    description: "Conciertos, peñas y shows de música en vivo.",
    iconName: "music-2",
    displayOrder: 6,
  },
  Wellness: {
    description: "Spa, termas, yoga y experiencias para bajar un cambio.",
    iconName: "flower-2",
    displayOrder: 7,
  },
  Shopping: {
    description: "Ferias, mercados, paseos de compras y artesanías.",
    iconName: "shopping-bag",
    displayOrder: 8,
  },
  "Short trips": {
    description: "Salidas de un día a destinos cercanos.",
    iconName: "luggage",
    displayOrder: 9,
  },
};

// Keyed by the Spanish label, so a category already renamed to Spanish in
// the catalog keeps its icon and order too.
const SEEDED_CATEGORY_PRESENTATIONS: ReadonlyMap<string, CategoryPresentation> =
  new Map(
    Object.entries(SEEDED_CATEGORY_DETAILS).map(([name, details]) => [
      categoryLabel(name),
      { label: categoryLabel(name), ...details },
    ]),
  );

export function categoryPresentation(
  category: CategoryOption,
): CategoryPresentation {
  const label = categoryLabel(category.name);
  return (
    SEEDED_CATEGORY_PRESENTATIONS.get(label) ?? {
      label,
      description: category.description,
      iconName: "tag",
      displayOrder: null,
    }
  );
}
