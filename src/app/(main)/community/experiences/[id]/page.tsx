import { notFound } from "next/navigation";

import { ExperienceDetailScreen } from "@/components/community/ExperienceDetailScreen";
import { parsePositiveIntId } from "@/lib/utils";

export default async function CommunityExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const experienceId = parsePositiveIntId(id);
  if (experienceId === null) notFound();
  return <ExperienceDetailScreen id={experienceId} />;
}
