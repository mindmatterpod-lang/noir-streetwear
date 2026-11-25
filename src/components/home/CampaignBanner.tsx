import { useRouter } from "@tanstack/react-router";

import { safeCtaUrl, useActiveCampaign } from "@/lib/campaigns";

/** Homepage promotion driven by the campaigns table. Renders nothing when there is no live campaign. */
export function CampaignBanner() {
  const { data: campaign } = useActiveCampaign();
  const router = useRouter();
  if (!campaign) return null;
  const url = safeCtaUrl(campaign.cta_url);
  const image =
    campaign.image_url && /^https:\/\//i.test(campaign.image_url) ? campaign.image_url : null;
  return (
    <section
      aria-label="Promotion"
      className="relative isolate overflow-hidden border-b border-[var(--nw-line)] bg-[var(--nw-ink-2)] text-[var(--nw-paper)]"
    >
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 size-full object-cover opacity-30"
        />
      )}
      <div className="page-container flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:py-16">
        <div className="max-w-xl">
          <h2 className="display-heading text-[clamp(2.25rem,6vw,4rem)]">{campaign.title}</h2>
          {campaign.description && (
            <p className="mt-3 text-sm leading-relaxed text-[var(--nw-stone)]">
              {campaign.description}
            </p>
          )}
        </div>
        {url && (
          <a
            href={url}
            {...(url.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            onClick={(e) => {
              if (!url.startsWith("/")) return;
              e.preventDefault();
              router.history.push(url);
            }}
            className="btn btn-primary self-start md:self-auto"
          >
            {campaign.cta_label || "Shop now"}
          </a>
        )}
      </div>
    </section>
  );
}
