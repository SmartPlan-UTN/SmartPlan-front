/**
 * The immersive section's choreography data — "la mesa de trabajo".
 *
 * The dark scene is a table seen in perspective. The "ganas sueltas" are
 * paper scraps scattered across it at three depths. Scroll progress runs
 * them through: chaos → a light sweep → the incompatible ones peeled off
 * the table → the rest sliding into three piles → the camera tilting
 * almost flat as each pile collapses onto a route node → the line drawn,
 * the times set, the plan signed.
 *
 * Positions are percentages of the scene box so the same numbers work at
 * every width. Hand-authored, not random: the scatter has to read as
 * art-directed clutter, and a fixed layout is what lets the reduced-motion
 * and mobile fallbacks show a sensible static arrangement.
 */

export type StoryCluster = "atardecer" | "mesa" | "cafe" | "discarded";

export interface StoryToken {
  label: string;
  cluster: StoryCluster;
  /** Scattered start, % of the scene box. */
  home: { x: number; y: number; rot: number };
  /** 0 = far (back of the table, moves least), 2 = near (front, moves most). */
  depth: 0 | 1 | 2;
}

/** Where each cluster stacks before collapsing onto its node, % of box. */
export const CLUSTER_CENTER: Record<Exclude<StoryCluster, "discarded">, { x: number; y: number }> = {
  atardecer: { x: 18, y: 40 },
  mesa: { x: 50, y: 38 },
  cafe: { x: 82, y: 42 },
};

/** The three route nodes, aligned to STORY.stops. */
export const ROUTE_NODES: { x: number; y: number }[] = [
  { x: 18, y: 52 },
  { x: 50, y: 52 },
  { x: 82, y: 52 },
];

/** Depth → how far off the table plane the scrap floats, in px. */
export const DEPTH_Z: Record<StoryToken["depth"], number> = {
  0: -70,
  1: 0,
  2: 64,
};

export const STORY_TOKENS: StoryToken[] = [
  { label: "atardecer", cluster: "atardecer", home: { x: 9, y: 14, rot: -6 }, depth: 2 },
  { label: "vista", cluster: "atardecer", home: { x: 28, y: 64, rot: 4 }, depth: 1 },
  { label: "al aire libre", cluster: "atardecer", home: { x: 5, y: 41, rot: -3 }, depth: 0 },
  { label: "buena comida", cluster: "mesa", home: { x: 45, y: 9, rot: 5 }, depth: 1 },
  { label: "con amigos", cluster: "mesa", home: { x: 61, y: 19, rot: -4 }, depth: 2 },
  { label: "vinos", cluster: "mesa", home: { x: 39, y: 31, rot: 7 }, depth: 0 },
  { label: "algo rico", cluster: "mesa", home: { x: 53, y: 57, rot: -6 }, depth: 2 },
  { label: "sobremesa", cluster: "mesa", home: { x: 69, y: 45, rot: 3 }, depth: 1 },
  { label: "café", cluster: "cafe", home: { x: 85, y: 15, rot: -5 }, depth: 2 },
  { label: "tranquilo", cluster: "cafe", home: { x: 92, y: 52, rot: 4 }, depth: 1 },
  { label: "cerca", cluster: "cafe", home: { x: 77, y: 67, rot: -3 }, depth: 0 },
  { label: "sin reserva", cluster: "discarded", home: { x: 23, y: 82, rot: 8 }, depth: 2 },
  { label: "poco tiempo", cluster: "discarded", home: { x: 65, y: 80, rot: -7 }, depth: 2 },
];
