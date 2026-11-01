import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlaceDetailView } from "@/components/explore/PlaceDetailView";
import { Container } from "@/components/layout";
import { parsePositiveIntId } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Lugar",
};

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const placeId = parsePositiveIntId(id);
  if (placeId == null) {
    notFound();
  }

  return (
    <Container>
      <PlaceDetailView placeId={placeId} />
    </Container>
  );
}
