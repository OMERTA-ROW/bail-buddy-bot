import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { US_STATES } from "@/lib/us-states";
import { CosignerBadge } from "@/components/status-badges";
import { sendDocumentsForSignature } from "@/lib/docusign.functions";

export const Route = createFileRoute("/_authenticated/cosigners")({
  component: CosignersPage,
  head: () => ({
    meta: [
      { title: "Cosigners & release custody | Postbail" },
      {
        name: "description",
        content:
          "Add cosigners, collect their documents, capture the release custody address, and send bond paperwork for e-signature.",
      },
      { property: "og:title", content: "Cosigners & release custody | Postbail" },
      {
        property: "og:description",
        content: "Cosigner intake, ID upload, release custody details and e-signature status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Inmate = { id: string; full_name: string; county: string; state: string };

type Cosigner = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  years_at_address: number | null;
  employer_name: string | null;
  employer_phone: string | null;
  relationship: string | null;
  id_document_path: string | null;
  status: string;
  invite_channel: string | null;
  invite_sent_at: string | null;
  inmate_id: string | null;
};

type ReleasePlan = {
  id: string;
  released_to_name: string;
  relationship: string | null;
  phone: string | null;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  notes: string | null;
};

const EMPTY_COSIGNER = {
  full_name: "",
  date_of_birth: "",
  phone: "",
  email: "",
  address_street: "",
  address_city: "",
  address_state: "TX",
  address_zip: "",
  years_at_address: "",
  employer_name: "",
  employer_phone: "",
  relationship: "",
};

function CosignersPage() {
  const [inmates, setInmates] = useState<Inmate[]>([]);
  const [caseId, setCaseId] = useState<string>("");
  const [cosigners, setCosigners] = useState<Cosigner[]>([]);
  const [plan, setPlan] = useState<ReleasePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tracked_inmates")
        .select("id, full_name, county, state")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      const list = data ?? [];
      setInmates(list);
      if (list[0]) setCaseId(list[0].id);
      setLoading(false);
    })();
  }, []);

  async function loadCase(id: string) {
    if (!id) return;
    const [{ data: cs }, { data: rp }] = await Promise.all([
      supabase.from("cosigners").select("*").eq("inmate_id", id).order("created_at"),
      supabase.from("release_plans").select("*").eq("inmate_id", id).maybeSingle(),
    ]);
    setCosigners((cs ?? []) as Cosigner[]);
    setPlan((rp ?? null) as ReleasePlan | null);
  }

  useEffect(() => {
    loadCase(caseId);
  }, [caseId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (inmates.length === 0) {
    return (
      <div className="panel p-16 text-center">
        <p className="eyebrow mb-3">No case yet</p>
        <h1 className="text-3xl">Add someone to your watchlist first</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Cosigners and release custody details attach to a person you're tracking.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go to watchlist
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Paperwork</p>
          <h1 className="text-4xl">Cosigners & release custody</h1>
        </div>
        <label className="block">
          <span className="eyebrow mb-1.5 block">Case</span>
          <select className="field" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {inmates.map((i) => (
              <option key={i.id} value={i.id}>
                {i.full_name} — {i.county}, {i.state}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl">Cosigners</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everyone who signs indemnity for this bond.
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add cosigner
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {cosigners.length === 0 ? (
            <div className="panel p-10 text-center text-sm text-muted-foreground">
              No cosigners on this case yet.
            </div>
          ) : (
            cosigners.map((c) => (
              <CosignerCard key={c.id} cosigner={c} onChanged={() => loadCase(caseId)} />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl">Release custody</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Required before a bond can be submitted — who the defendant is released to and where
          they'll be residing.
        </p>
        <ReleaseForm
          key={caseId + (plan?.id ?? "new")}
          inmateId={caseId}
          plan={plan}
          onSaved={() => loadCase(caseId)}
        />
      </section>

      {showForm && (
        <CosignerForm
          inmateId={caseId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadCase(caseId);
          }}
        />
      )}
    </div>
  );
}

function CosignerCard({ cosigner, onChanged }: { cosigner: Cosigner; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  async function invite(channel: "email" | "sms") {
    if (channel === "email" && !cosigner.email) return toast.error("Add an email address first");
    if (channel === "sms" && !cosigner.phone) return toast.error("Add a phone number first");
    setBusy(true);
    const { error } = await supabase
      .from("cosigners")
      .update({
        status: "documents_pending",
        invite_channel: channel,
        invite_sent_at: new Date().toISOString(),
      })
      .eq("id", cosigner.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(
      channel === "email"
        ? `Invite queued for ${cosigner.email}`
        : `Invite queued for ${cosigner.phone}`,
    );
    onChanged();
  }

  async function send() {
    setBusy(true);
    try {
      const res = await sendDocumentsForSignature({ data: { cosignerId: cosigner.id } });
      toast.success(
        res.live
          ? "Documents sent through DocuSign"
          : "Documents queued (simulated — add DocuSign keys to send for real)",
      );
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send documents");
    }
    setBusy(false);
  }

  async function verify() {
    setBusy(true);
    const { error } = await supabase
      .from("cosigners")
      .update({ status: "verified" })
      .eq("id", cosigner.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChanged();
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("cosigners").delete().eq("id", cosigner.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChanged();
  }

  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-2xl">{cosigner.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {cosigner.relationship || "Relationship not set"}
            {cosigner.date_of_birth ? ` · DOB ${cosigner.date_of_birth}` : ""}
          </p>
        </div>
        <CosignerBadge status={cosigner.status} />
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Phone" value={cosigner.phone} />
        <Detail label="Email" value={cosigner.email} />
        <Detail
          label="Address"
          value={
            cosigner.address_street
              ? `${cosigner.address_street}, ${cosigner.address_city ?? ""} ${cosigner.address_state ?? ""} ${cosigner.address_zip ?? ""}`
              : null
          }
        />
        <Detail
          label="Time at address"
          value={cosigner.years_at_address != null ? `${cosigner.years_at_address} years` : null}
        />
        <Detail label="Employer" value={cosigner.employer_name} />
        <Detail label="Employer phone" value={cosigner.employer_phone} />
        <Detail label="Government ID" value={cosigner.id_document_path ? "On file" : null} />
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => invite("email")} className="btn-quiet">
          Invite by email
        </button>
        <button disabled={busy} onClick={() => invite("sms")} className="btn-quiet">
          Invite by SMS
        </button>
        <button disabled={busy} onClick={send} className="btn-primary">
          Send documents for signature
        </button>
        {cosigner.status !== "verified" && (
          <button disabled={busy} onClick={verify} className="btn-quiet">
            Mark verified
          </button>
        )}
        <button disabled={busy} onClick={remove} className="btn-quiet text-destructive">
          Remove
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function CosignerForm({
  inmateId,
  onClose,
  onSaved,
}: {
  inmateId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_COSIGNER });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof EMPTY_COSIGNER, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      setBusy(false);
      return toast.error("Please sign in again");
    }

    let idPath: string | null = null;
    if (file) {
      const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("cosigner-ids").upload(path, file);
      if (upErr) {
        setBusy(false);
        return toast.error(upErr.message);
      }
      idPath = path;
    }

    const { error } = await supabase.from("cosigners").insert({
      user_id: uid,
      inmate_id: inmateId,
      full_name: form.full_name,
      date_of_birth: form.date_of_birth || null,
      phone: form.phone || null,
      email: form.email || null,
      address_street: form.address_street || null,
      address_city: form.address_city || null,
      address_state: form.address_state || null,
      address_zip: form.address_zip || null,
      years_at_address: form.years_at_address ? Number(form.years_at_address) : null,
      employer_name: form.employer_name || null,
      employer_phone: form.employer_phone || null,
      relationship: form.relationship || null,
      id_document_path: idPath,
      status: idPath ? "documents_pending" : "invited",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${form.full_name} added as a cosigner`);
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="eyebrow mb-2">Cosigner intake</p>
        <h2 className="font-serif text-3xl">Add a cosigner</h2>
        <form onSubmit={save} className="mt-6 space-y-4">
          <Field label="Full legal name">
            <input required className="field" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date of birth">
              <input type="date" className="field" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className="field" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <input type="email" className="field" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
          </div>
          <Field label="Street address">
            <input className="field" value={form.address_street} onChange={(e) => set("address_street", e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="City">
              <input className="field" value={form.address_city} onChange={(e) => set("address_city", e.target.value)} />
            </Field>
            <Field label="State">
              <select className="field" value={form.address_state} onChange={(e) => set("address_state", e.target.value)}>
                {US_STATES.map(([abbr]) => (
                  <option key={abbr} value={abbr}>{abbr}</option>
                ))}
              </select>
            </Field>
            <Field label="ZIP">
              <input className="field" value={form.address_zip} onChange={(e) => set("address_zip", e.target.value)} />
            </Field>
            <Field label="Years at address">
              <input type="number" step="0.5" min="0" className="field" value={form.years_at_address} onChange={(e) => set("years_at_address", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Employer">
              <input className="field" value={form.employer_name} onChange={(e) => set("employer_name", e.target.value)} />
            </Field>
            <Field label="Employer phone">
              <input className="field" value={form.employer_phone} onChange={(e) => set("employer_phone", e.target.value)} />
            </Field>
            <Field label="Relationship to defendant">
              <input className="field" value={form.relationship} onChange={(e) => set("relationship", e.target.value)} placeholder="Sister, employer…" />
            </Field>
          </div>
          <Field label="Government ID upload">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="field"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            ID files are stored privately and are only visible to you.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-quiet">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "Add cosigner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReleaseForm({
  inmateId,
  plan,
  onSaved,
}: {
  inmateId: string;
  plan: ReleasePlan | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    released_to_name: plan?.released_to_name ?? "",
    relationship: plan?.relationship ?? "",
    phone: plan?.phone ?? "",
    address_street: plan?.address_street ?? "",
    address_city: plan?.address_city ?? "",
    address_state: plan?.address_state ?? "TX",
    address_zip: plan?.address_zip ?? "",
    notes: plan?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      setBusy(false);
      return toast.error("Please sign in again");
    }
    const payload = { ...form, user_id: uid, inmate_id: inmateId };
    const { error } = await supabase.from("release_plans").upsert(payload, { onConflict: "inmate_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Release custody details saved");
    onSaved();
  }

  return (
    <form onSubmit={save} className="panel mt-6 space-y-4 p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Released to">
          <input required className="field" value={form.released_to_name} onChange={(e) => set("released_to_name", e.target.value)} />
        </Field>
        <Field label="Relationship">
          <input className="field" value={form.relationship} onChange={(e) => set("relationship", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className="field" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>
      <Field label="Residence address after release">
        <input required className="field" value={form.address_street} onChange={(e) => set("address_street", e.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="City">
          <input required className="field" value={form.address_city} onChange={(e) => set("address_city", e.target.value)} />
        </Field>
        <Field label="State">
          <select className="field" value={form.address_state} onChange={(e) => set("address_state", e.target.value)}>
            {US_STATES.map(([abbr]) => (
              <option key={abbr} value={abbr}>{abbr}</option>
            ))}
          </select>
        </Field>
        <Field label="ZIP">
          <input required className="field" value={form.address_zip} onChange={(e) => set("address_zip", e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className="field" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {plan ? "On file — a bond can be submitted for this case." : "Required before a bond can be submitted."}
        </p>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : plan ? "Update details" : "Save details"}
        </button>
      </div>
    </form>
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
