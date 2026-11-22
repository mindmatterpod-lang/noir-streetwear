import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH } from "@/components/brand/logo-geometry";
import { SITE_NAME } from "@/lib/site-config";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "integrations" || name === "test" ? [] : sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(name) && !name.includes("routeTree.gen") ? [path] : [];
  });
}

describe("Nowhere branding", () => {
  it("uses the new name and no leftovers of the old brand in the app source", () => {
    expect(SITE_NAME).toBe("Nowhere");
    const leftovers = sourceFiles("src").filter((f) =>
      /noir|afterform/i.test(readFileSync(f, "utf8")),
    );
    expect(leftovers).toEqual([]);
  });

  it("ships every brand asset the page head and manifest point to", () => {
    for (const file of [
      "favicon.svg",
      "favicon.ico",
      "apple-touch-icon.png",
      "icon-192.png",
      "icon-512.png",
      "og-image.png",
      "logo.svg",
      "logo-white.svg",
      "site.webmanifest",
    ]) {
      expect(existsSync(join("public", file)), file).toBe(true);
    }
    const head = readFileSync("src/routes/__root.tsx", "utf8");
    for (const href of ["/favicon.svg", "/apple-touch-icon.png", "/site.webmanifest"])
      expect(head).toContain(href);
  });

  it("no longer ships the default Lovable favicon or advertises Lovable in the README", () => {
    const ico = readFileSync("public/favicon.ico");
    expect(ico.length).toBeLessThan(10_000); // the old Lovable heart icon was ~20 KB
    expect(readFileSync("README.md", "utf8")).not.toMatch(/lovable/i);
    expect(readFileSync("public/site.webmanifest", "utf8")).not.toMatch(/lovable/i);
  });

  it("has a well-formed logo geometry", () => {
    expect(LOGO_WIDTH / LOGO_HEIGHT).toBeCloseTo(6.9, 1);
    expect(LOGO_PATH.startsWith("M")).toBe(true);
  });
});
