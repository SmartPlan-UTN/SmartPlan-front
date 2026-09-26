import styles from "./UserAvatar.module.css";

export type UserAvatarSize = "medium" | "large";
export type UserAvatarTone = "palette" | "ember";

export interface UserAvatarProps {
  name: string;
  lastName: string;
  userId: number;
  size?: UserAvatarSize;
  tone?: UserAvatarTone;
}

export function UserAvatar({
  name,
  lastName,
  userId,
  size = "medium",
  tone = "palette",
}: UserAvatarProps) {
  const initials = `${name.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
  const palette = Math.abs(userId) % 6;
  const toneClass = tone === "ember" ? styles.ember : styles[`avatar_${palette}`];

  return (
    <span
      className={`${styles.avatar} ${styles[size]} ${toneClass}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
