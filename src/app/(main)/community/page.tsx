import type { Metadata } from "next";

import { CommunityScreen } from "@/components/community/CommunityScreen";

export const metadata: Metadata = {
  title: "Comunidad",
};

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; sort?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const filter = params.type === "plans" || params.type === "experiences" ? params.type : "all";
  const sort = params.sort === "popular" || params.sort === "highest_rated" || params.sort === "most_reviewed" ? params.sort : filter === "plans" ? "popular" : "recent";
  return <CommunityScreen key={`${filter}:${query}:${sort}`} initialQuery={query} initialFilter={filter} initialSort={sort} />;
}
