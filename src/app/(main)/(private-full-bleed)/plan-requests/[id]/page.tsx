import { notFound } from "next/navigation";

import { PlanRequestScreen } from "@/components/plan-request/PlanRequestScreen";

export default async function PlanRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const requestId = Number(id);
  if (!Number.isSafeInteger(requestId) || requestId <= 0) notFound();

  return <PlanRequestScreen requestId={requestId} />;
}
