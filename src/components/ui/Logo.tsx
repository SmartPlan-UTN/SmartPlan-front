import Image from "next/image";

export type LogoVariant = "white" | "ink";
export type LogoKind = "full" | "mark";

export interface LogoProps {
  variant?: LogoVariant;
  kind?: LogoKind;
  height?: number;
  alt?: string;
  className?: string;
  priority?: boolean;
}

const LOGO_RATIOS: Record<LogoKind, number> = {
  full: 1340 / 308,
  mark: 805 / 773,
};

export function Logo({
  variant = "ink",
  kind = "full",
  height = 26,
  alt = "smartplan",
  className,
  priority = false,
}: LogoProps) {
  const width = Math.round(height * LOGO_RATIOS[kind]);

  return (
    <Image
      src={`/brand/logo-${kind}-${variant}.png`}
      width={width}
      height={height}
      alt={alt}
      className={className}
      priority={priority}
    />
  );
}
