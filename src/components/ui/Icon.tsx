"use client";

import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import type { LucideProps } from "lucide-react";

export interface IconProps
  extends Omit<
    LucideProps,
    "color" | "name" | "size" | "stroke" | "strokeWidth"
  > {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}

export function Icon({
  name,
  size = 18,
  color = "currentColor",
  stroke = 2,
  ...props
}: IconProps) {
  const isDecorative =
    props["aria-label"] == null && props["aria-labelledby"] == null;

  return (
    <DynamicIcon
      name={name}
      size={size}
      color={color}
      strokeWidth={stroke}
      aria-hidden={isDecorative ? true : undefined}
      {...props}
    />
  );
}
