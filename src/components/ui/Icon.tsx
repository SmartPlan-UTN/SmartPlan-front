import type { LucideProps } from "lucide-react";

import { iconRegistry, type IconName } from "./iconRegistry";

export type { IconName };

export interface IconProps
  extends Omit<
    LucideProps,
    "color" | "name" | "size" | "stroke" | "strokeWidth"
  > {
  name: IconName;
  size?: number;
  color?: string;
  /** Grosor del trazo. El design system usa entre 1.75 y 2. */
  stroke?: number;
}

export function Icon({
  name,
  size = 18,
  color = "currentColor",
  stroke = 2,
  ...props
}: IconProps) {
  const Glyph = iconRegistry[name];
  const isDecorative =
    props["aria-label"] == null && props["aria-labelledby"] == null;

  return (
    <Glyph
      size={size}
      color={color}
      strokeWidth={stroke}
      aria-hidden={isDecorative ? true : undefined}
      {...props}
    />
  );
}
