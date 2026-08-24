import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActivityDetailView } from "@/components/activity";
import { parsePositiveIntId } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Actividad",
};

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activityId = parsePositiveIntId(id);
  if (activityId == null) {
    notFound();
  }

  // No `Container` here: the hero goes full-bleed, matching
  // SmartPlanSystemDesign/v2/ActivityDetail.jsx. `ActivityDetailView` centers
  // the rest of its content itself.
  return <ActivityDetailView activityId={activityId} />;
}
