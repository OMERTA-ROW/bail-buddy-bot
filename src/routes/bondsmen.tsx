import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { US_STATES } from "@/lib/us-states";

type Bondsman = {
  id: string;
  agency_name: string;
  contact_name: string;
  phone: string;
  email: string;
  license_number: string;
  license_state: string;
  counties_served: string[];
  states_served: string[];
  premium_rate_pct: number;
  hours_247: boolean;
  verified: boolean;
  bio: string | null;
};

export const Route = createFileRoute("/bondsmen")({
  head: () => ({
    meta: [
      { title: "Licensed bail bondsmen — Postbail directory" },
      { name: "description", content: "Search verified, state-licensed bail bondsmen by county. 24/7 availability, transparent rates." },
    ],
  }),
  component: Directory,
});

function Directory() {
  const [state, setState] = useState<string>("");
  const [rows, setRows] = useState<Bondsman[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase.from("bondsmen").select("*").order("verified", { ascending: false });
    if (state) q = q.contains("states_served", [state]);
    q.then(({ data }) => {
      setRows((data as Bondsman[]) ?? []);
      setLoading(false);
    });
  }, [state]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container-page py-16">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Directory</p>
          <h1 className="text-5xl">Licensed bail bondsmen</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every listing is a state-licensed bail agent. License numbers are shown so you can verify with your state's department of insurance.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">Filter by state:</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">All states</option>
            {US_STATES.map(([abbr, name]) => (
              <option key={abbr} value={abbr}>{name}</option>
            ))}
          </select>
          <div className="ml-auto">
            <Link
              to="/join-bondsman"
              className="rounded-md border border-input px-4 py-1.5 text-sm hover:bg-secondary"
            >
              Are you a bondsman? Join →
            </Link>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-16 text-center">
              <h2 className="font-serif text-3xl">No bondsmen listed yet{state ? ` in ${state}` : ""}.</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                We're onboarding licensed agents state by state. If you're a bondsman, join the directory.
              </p>
              <Link
                to="/join-bondsman"
                className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Join the directory
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((b) => (
                <article key={b.id} className="rounded-lg border border-border bg-card p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-serif text-2xl">{b.agency_name}</h2>
                      <p className="text-sm text-muted-foreground">{b.contact_name}</p>
                    </div>
                    {b.verified && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  {b.bio && <p className="mt-3 text-sm text-muted-foreground">{b.bio}</p>}
                  <dl className="mt-4 grid grid-cols-2 gap-y-2 text-xs">
                    <dt className="text-muted-foreground">License</dt>
                    <dd>#{b.license_number} ({b.license_state})</dd>
                    <dt className="text-muted-foreground">States served</dt>
                    <dd>{b.states_served.join(", ") || "—"}</dd>
                    <dt className="text-muted-foreground">Premium</dt>
                    <dd>{b.premium_rate_pct}%</dd>
                    <dt className="text-muted-foreground">Hours</dt>
                    <dd>{b.hours_247 ? "24/7" : "Business hours"}</dd>
                  </dl>
                  <div className="mt-5 flex gap-2">
                    <a href={`tel:${b.phone}`} className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:opacity-90">
                      Call
                    </a>
                    <a href={`mailto:${b.email}`} className="flex-1 rounded-md border border-input px-3 py-2 text-center text-sm hover:bg-secondary">
                      Email
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
