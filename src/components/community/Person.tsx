import Link from "next/link";

import { AuthenticatedImage } from "@/components/media";
import { communityCreatorRoute } from "@/lib/routes";

import { personSeed } from "./format";
import styles from "./person.module.css";

export interface PersonAvatarProps {
  username: string;
  avatarUrl?: string | null;
  /** Pixel size of the circle. */
  size?: number;
}

/** A person's photo, or their initial on a tone that is theirs everywhere. */
export function PersonAvatar({
  username,
  avatarUrl,
  size = 28,
}: PersonAvatarProps) {
  return (
    <span
      className={`${styles.avatar} ${styles[`tone${personSeed(username) % 5}`]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {avatarUrl ? (
        <AuthenticatedImage
          url={avatarUrl}
          alt=""
          width={size * 2}
          height={size * 2}
        />
      ) : (
        username.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export interface PersonLinkProps extends PersonAvatarProps {
  /** Light text, for use over a photograph. */
  onDark?: boolean;
  /** Secondary line under the handle. */
  note?: string;
}

/** Avatar + @handle, linking to the profile. */
export function PersonLink({
  username,
  avatarUrl,
  size = 28,
  onDark = false,
  note,
}: PersonLinkProps) {
  return (
    <Link
      href={communityCreatorRoute(username)}
      className={`${styles.person} ${onDark ? styles.onDark : ""}`}
    >
      <PersonAvatar username={username} avatarUrl={avatarUrl} size={size} />
      <span className={styles.names}>
        <span className={styles.handle}>@{username}</span>
        {note ? <span className={styles.note}>{note}</span> : null}
      </span>
    </Link>
  );
}
