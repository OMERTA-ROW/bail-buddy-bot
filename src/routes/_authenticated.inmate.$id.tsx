import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NO_COMMERCIAL_BAIL } from "@/lib/us-states";

type Inmate = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  county: string;
  state: string;
  status: string;
  bond_amount_cents: number | null;
  charges: string | null;
  notes: string | null;
  facility_name: string | null;
  booking_number: string | null;
  last_checked_at: string | null;
  created_at: string;
  auto_refer_bondsman: boolean;
};

type Event = {
  id: string;
  event_type: string;
  description: string | null;
  bond_amount_cents: number | null;
  created_at: string;
};

type Bondsman = {
  id: string;
  agency_name: string;
  contact_name: string;
  phone: string;
  license_number: string;
  premium_rate_pct: number;
  hours_247: boolean;
  verified: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  searching: "Searching roster",
  in_custody: "In custody",
  bond_set: "Bond set — action possible",
  bond_posted: "Bond posted",
  released: "Released",
  transferred: "Transferred",
  not_found: "Not found on roster",
};

export const Route = createFileRoute("/_authenticated/inmate/$id")({
  component: InmateDetail,
});

function InmateDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [inmate, setInmate] = useState<Inmate | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [bondsmen, setBondsmen] = useState<Bondsman[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: i, error } = await supabase
      .from("tracked_inmates").select("*").eq("id", id).maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (!i) { toast.error("Not found"); navigate({ to: "/dashboard" }); return; }
    setInmate(i as Inmate);

    const { data: e } = await supabase
      .from("status_events").select("*").eq("inmate_id", id).order("created_at", { ascending: false });
    setEvents((e as Event[]) ?? []);

    // find bondsmen serving this county/state
    const { data: b } = await supabase
      .from("bondsmen")
      .select("id, agency_name, contact_name, phone, license_number, premium_rate_pct, hours_247, verified")
      .contains("states_served", [i.state]);
    setBondsmen((b as Bondsman[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function simulate(type: "bond_set" | "bond_posted" | "released") {
    if (!inmate) return;
    const patch: { status: "bond_set" | "bond_posted" | "released"; bond_amount_cents?: number } =
      type === "bond_set"
        ? { status: "bond_set", bond_amount_cents: 250000 }
        : { status: type };
    const { error: uerr } = await supabase.from("tracked_inmates")
      .update({ ...patch, last_checked_at: new Date().toISOString() })
      .eq("id", inmate.id);
    if (uerr) { toast.error(uerr.message); return; }

    const desc: Record<typeof type, string> = {
      bond_set: "Bond amount set to $2,500 cash / surety.",
      bond_posted: "Bond posted at intake window.",
      released: "Subject released from facility.",
    };
    await supabase.from("status_events").insert({
      inmate_id: inmate.id,
      event_type: type,
      description: desc[type],
      bond_amount_cents: type === "bond_set" ? 250000 : null,
    });
    toast.success("Status updated");
    load();
  }

  async function remove() {
    if (!inmate) return;
    if (!confirm(`Stop tracking ${inmate.full_name}?`)) return;
    const { error } = await supabase.from("tracked_inmates").delete().eq("id", inmate.id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); navigate({ to: "/dashboard" }); }
  }

  if (loading || !inmate) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const banned = NO_COMMERCIAL_BAIL.has(inmate.state);
  const canRefer = (inmate.status === "bond_set" || inmate.status === "in_custody") && !banned;

  return (
    <div>
      <Link to="/dashboard" className="eyebrow mb-6 inline-block hover:text-foreground">← Watchlist</Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-5xl tracking-tight">{inmate.full_name}</h1>
          <p className="mt-2 text-muted-foreground">
            {inmate.county} County, {inmate.state}
            {inmate.date_of_birth && <> · DOB {new Date(inmate.date_of_birth).toLocaleDateString()}</>}
          </p>
        </div>
        <div className="text-right">
          <p className="eyebrow">Status</p>
          <p className="font-serif text-2xl">{STATUS_LABEL[inmate.status] ?? inmate.status}</p>
          {inmate.bond_amount_cents != null && (
            <p className="mt-1 text-sm text-signal">
              Bond: ${(inmate.bond_amount_cents / 100).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {canRefer && (
        <div className="mt-8 rounded-lg border border-accent/40 bg-accent/10 p-6">
          <p className="eyebrow text-accent-foreground">Action possible</p>
          <h2 className="mt-1 font-serif text-2xl">
            {bondsmen.length > 0
              ? `${bondsmen.length} bondsman${bondsmen.length === 1 ? "" : ""} serving ${inmate.state}`
              : `No verified bondsmen listed in ${inmate.state} yet`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Refer this case to post the bond. Premium is typically 10% of bond amount and is paid to the bondsman, not to Postbail.
          </p>
          {bondsmen.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {bondsmen.slice(0, 4).map((b) => (
                <div key={b.id} className="rounded-md border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-serif text-lg">{b.agency_name}</p>
                    {b.verified && <span className="text-xs text-emerald-600">✓ Verified</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{b.contact_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    License #{b.license_number} · {b.premium_rate_pct}% premium
                    {b.hours_247 && " · 24/7"}
                  </p>
                  <a
                    href={`tel:${b.phone}`}
                    onClick={() => toast.success(`Referral sent to ${b.agency_name}`)}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Call {b.phone}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {banned && (
        <div className="mt-8 rounded-lg border border-border bg-secondary p-6">
          <p className="eyebrow">Commercial bail unavailable</p>
          <p className="mt-2 text-sm">
            {inmate.state} does not allow commercial bail bondsmen. Bond must be posted directly at the court or facility (cash or property). We'll still alert you on every status change.
          </p>
        </div>
      )}

      <div className="mt-12 grid gap-10 md:grid-cols-[2fr_1fr]">
        {/* Timeline */}
        <section>
          <p className="eyebrow mb-4">Status timeline</p>
          <ol className="border-l border-border pl-6">
            {events.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No status changes yet. We're checking the roster continuously.
              </li>
            )}
            {events.map((e) => (
              <li key={e.id} className="relative mb-6 last:mb-0">
                <span className="absolute -left-[29px] top-1.5 status-dot text-accent" />
                <p className="font-serif text-lg">{e.event_type.replace(/_/g, " ")}</p>
                {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-md border border-dashed border-border p-4">
            <p className="eyebrow mb-2">Demo controls</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Real jail data isn't wired yet. Use these to simulate what an alert flow looks like:
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => simulate("bond_set")} className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-secondary">Simulate: bond set</button>
              <button onClick={() => simulate("bond_posted")} className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-secondary">Simulate: bond posted</button>
              <button onClick={() => simulate("released")} className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-secondary">Simulate: released</button>
            </div>
          </div>
        </section>

        {/* Meta */}
        <aside className="space-y-6">
          <MetaBlock label="Charges" value={inmate.charges} />
          <MetaBlock label="Facility" value={inmate.facility_name} />
          <MetaBlock label="Booking #" value={inmate.booking_number} />
          <MetaBlock label="Your notes" value={inmate.notes} multiline />
          <button onClick={remove} className="mt-6 text-xs text-destructive underline underline-offset-4">
            Stop tracking this person
          </button>
        </aside>
      </div>
    </div>
  );
}

function MetaBlock({ label, value, multiline }: { label: string; value: string | null; multiline?: boolean }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className={multiline ? "whitespace-pre-wrap text-sm" : "text-sm"}>
        {value ?? <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}
