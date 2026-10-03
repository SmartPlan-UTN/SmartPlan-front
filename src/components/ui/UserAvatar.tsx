import styles from "./UserAvatar.module.css";
import { AuthenticatedImage } from "@/components/media";

export type UserAvatarSize = "medium" | "large";
export type UserAvatarTone = "palette" | "ember";

export interface UserAvatarProps {
  name: string;
  lastName: string;
  userId: number;
  size?: UserAvatarSize;
  tone?: UserAvatarTone;
  avatarUrl?: string | null;
}

export function UserAvatar({
  name,
  lastName,
  userId,
  size = "medium",
  tone = "palette",
  avatarUrl,
}: UserAvatarProps) {
  const initials = `${name.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
  const palette = Math.abs(userId) % 6;
  const toneClass = tone === "ember" ? styles.ember : styles[`avatar_${palette}`];

  return (
    <span
      className={`${styles.avatar} ${styles[size]} ${toneClass}`}
      aria-hidden="true"
    >
      {avatarUrl ? <AuthenticatedImage url={avatarUrl} alt={`Avatar de ${name}`} width={44} height={44} /> : initials}
    </span>
  );
}
