/**
 * CU8/CU18 (PAN 15) - Edit preferences. A resolved location the user picked
 * from the location search or their device's GPS: `GET`/`PATCH
 * /users/me/preferences` always carry all four fields together or none of
 * them (the backend enforces this with a DB check), so a location is never
 * "half set".
 */
export interface PreferredArea {
  label: string;
  placeId: string;
  latitude: number;
  longitude: number;
}

/** One of the interest categories shown as a chip (shared with CU10's). */
export interface PreferenceCategory {
  id: number;
  name: string;
  description: string | null;
}

/**
 * `GET /users/me/preferences` response: the user's saved recommendation
 * profile. `null` means that preference was never set; `useDeviceLocation`
 * defaults to `false` until a profile is saved at least once.
 */
export interface UserPreferences {
  categories: PreferenceCategory[];
  usualBudget: number | null;
  usualPeopleCount: number | null;
  preferredArea: PreferredArea | null;
  useDeviceLocation: boolean;
  maxDistanceKm: number | null;
}

/**
 * `PATCH /users/me/preferences` body. Every scalar field is optional and
 * independently clearable: `undefined` leaves the stored value untouched,
 * an explicit `null` wipes it. `categoryIds` is the one required field —
 * the full replacement set, not a diff.
 */
export interface UpdatePreferencesData {
  categoryIds: number[];
  usualBudget?: number | null;
  usualPeopleCount?: number | null;
  preferredArea?: PreferredArea | null;
  useDeviceLocation?: boolean;
  maxDistanceKm?: number | null;
}
