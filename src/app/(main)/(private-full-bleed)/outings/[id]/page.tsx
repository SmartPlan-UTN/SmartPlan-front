import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OutingDetailView } from "@/components/outings";
import { parsePositiveIntId } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Salida",
};

export default async function OutingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outingId = parsePositiveIntId(id);
  if (outingId == null) {
    notFound();
  }

  // Full-bleed hero, like the plan detail it mirrors.
  return <OutingDetailView outingId={outingId} />;
}
