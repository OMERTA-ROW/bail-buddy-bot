import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { US_STATES } from "@/lib/us-states";

export const Route = createFileRoute("/join-bondsman")({
  head: () => ({
    meta: [{ title: "Join as a licensed bondsman — Postbail" }],
  }),
  component: Join,
});

function Join() {
  const navigate = useNavigate();
  const [session, setSession] = useState<boolean | null>(null);
  const [existing, setExisting] = useState<string | null>(null);
  const [form, setForm] = useState({
    agency_name: "",
    contact_name: "",
    license_number: "",
    license_state: "TX",
    phone: "",
    email: "",
    states_served: ["TX"],
    counties_served: "",
    premium_rate_pct: 10,
    hours_247: true,
    bio: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setSession(false); return; }
      setSession(true);
      const { data: existingRow } = await supabase
        .from("bondsmen").select("id").eq("user_id", data.user.id).maybeSingle();
      if (existingRow) setExisting(existingRow.id);
      setForm((f) => ({ ...f, email: data.user!.email ?? "" }));
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in first"); setBusy(false); return; }

    const payload = {
      user_id: u.user.id,
      agency_name: form.agency_name,
      contact_name: form.contact_name,
      license_number: form.license_number,
      license_state: form.license_state,
      phone: form.phone,
      email: form.email,
      states_served: form.states_served,
      counties_served: form.counties_served.split(",").map((s) => s.trim()).filter(Boolean),
      premium_rate_pct: form.premium_rate_pct,
      hours_247: form.hours_247,
      bio: form.bio || null,
    };

    const res = existing
      ? await supabase.from("bondsmen").update(payload).eq("id", existing)
      : await supabase.from("bondsmen").insert(payload);

    setBusy(false);
    if (res.error) toast.error(res.error.message);
    else {
      toast.success("Listing saved — pending verification");
      navigate({ to: "/bondsmen" });
    }
  }

  if (session === false) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container-page py-24 text-center">
          <h1 className="text-4xl">Sign in to join the directory.</h1>
          <p className="mt-3 text-muted-foreground">Create a free account first — same one your clients would use.</p>
          <a href="/auth?mode=signup" className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Create account</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container-page py-16">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow mb-3">Bondsman directory</p>
          <h1 className="text-4xl">{existing ? "Edit your listing" : "Join as a licensed bondsman"}</h1>
          <p className="mt-3 text-muted-foreground">
            Free to list. We verify state license numbers before marking a listing verified. You keep the standard premium; Postbail takes a flat referral fee per posted bond.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Agency name"><input required className="input" value={form.agency_name} onChange={(e) => setForm({ ...form, agency_name: e.target.value })} /></Field>
              <Field label="Your name"><input required className="input" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
              <Field label="License #"><input required className="input" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></Field>
              <Field label="License state">
                <select className="input" value={form.license_state} onChange={(e) => setForm({ ...form, license_state: e.target.value })}>
                  {US_STATES.map(([a, n]) => <option key={a} value={a}>{a} — {n}</option>)}
                </select>
              </Field>
              <Field label="Phone"><input required className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" /></Field>
              <Field label="Email"><input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </div>
            <Field label="Counties served (comma separated)">
              <input className="input" value={form.counties_served} onChange={(e) => setForm({ ...form, counties_served: e.target.value })} placeholder="Harris, Fort Bend, Montgomery" />
            </Field>
            <Field label="States served">
              <input className="input" value={form.states_served.join(",")} onChange={(e) => setForm({ ...form, states_served: e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) })} placeholder="TX,LA" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Premium %">
                <input type="number" step="0.5" min="0" max="20" className="input" value={form.premium_rate_pct} onChange={(e) => setForm({ ...form, premium_rate_pct: parseFloat(e.target.value) })} />
              </Field>
              <label className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={form.hours_247} onChange={(e) => setForm({ ...form, hours_247: e.target.checked })} />
                <span className="text-sm">Available 24/7</span>
              </label>
            </div>
            <Field label="Short bio">
              <textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A sentence or two clients see." />
            </Field>

            <button type="submit" disabled={busy} className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {busy ? "Saving…" : existing ? "Save changes" : "Submit listing"}
            </button>
          </form>
        </div>
      </div>
      <SiteFooter />
      <style>{`.input{width:100%;border:1px solid var(--color-input);background:var(--color-background);padding:.6rem .8rem;border-radius:4px;font-size:.9rem;outline:none;}.input:focus{border-color:var(--color-primary);}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="eyebrow mb-1.5 block">{label}</span>{children}</label>);
}
