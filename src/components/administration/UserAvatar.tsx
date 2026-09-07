import styles from "./administration.module.css";

export interface UserAvatarProps {
  name: string;
  lastName: string;
  userId: number;
}

export function UserAvatar({ name, lastName, userId }: UserAvatarProps) {
  const initials = `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const palette = Math.abs(userId) % 6;

  return (
    <span className={`${styles.avatar} ${styles[`avatar_${palette}`]}`} aria-hidden="true">
      {initials}
    </span>
  );
}
