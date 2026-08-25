import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlanDetailView } from "@/components/plan";
import { parsePositiveIntId } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Plan",
};

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const planId = parsePositiveIntId(id);
  if (planId == null) {
    notFound();
  }

  // No `Container` here: the hero goes full-bleed, matching
  // SmartPlanSystemDesign/v2/PlanDetail.jsx. `PlanDetailView` centers the
  // rest of its content itself.
  return <PlanDetailView planId={planId} />;
}
