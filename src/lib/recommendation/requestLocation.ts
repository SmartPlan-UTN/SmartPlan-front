import { getPreferences } from "@/lib/api/users";
import { readDeviceCoordinates } from "@/lib/location/deviceCoordinates";
import type { CreatePlanRequestPayload } from "@/types";

/** Device coordinates are transient; they never become a saved preferred area. */
export async function withRequestLocation(
  payload: CreatePlanRequestPayload,
): Promise<CreatePlanRequestPayload> {
  if (
    (Number.isFinite(payload.context?.latitude) && Number.isFinite(payload.context?.longitude)) ||
    typeof navigator === "undefined" || !navigator.geolocation
  ) return payload;

  try {
    const preferences = await getPreferences();
    if (!preferences.useDeviceLocation) return payload;
    const coordinates = await readDeviceCoordinates();
    return { ...payload, context: { ...payload.context, ...coordinates } };
  } catch {
    // The backend still has the saved area (if any) and its normal location fallback.
    return payload;
  }
}
