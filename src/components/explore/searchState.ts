import { OCCASION_KEYS, type Occasion, type SortDirection } from "@/types";

export type ExplorationSearchParams = Record<string, string | string[] | undefined>;

export interface ExplorationSearchState {
  type?: string;
  itemType?: "ALL" | "ACTIVITY" | "PLACE";
  search: string;
  categoryIds: number[];
  minPrice: string;
  maxPrice: string;
  minRating: string;
  cityId: number | null;
  departmentId: number | null;
  /** "Ocasión" pills (#210): any of them. */
  occasions: Occasion[];
  /** "En casa": games and plans at home. */
  atHome: boolean;
  /** "Gratis": evidenced free prices only. */
  free: boolean;
  sortBy: "relevance" | "price" | "rating";
  direction: SortDirection;
  page: number;
}

/** Only supported search fields are carried between the list and map. */
export function readExplorationState(params: ExplorationSearchParams = {}): ExplorationSearchState {
  const value = (key: string) => typeof params[key] === "string" ? params[key] : "";
  const positiveId = (raw: string) => {
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  };
  const price = (key: string) => {
    const raw = value(key);
    return raw.trim() !== "" && Number.isFinite(Number(raw)) && Number(raw) >= 0 ? raw : "";
  };
  const cityId = positiveId(value("cityId"));
  const sortBy = value("sortBy");
  const rating = value("minRating");
  return {
    type: value("type") || undefined,
    itemType: value("itemType") === "ACTIVITY" ? "ACTIVITY" : value("itemType") === "PLACE" ? "PLACE" : "ALL",
    search: value("search"),
    categoryIds: [...new Set(value("categoryIds").split(",").map(positiveId).filter((id): id is number => id !== null))],
    minPrice: price("minPrice"),
    maxPrice: price("maxPrice"),
    minRating: ["3", "4", "4.5"].includes(rating) ? rating : "",
    cityId,
    departmentId: cityId === null ? null : positiveId(value("departmentId")),
    occasions: OCCASION_KEYS.filter((key) => value("occasions").split(",").includes(key)),
    atHome: value("atHome") === "true",
    free: value("free") === "true",
    sortBy: sortBy === "price" || sortBy === "rating" ? sortBy : "relevance",
    direction: value("direction") === "desc" ? "desc" : "asc",
    page: positiveId(value("page")) ?? 1,
  };
}

export function explorationQuery(state: ExplorationSearchState): string {
  const params = new URLSearchParams();
  if (state.type) params.set("type", state.type);
  if (state.itemType && state.itemType !== "ALL") params.set("itemType", state.itemType);
  if (state.search) params.set("search", state.search);
  if (state.categoryIds.length) params.set("categoryIds", state.categoryIds.join(","));
  for (const key of ["minPrice", "maxPrice", "minRating"] as const) {
    if (state[key] !== "") params.set(key, state[key]);
  }
  if (state.cityId !== null) params.set("cityId", String(state.cityId));
  if (state.departmentId !== null) params.set("departmentId", String(state.departmentId));
  if (state.occasions?.length) params.set("occasions", state.occasions.join(","));
  if (state.atHome) params.set("atHome", "true");
  if (state.free) params.set("free", "true");
  params.set("sortBy", state.sortBy);
  params.set("direction", state.direction);
  params.set("page", String(state.page));
  return params.toString();
}

export function priceRangeError(minPrice: string, maxPrice: string): string | null {
  for (const price of [minPrice, maxPrice]) {
    if (price.trim() !== "" && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      return "Ingresá precios válidos mayores o iguales a cero.";
    }
  }
  return minPrice.trim() !== "" && maxPrice.trim() !== "" && Number(minPrice) > Number(maxPrice)
    ? "El precio mínimo no puede superar al máximo."
    : null;
}
