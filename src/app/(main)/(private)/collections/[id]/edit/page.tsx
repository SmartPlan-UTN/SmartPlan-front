import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditCollectionForm } from "@/components/collection";
import { parsePositiveIntId } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Editar colección",
};

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collectionId = parsePositiveIntId(id);
  if (collectionId == null) notFound();

  return <EditCollectionForm collectionId={collectionId} />;
}
