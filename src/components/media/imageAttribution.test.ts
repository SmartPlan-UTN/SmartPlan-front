import { describe, expect, it } from "vitest";
import { imageLicenseUrl, imageSourceTitle } from "./imageAttribution";

describe("open image attribution", () => {
  it("links the actual license including older CC BY and share-alike versions", () => {
    expect(imageLicenseUrl("CC BY-SA 3.0")).toBe("https://creativecommons.org/licenses/by-sa/3.0/");
    expect(imageLicenseUrl("CC BY 4.0")).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(imageLicenseUrl("CC0")).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
    expect(imageLicenseUrl("unknown")).toBeNull();
  });
  it("retains the supplied Commons work title without inventing one", () => {
    expect(imageSourceTitle("https://commons.wikimedia.org/wiki/File:Museo_de_Mendoza.jpg")).toBe("Museo de Mendoza.jpg");
    expect(imageSourceTitle("https://example.test/photo.jpg")).toBeNull();
    expect(imageSourceTitle("not a URL")).toBeNull();
  });
});
