import type { Metadata } from "next";

import { CreateCollectionForm } from "@/components/collection";

export const metadata: Metadata = {
  title: "Crear colección",
};

export default function CreateCollectionPage() {
  return <CreateCollectionForm />;
}
