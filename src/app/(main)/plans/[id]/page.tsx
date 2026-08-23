import type { Metadata } from "next";

import { PlanDetailView } from "@/components/plan";

export const metadata: Metadata = {
  title: "Plan",
};

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // No `Container` here: the hero goes full-bleed, matching
  // SmartPlanSystemDesign/v2/PlanDetail.jsx. `PlanDetailView` centers the
  // rest of its content itself.
  return <PlanDetailView planId={Number(id)} />;
}
