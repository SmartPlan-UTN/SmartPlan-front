/**
 * The immersive section's choreography data.
 *
 * A single flat list of intention tokens, each with a scattered starting
 * place (`home`) and the cluster it belongs to. The section's scroll
 * progress moves every token from `home` to its cluster, drops the
 * incompatible ones out of frame, then collapses each cluster onto one of
 * the three route nodes. Positions are percentages of the scene box so
 * the same numbers work at every width.
 *
 * Hand-authored, not random: the scatter has to read as art-directed
 * clutter, and a fixed layout is also what lets the reduced-motion and
 * mobile fallbacks show a sensible static arrangement.
 */

export type StoryCluster = "atardecer" | "mesa" | "cafe" | "discarded";

export interface StoryToken {
  label: string;
  cluster: StoryCluster;
  /** Scattered start, % of the scene box. */
  home: { x: number; y: number; rot: number };
}

/** Where each cluster gathers before collapsing onto its node, % of box. */
export const CLUSTER_CENTER: Record<Exclude<StoryCluster, "discarded">, { x: number; y: number }> = {
  atardecer: { x: 16, y: 42 },
  mesa: { x: 50, y: 40 },
  cafe: { x: 84, y: 44 },
};

/** The three route nodes, aligned to STORY.stops. */
export const ROUTE_NODES: { x: number; y: number }[] = [
  { x: 16, y: 50 },
  { x: 50, y: 50 },
  { x: 84, y: 50 },
];

export const STORY_TOKENS: StoryToken[] = [
  { label: "atardecer", cluster: "atardecer", home: { x: 8, y: 12, rot: -6 } },
  { label: "vista", cluster: "atardecer", home: { x: 30, y: 66, rot: 4 } },
  { label: "al aire libre", cluster: "atardecer", home: { x: 4, y: 40, rot: -3 } },
  { label: "buena comida", cluster: "mesa", home: { x: 44, y: 8, rot: 5 } },
  { label: "con amigos", cluster: "mesa", home: { x: 62, y: 20, rot: -4 } },
  { label: "vinos", cluster: "mesa", home: { x: 38, y: 30, rot: 7 } },
  { label: "algo rico", cluster: "mesa", home: { x: 54, y: 58, rot: -6 } },
  { label: "sobremesa", cluster: "mesa", home: { x: 70, y: 44, rot: 3 } },
  { label: "café", cluster: "cafe", home: { x: 86, y: 14, rot: -5 } },
  { label: "tranquilo", cluster: "cafe", home: { x: 92, y: 52, rot: 4 } },
  { label: "cerca", cluster: "cafe", home: { x: 78, y: 68, rot: -3 } },
  { label: "sin reserva", cluster: "discarded", home: { x: 22, y: 82, rot: 8 } },
  { label: "poco tiempo", cluster: "discarded", home: { x: 66, y: 82, rot: -7 } },
];
