import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Reveal } from "@/components/layout/Reveal";
import { FadeImage } from "@/components/shop/FadeImage";

describe("Reveal", () => {
  it("always renders its children and becomes visible when IntersectionObserver is unavailable", () => {
    render(<Reveal>hello</Reveal>);
    const el = screen.getByText("hello");
    expect(el).toBeTruthy();
    expect(el.className).toContain("reveal");
    expect(el.className).toContain("in");
  });
});

describe("FadeImage", () => {
  it("starts un-loaded and gets is-loaded after the image loads", () => {
    render(<FadeImage src="/x.jpg" alt="shirt" className="size-full" />);
    const img = screen.getByAltText("shirt");
    expect(img.className).toContain("fade");
    expect(img.className).toContain("size-full");
    fireEvent.load(img);
    expect(img.className).toContain("is-loaded");
  });
});
