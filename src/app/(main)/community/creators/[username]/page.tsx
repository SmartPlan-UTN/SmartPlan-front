import { CreatorProfileScreen } from "@/components/community/CreatorProfileScreen";

export default async function CreatorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <CreatorProfileScreen key={username} username={username} />;
}
