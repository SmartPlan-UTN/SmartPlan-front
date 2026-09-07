import type { CategoryOption } from "@/types";
import type { IconName } from "@/components/ui";

export interface CategoryPresentation {
  label: string;
  description: string | null;
  iconName: IconName;
  displayOrder: number | null;
}

/**
 * Spanish presentation for the ten category names seeded by SmartPlan-back.
 * IDs and API values stay untouched: this is display-only, so preference
 * reads and writes continue using the backend's numeric contract.
 */
const SEEDED_CATEGORY_PRESENTATIONS: Readonly<
  Record<string, CategoryPresentation>
> = {
  Gastronomy: {
    label: "Gastronomía",
    description: "Restaurantes, bodegas, cafés y experiencias para comer rico.",
    iconName: "utensils",
    displayOrder: 0,
  },
  Outdoors: {
    label: "Aire libre",
    description: "Parques, montaña, trekking y actividades al aire libre.",
    iconName: "trees",
    displayOrder: 1,
  },
  Culture: {
    label: "Cultura",
    description: "Museos, teatro, patrimonio y recorridos guiados.",
    iconName: "drama",
    displayOrder: 2,
  },
  Entertainment: {
    label: "Entretenimiento",
    description: "Cine, juegos, parques temáticos y espectáculos.",
    iconName: "popcorn",
    displayOrder: 3,
  },
  Nightlife: {
    label: "Vida nocturna",
    description: "Bares, clubes y salidas para disfrutar la noche.",
    iconName: "martini",
    displayOrder: 4,
  },
  Sports: {
    label: "Deportes",
    description: "Actividades deportivas para practicar o mirar.",
    iconName: "dumbbell",
    displayOrder: 5,
  },
  "Live music": {
    label: "Música en vivo",
    description: "Conciertos, peñas y shows de música en vivo.",
    iconName: "music-2",
    displayOrder: 6,
  },
  Wellness: {
    label: "Bienestar",
    description: "Spa, termas, yoga y experiencias para bajar un cambio.",
    iconName: "flower-2",
    displayOrder: 7,
  },
  Shopping: {
    label: "Compras",
    description: "Ferias, mercados, paseos de compras y artesanías.",
    iconName: "shopping-bag",
    displayOrder: 8,
  },
  "Short trips": {
    label: "Escapadas",
    description: "Salidas de un día a destinos cercanos.",
    iconName: "luggage",
    displayOrder: 9,
  },
};

const PRESENTATION_BY_LOCALIZED_NAME = new Map(
  Object.values(SEEDED_CATEGORY_PRESENTATIONS).map((presentation) => [
    presentation.label,
    presentation,
  ]),
);

export function categoryPresentation(
  category: CategoryOption,
): CategoryPresentation {
  return (
    SEEDED_CATEGORY_PRESENTATIONS[category.name] ??
    PRESENTATION_BY_LOCALIZED_NAME.get(category.name) ?? {
      label: category.name,
      description: category.description,
      iconName: "tag",
      displayOrder: null,
    }
  );
}
