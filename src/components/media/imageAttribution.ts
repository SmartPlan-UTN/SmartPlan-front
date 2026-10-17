export function imageLicenseUrl(license: string | null): string | null {
  const match = license?.match(/^CC[ -]BY([ -]SA)? ([1-4]\.0)$/i);
  if (match) return `https://creativecommons.org/licenses/${match[1] ? "by-sa" : "by"}/${match[2]}/`;
  if (/^CC0(?: 1\.0)?$/i.test(license ?? "")) return "https://creativecommons.org/publicdomain/zero/1.0/";
  return null;
}

export function imageSourceTitle(sourceUrl: string | null): string | null {
  try {
    const url = new URL(sourceUrl ?? "");
    const pathname = decodeURIComponent(url.pathname);
    return url.hostname === "commons.wikimedia.org" && pathname.startsWith("/wiki/File:")
      ? pathname.slice("/wiki/File:".length).replaceAll("_", " ")
      : null;
  } catch {
    return null;
  }
}
