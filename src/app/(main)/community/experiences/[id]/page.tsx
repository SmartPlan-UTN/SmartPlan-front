import { ExperienceDetailScreen } from "@/components/community/ExperienceDetailScreen";

export default async function CommunityExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExperienceDetailScreen id={Number(id)} />;
}
