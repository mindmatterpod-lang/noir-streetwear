import { useQuery } from "@tanstack/react-query";

import { db } from "@/lib/db";

interface Row {
  email: string;
  status: string;
  source: string;
  consent_at: string;
  unsubscribed_at: string | null;
}

export function SubscribersPanel() {
  const { data, error } = useQuery({
    queryKey: ["admin-subscribers"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await db
        .from("newsletter_subscribers")
        .select("email, status, source, consent_at, unsubscribed_at")
        .order("consent_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Row[];
    },
  });
  if (error)
    return (
      <p className="text-sm text-muted-foreground">
        The newsletter is not set up yet. Apply <code>docs/phase-03-schema.sql</code>, then reload.
      </p>
    );
  const active = (data ?? []).filter((r) => r.status === "subscribed").length;
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {active} subscribed · {(data ?? []).length - active} unsubscribed (latest 500)
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border border-border text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3">Source</th>
              <th className="p-3">Consent given</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.email} className="border-t border-border">
                <td className="p-3">{r.email}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">{r.source}</td>
                <td className="p-3">{new Date(r.consent_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
