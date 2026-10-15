import type { Price } from './pricing';
import type {
  ActivityCategorySummary,
  ActivityMapMarker,
  ActivitySearchParams,
  ActivitySearchResult,
  MapActivitiesParams,
} from './activities';

/** A Google rating of a place: always shown attributed to Google Maps. */
export interface ExternalRating {
  rating: number;
  ratingCount: number;
  source: "google";
}

/**
 * A place-level price reference from Google Maps. It describes the venue,
 * never an activity's own price, and never counts in a plan total.
 */
export interface ExternalPrice {
  min: number | null;
  max: number | null;
  currency: string | null;
  /** Coarse Google level (PRICE_LEVEL_MODERATE...), never an amount. */
  level: string | null;
  source: "google";
}

/** An open-licensed photo of a place and the credit it must carry. */
export interface PlaceImage {
  url: string;
  license: string | null;
  author: string | null;
  sourceUrl: string | null;
}

/**
 * The place a card, marker or detail refers to. Matches `PlaceSummaryDto`
 * in SmartPlan-back: provider fields are already filtered by expiry.
 */
export interface PlaceSummary {
  id: number;
  name: string;
  kind: string | null;
  kindLabel: string | null;
  address: string;
  department: string | null;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinatesOwned: boolean;
  externalRating: ExternalRating | null;
  externalPrice: ExternalPrice | null;
  image: PlaceImage | null;
}

export interface ExploreActivityItem extends ActivitySearchResult {
  itemType: "ACTIVITY";
}

/**
 * A real place with no verified activity yet: worth discovering and mapping,
 * never addable to a plan as if it were an activity.
 */
export interface ExplorePlaceItem {
  itemType: "PLACE";
  id: number;
  name: string;
  description: string | null;
  kind: string | null;
  kindLabel: string | null;
  categories: ActivityCategorySummary[];
  distanceKm: number | null;
  place: PlaceSummary;
}

export type ExploreItem = ExploreActivityItem | ExplorePlaceItem;

export type ExploreItemType = "ALL" | "ACTIVITY" | "PLACE";

export interface ExploreSearchParams extends ActivitySearchParams {
  itemType?: ExploreItemType;
}

export interface ExploreMapParams extends MapActivitiesParams {
  itemType?: ExploreItemType;
}

export interface ExplorePlaceMarker {
  /** `place-<id>`, unique next to activity markers. */
  id: string;
  itemType: "PLACE";
  placeId: number;
  name: string;
  placeName: string;
  address: string;
  kind: string | null;
  kindLabel: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  categories: ActivityCategorySummary[];
  place: PlaceSummary;
}

export type ExploreMapMarker =
  | (ActivityMapMarker & { itemType: "ACTIVITY" })
  | ExplorePlaceMarker;

/** An activity offered at a place, as listed on the place's page. */
export interface PlaceActivity {
  id: number;
  name: string;
  type: string | null;
  typeLabel: string | null;
  estimatedDuration: number;
  price: Price;
  planEligible: boolean;
}

/** `GET /places/:id`: the place, its live context and its real offer. */
export interface PlaceDetailResult {
  id: number;
  name: string;
  description: string | null;
  address: string;
  kind: string | null;
  kindLabel: string | null;
  summary: PlaceSummary | null;
  activities: PlaceActivity[];
  department: {
    id: number;
    name: string;
    city: { id: number; name: string; country: { id: number; name: string } };
  };
}

/** One live Google photo and the credit that must be shown with it. */
export interface PlacePhotoMedia {
  photoUri: string;
  authors: Array<{ displayName: string; uri: string | null }>;
  provider: "Google Maps";
}
