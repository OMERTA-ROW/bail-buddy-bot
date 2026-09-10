import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { US_STATES, NO_COMMERCIAL_BAIL } from "@/lib/us-states";
import { CosignerBadge } from "@/components/status-badges";
import { ActivationPanel } from "@/components/activation-panel";


type Inmate = {
  id: string;
  full_name: string;
  county: string;
  state: string;
  status: string;
  bond_amount_cents: number | null;
  last_checked_at: string | null;
  facility_name: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  searching: "Searching roster",
  in_custody: "In custody",
  bond_set: "Bond set",
  bond_posted: "Bond posted",
  released: "Released",
  transferred: "Transferred",
  not_found: "Not found on roster",
};

const STATUS_COLOR: Record<string, string> = {
  searching: "text-muted-foreground",
  in_custody: "text-alert",
  bond_set: "text-signal",
  bond_posted: "text-accent",
  released: "text-emerald-600",
  transferred: "text-muted-foreground",
  not_found: "text-muted-foreground",
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [inmates, setInmates] = useState<Inmate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("tracked_inmates")
      .select("id, full_name, county, state, status, bond_amount_cents, last_checked_at, facility_name, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setInmates(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="eyebrow mb-2">Watchlist</p>
          <h1 className="text-4xl">People you're tracking</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + Add someone
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : inmates.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="border-t border-border">
          {inmates.map((i) => (
            <Link
              key={i.id}
              to="/inmate/$id"
              params={{ id: i.id }}
              className="grid grid-cols-1 gap-2 border-b border-border px-2 py-5 transition-colors hover:bg-secondary/60 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="font-serif text-xl">{i.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  Added {new Date(i.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-sm">
                <p>{i.county} County</p>
                <p className="text-xs text-muted-foreground">{i.state}</p>
              </div>
              <div className="text-sm">
                <span className={`inline-flex items-center gap-2 ${STATUS_COLOR[i.status] ?? ""}`}>
                  <span className="status-dot" />
                  {STATUS_LABEL[i.status] ?? i.status}
                </span>
              </div>
              <div className="text-sm">
                {i.bond_amount_cents != null ? (
                  <span className="font-serif text-lg">
                    ${(i.bond_amount_cents / 100).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {i.last_checked_at
                  ? `Checked ${new Date(i.last_checked_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : "Not yet checked"}
              </div>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-16">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">Activation</p>
            <h2 className="text-3xl">Tracking activation & wallet card</h2>
          </div>
          <Link to="/card" className="btn-quiet">
            View my card
          </Link>
        </div>
        <ActivationPanel />
      </section>

      <CosignerSummary />

      {showAdd && <AddDialog onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

type CosignerLite = { id: string; full_name: string; status: string; relationship: string | null };

function CosignerSummary() {
  const [rows, setRows] = useState<CosignerLite[]>([]);

  useEffect(() => {
    supabase
      .from("cosigners")
      .select("id, full_name, status, relationship")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as CosignerLite[]));
  }, []);

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Paperwork</p>
          <h2 className="text-3xl">Cosigners</h2>
        </div>
        <Link to="/cosigners" className="btn-quiet">
          Manage cosigners & release custody
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="panel mt-5 p-8 text-sm text-muted-foreground">
          No cosigners yet. A bond needs at least one cosigner and a release custody address.
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-serif text-lg">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">{c.relationship || "Relationship not set"}</p>
              </div>
              <CosignerBadge status={c.status} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border border-dashed border-border rounded-lg p-16 text-center">
      <p className="eyebrow mb-3">Nothing to watch yet</p>
      <h2 className="text-3xl">Who are we tracking?</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        Add a full name, date of birth, and the county they were booked in. We'll start watching the roster immediately and text you the moment anything changes.
      </p>
      <button
        onClick={onAdd}
        className="mt-8 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Add someone
      </button>
    </div>
  );
}

function AddDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    county: "",
    state: "TX",
    charges: "",
    notes: "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { toast.error("Please sign in again"); setBusy(false); return; }

    const { error } = await supabase.from("tracked_inmates").insert({
      user_id: uid,
      full_name: form.full_name,
      date_of_birth: form.date_of_birth || null,
      county: form.county,
      state: form.state,
      charges: form.charges || null,
      notes: form.notes || null,
      status: "searching",
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Now tracking ${form.full_name}`);
      onSaved();
    }
  }

  const banned = NO_COMMERCIAL_BAIL.has(form.state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-background p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow mb-2">New watch</p>
        <h2 className="font-serif text-3xl">Who should we track?</h2>
        <form onSubmit={save} className="mt-6 space-y-4">
          <Field label="Full name">
            <input required className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="First Middle Last" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth">
              <input type="date" className="input" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </Field>
            <Field label="State">
              <select className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                {US_STATES.map(([abbr, name]) => (
                  <option key={abbr} value={abbr}>{abbr} — {name}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="County">
            <input required className="input" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} placeholder="Harris" />
          </Field>
          <Field label="Charges (if known)">
            <input className="input" value={form.charges} onChange={(e) => setForm({ ...form, charges: e.target.value })} placeholder="Optional" />
          </Field>
          <Field label="Notes (only you see these)">
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Booking number, facility, attorney contact…" />
          </Field>

          {banned && (
            <div className="rounded-md border border-signal/40 bg-signal/10 p-3 text-xs text-foreground">
              Commercial bail bonds are prohibited in this state. Postbail will still track jail status and hearings, but bondsman referral is disabled here.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm hover:bg-secondary">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Saving…" : "Start tracking"}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .input { width:100%; border:1px solid var(--color-input); background:var(--color-background); padding:.6rem .8rem; border-radius:4px; font-size:.9rem; outline:none; }
        .input:focus { border-color: var(--color-primary); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
