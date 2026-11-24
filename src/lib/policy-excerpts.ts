import { POLICIES } from "@/lib/policies";

/** First paragraph of a policy section, so product pages quote the real policy text instead of paraphrasing it. */
export function policyExcerpt(slug: string, heading: string): string | null {
  return POLICIES[slug]?.sections.find((s) => s.heading === heading)?.body[0] ?? null;
}
