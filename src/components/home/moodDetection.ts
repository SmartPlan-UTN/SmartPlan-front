import type { Mood } from "@/components/ui";

/**
 * Keyword → mood mapping for the hero's `MoodBackground`, ported verbatim
 * from `v2/Landing.jsx`'s `MOOD_MAP`/`detectMood`. Purely decorative: it
 * only changes which wave palette plays behind the composer as the user
 * types, never anything sent to the backend.
 */
const MOOD_KEYWORDS: Record<string, Mood> = {
  "romántica": "romantica",
  "romantica": "romantica",
  "cita": "romantica",
  "noche": "nocturna",
  "nocturna": "nocturna",
  "fiesta": "nocturna",
  "cócteles": "nocturna",
  "aire libre": "aire_libre",
  "aventura": "aire_libre",
  "parque": "aire_libre",
  "cultura": "cultural",
  "museo": "cultural",
  "teatro": "cultural",
  "gastronomía": "gastronomia",
  "cena": "gastronomia",
  "brunch": "gastronomia",
  "café": "gastronomia",
};

export function detectMood(text: string): Mood {
  if (!text) return "idle";
  const lower = text.toLowerCase();
  for (const [keyword, mood] of Object.entries(MOOD_KEYWORDS)) {
    if (lower.includes(keyword)) return mood;
  }
  return "idle";
}
