import type { Metadata } from "next";

import { ActivityDetailView } from "@/components/activity";

export const metadata: Metadata = {
  title: "Actividad",
};

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // No `Container` here: the hero goes full-bleed, matching
  // SmartPlanSystemDesign/v2/ActivityDetail.jsx. `ActivityDetailView` centers
  // the rest of its content itself.
  return <ActivityDetailView activityId={Number(id)} />;
}
