/** In-tab notification after the API confirms an avatar mutation. */
const AVATAR_CHANGED_EVENT = "smartplan:avatar-changed";

interface AvatarChange {
  userId: number;
  avatarUrl: string | null;
}

export function publishAvatarChange(
  userId: number,
  avatarUrl: string | null,
): void {
  window.dispatchEvent(
    new CustomEvent<AvatarChange>(AVATAR_CHANGED_EVENT, {
      detail: { userId, avatarUrl },
    }),
  );
}

export function subscribeAvatarChanges(
  listener: (change: AvatarChange) => void,
): () => void {
  const onChange = (event: Event) =>
    listener((event as CustomEvent<AvatarChange>).detail);
  window.addEventListener(AVATAR_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(AVATAR_CHANGED_EVENT, onChange);
}
