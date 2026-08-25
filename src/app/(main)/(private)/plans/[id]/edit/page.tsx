import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditPlanForm } from "@/components/plan";
import { Container } from "@/components/layout";
import { parsePositiveIntId } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Editar Plan",
};

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const planId = parsePositiveIntId(id);
  if (planId == null) {
    notFound();
  }

  return (
    <Container>
      <EditPlanForm planId={planId} />
    </Container>
  );
}
