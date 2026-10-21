import type { Metadata } from "next";

import { OutingsView } from "@/components/outings";
import type { OutingsTab } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Mis salidas",
};

interface OutingsPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

export default async function OutingsPage({ searchParams }: OutingsPageProps) {
  const { tab } = await searchParams;
  const initialTab: OutingsTab = tab === "completed" ? "completed" : "to-do";
  return <OutingsView initialTab={initialTab} />;
}
