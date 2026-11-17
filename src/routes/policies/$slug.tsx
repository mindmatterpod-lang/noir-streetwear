import { createFileRoute, notFound } from "@tanstack/react-router";

import { SiteLayout } from "@/components/layout/SiteLayout";
import { POLICIES } from "@/lib/policies";

export const Route = createFileRoute("/policies/$slug")({
  loader: ({ params }) => {
    const policy = POLICIES[params.slug];
    if (!policy) throw notFound();
    return { policy };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.policy.title ?? "Policy"} — Noir Streetwear` },
      { name: "description", content: loaderData?.policy.description ?? "" },
    ],
  }),
  component: PolicyPage,
});

function PolicyPage() {
  const { policy } = Route.useLoaderData();
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
      </article>
    </SiteLayout>
  );
}
