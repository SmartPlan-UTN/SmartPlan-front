import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlanDetailView } from "@/components/plan";
import { planDetailOrigin } from "@/lib/routes";
import { parsePositiveIntId } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Plan",
};

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { id } = await params;
  const planId = parsePositiveIntId(id);
  if (planId == null) {
    notFound();
  }

  // No `Container` here: the hero goes full-bleed, matching
  // SmartPlanSystemDesign/v2/PlanDetail.jsx. `PlanDetailView` centers the
  // rest of its content itself.
  return <PlanDetailView planId={planId} returnTo={planDetailOrigin((await searchParams).from)} />;
}
