import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");
const rules = [...css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({
  selector: m[1]!.trim(),
  body: m[2]!,
}));

describe("motion CSS safety rules (visitor checks)", () => {
  it("only ever hides content behind .motion-ok, which the head script sets when JS runs and motion is welcome", () => {
    const hiders = rules.filter(
      (r) => /opacity:\s*0\s*;?\s*$/m.test(r.body) && /\.(reveal|fade)\b/.test(r.selector),
    );
    expect(hiders.length).toBeGreaterThan(0);
    for (const rule of hiders) expect(rule.selector).toContain(".motion-ok");
  });

  it("has a safety net that shows both sections and images when scripts fail to start", () => {
    expect(css).toMatch(/\.reveal-all \.reveal\s*\{[^}]*opacity:\s*1/);
    expect(css).toMatch(
      /\.motion-ok\.reveal-all img\.fade:not\(\.is-loaded\)\s*\{[^}]*opacity:\s*1/,
    );
  });

  it("turns animations and transitions off for visitors who prefer reduced motion", () => {
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toContain("animation-duration: 0.01ms !important");
    expect(block).toContain("transition-duration: 0.01ms !important");
  });

  it("uses no animation library", async () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies: Record<string, string>;
    };
    for (const lib of ["framer-motion", "motion", "gsap", "react-spring", "animejs", "aos"])
      expect(pkg.dependencies[lib]).toBeUndefined();
  });
});
