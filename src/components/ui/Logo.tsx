import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * `ember` is the brand lockup over light surfaces: the isotype in `--ember`
 * and, in the `full` kind, the wordmark in ink so it stays as legible as the
 * `ink` variant. `ember-cream` is the same lockup over dark surfaces, with
 * the wordmark in cream.
 */
export type LogoVariant = "white" | "ink" | "ember" | "ember-cream";
export type LogoKind = "full" | "mark";

export interface LogoProps {
  variant?: LogoVariant;
  /**
   * The variant to show instead while the dark theme is on, for a logo that
   * sits on a surface that follows the theme (the navbar, the admin
   * sidebar). Omit it for a logo on a surface that's the same in both
   * themes, like the char footer.
   */
  darkVariant?: LogoVariant;
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
  darkVariant,
  kind = "full",
  height = 26,
  alt = "smartplan",
  className,
  priority = false,
}: LogoProps) {
  const width = Math.round(height * LOGO_RATIOS[kind]);

  function renderVariant(shown: LogoVariant, themeClass?: string) {
    return (
      <Image
        src={`/brand/logo-${kind}-${shown}.png`}
        width={width}
        height={height}
        alt={alt}
        className={cn(className, themeClass)}
        priority={priority}
      />
    );
  }

  if (!darkVariant || darkVariant === variant) {
    return renderVariant(variant);
  }

  // Both are in the HTML and CSS picks one (`.sp-light-only` /
  // `.sp-dark-only` in tokens.css): the theme is applied before the first
  // paint, so choosing in React would flash the light logo on every dark
  // reload. The hidden one is `display: none`, out of the accessibility
  // tree, so the name is announced once.
  return (
    <>
      {renderVariant(variant, "sp-light-only")}
      {renderVariant(darkVariant, "sp-dark-only")}
    </>
  );
}
