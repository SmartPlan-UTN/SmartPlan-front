import { notFound } from "next/navigation";

import { CollectionDetailView } from "@/components/collection";
import { parsePositiveIntId } from "@/lib/utils";

export default async function CollectionDetailPage({
  params,
}: PageProps<"/collections/[id]">) {
  const { id } = await params;
  const collectionId = parsePositiveIntId(id);
  if (collectionId == null) notFound();

  return <CollectionDetailView collectionId={collectionId} />;
}
