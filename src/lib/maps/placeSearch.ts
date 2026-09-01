import type { PreferredArea } from "@/types";

import { loadGoogleMaps } from "./loadGoogleMaps";

export interface PlacePrediction {
  placeId: string;
  description: string;
}

// `PlacesService` (classic API) needs an attachment point — a `Map` or an
// `HTMLDivElement` — even for a request with no visible map. It's never
// added to the document, so nothing renders; it just satisfies the
// constructor. Created lazily (not at module scope) so importing this file
// on the server, where `document` doesn't exist, doesn't throw.
let placesService: google.maps.places.PlacesService | null = null;

function getPlacesService(): google.maps.places.PlacesService {
  placesService ??= new google.maps.places.PlacesService(
    document.createElement("div"),
  );
  return placesService;
}

/**
 * Address/place-name suggestions for CU8's location search, as the user
 * types. A fresh `AutocompleteSessionToken` per keystroke sequence (passed
 * again to `getPlaceDetails` for the prediction the user picks, then
 * discarded) bills the whole search-then-select flow as one session
 * instead of one lookup per request — Google's documented pattern for
 * Autocomplete + Place Details.
 */
export async function searchPlacePredictions(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
): Promise<PlacePrediction[]> {
  await loadGoogleMaps();
  const service = new google.maps.places.AutocompleteService();

  return new Promise((resolve, reject) => {
    // The classic callback overload's return value (a promise nothing here
    // awaits — the callback below is what actually resolves this function)
    // still needs silencing, same as `getDetails` further down.
    void service.getPlacePredictions(
      { input, sessionToken },
      (predictions, status) => {
        const { OK, ZERO_RESULTS } = google.maps.places.PlacesServiceStatus;
        if (status === ZERO_RESULTS) {
          resolve([]);
          return;
        }
        if (status !== OK || !predictions) {
          reject(new Error("No pudimos buscar esa ubicación."));
          return;
        }
        resolve(
          predictions.map((prediction) => ({
            placeId: prediction.place_id,
            description: prediction.description,
          })),
        );
      },
    );
  });
}

/**
 * Resolves a prediction's `placeId` into the `{ label, placeId, latitude,
 * longitude }` shape `PATCH /users/me/preferences` expects — the backend
 * trusts and stores this verbatim, no server-side Places call of its own.
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
): Promise<PreferredArea> {
  await loadGoogleMaps();
  const service = getPlacesService();

  return new Promise((resolve, reject) => {
    service.getDetails(
      { placeId, sessionToken, fields: ["formatted_address", "name", "geometry"] },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          reject(new Error("No pudimos resolver esa ubicación."));
          return;
        }
        resolve({
          label: place.formatted_address ?? place.name ?? "",
          placeId,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        });
      },
    );
  });
}

/**
 * Turns device coordinates (the "usar ubicación del dispositivo" toggle)
 * into the same resolved shape as a manual search, since the backend's
 * `preferred_area` columns move together — a raw lat/lng with no `placeId`
 * or human label isn't a valid value on its own.
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
): Promise<PreferredArea> {
  await loadGoogleMaps();
  const geocoder = new google.maps.Geocoder();

  return new Promise((resolve, reject) => {
    void geocoder.geocode(
      { location: { lat: latitude, lng: longitude } },
      (results, status) => {
        const first = results?.[0];
        if (status !== google.maps.GeocoderStatus.OK || !first) {
          reject(new Error("No pudimos identificar tu ubicación actual."));
          return;
        }
        resolve({
          label: first.formatted_address,
          placeId: first.place_id,
          latitude,
          longitude,
        });
      },
    );
  });
}
