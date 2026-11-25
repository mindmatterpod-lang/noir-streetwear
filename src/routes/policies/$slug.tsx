import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { WhatsAppButton } from "@/components/support/WhatsAppButton";
import { supportEmail, supportMessages } from "@/lib/contact";
import { POLICIES } from "@/lib/policies";

export const Route = createFileRoute("/policies/$slug")({
  loader: ({ params }) => {
    const policy = POLICIES[params.slug];
    if (!policy) throw notFound();
    return { policy };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.policy.title ?? "Policy"} — Nowhere` },
      { name: "description", content: loaderData?.policy.description ?? "" },
    ],
  }),
  component: PolicyPage,
});

function PolicyPage() {
  const { policy } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const email = supportEmail();
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-black uppercase tracking-widest">{policy.title}</h1>
        {policy.table && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full border border-border text-sm">
              <thead className="bg-muted">
                <tr>
                  {policy.table.head.map((h) => (
                    <th key={h} className="p-3 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policy.table.rows.map((row) => (
                  <tr key={row[0]} className="border-t border-border">
                    {row.map((cell, i) => (
                      <td key={i} className="p-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {policy.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        {slug === "contact" && (
          <section aria-labelledby="support-actions" className="mt-12 border-t border-border pt-8">
            <h2 id="support-actions" className="text-sm font-semibold uppercase tracking-widest">
              Get help
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <WhatsAppButton message={supportMessages.general()} label="Chat on WhatsApp" />
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-medium uppercase tracking-[0.16em] hover:bg-secondary"
                >
                  Email us
                </a>
              )}
              <Link
                to="/track"
                className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-medium uppercase tracking-[0.16em] hover:bg-secondary"
              >
                Track an order
              </Link>
              <Link
                to="/policies/$slug"
                params={{ slug: "size-guide" }}
                className="inline-flex min-h-11 items-center border border-border px-4 text-xs font-medium uppercase tracking-[0.16em] hover:bg-secondary"
              >
                Size guide
              </Link>
            </div>
          </section>
        )}
      </article>
    </SiteLayout>
  );
}
