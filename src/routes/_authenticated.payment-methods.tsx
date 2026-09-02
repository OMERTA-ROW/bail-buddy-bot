import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/payment-methods")({
  component: PaymentMethodsPage,
});

type Method = {
  id: string;
  label: string | null;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  processor: string;
  is_default: boolean;
};

const BRANDS = ["Visa", "Mastercard", "Discover", "American Express"];

function PaymentMethodsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    setUid(userRes.user?.id ?? null);
    const { data, error } = await supabase
      .from("payment_methods")
      .select("id, label, brand, last4, exp_month, exp_year, processor, is_default")
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setMethods((data ?? []) as Method[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function makeDefault(id: string) {
    // Unique partial index allows only one default per holder — clear first.
    const { error: clearErr } = await supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("is_default", true);
    if (clearErr) return toast.error(clearErr.message);
    const { error } = await supabase.from("payment_methods").update({ is_default: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Default payment method updated");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Card removed");
    load();
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Settings</p>
          <h1 className="text-4xl">Payment methods</h1>
        </div>
        <Link to="/account" className="text-sm text-muted-foreground underline hover:text-foreground">
          ← Main funding account
        </Link>
      </header>

      <div className="rounded-md border border-signal/40 bg-signal/10 p-4 text-xs leading-relaxed">
        <p className="font-medium text-foreground">We never see your full card number</p>
        <p className="mt-1 text-muted-foreground">
          A card added here is a <em>backup</em> source, used only if the shared funding account is short or
          unavailable — and only if you've switched on card-backup consent for that account. Until a payment
          processor is connected, these entries are records only and cannot be charged.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : methods.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-14 text-center">
          <h2 className="text-2xl">No cards on file</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Add a personal debit card so a bond can still be covered if the shared account runs short.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="mt-8 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Add a card
          </button>
        </div>
      ) : (
        <>
          <div className="border-t border-border">
            {methods.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-1 gap-3 border-b border-border py-5 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center"
              >
                <div>
                  <p className="font-serif text-xl">
                    {m.brand} •••• {m.last4}
                  </p>
                  {m.label && <p className="text-xs text-muted-foreground">{m.label}</p>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Expires {String(m.exp_month).padStart(2, "0")}/{m.exp_year}
                </p>
                <div className="text-sm">
                  {m.is_default ? (
                    <span className="inline-flex items-center gap-2 text-accent">
                      <span className="status-dot" /> Default
                    </span>
                  ) : (
                    <button onClick={() => makeDefault(m.id)} className="text-muted-foreground hover:underline">
                      Set as default
                    </button>
                  )}
                </div>
                <button onClick={() => remove(m.id)} className="text-left text-xs text-alert hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setAdding(true)}
            className="rounded-md border border-input px-4 py-2 text-sm hover:bg-secondary"
          >
            + Add another card
          </button>
        </>
      )}

      {adding && uid && (
        <AddCardDialog
          uid={uid}
          hasExisting={methods.length > 0}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddCardDialog({
  uid,
  hasExisting,
  onClose,
  onSaved,
}: {
  uid: string;
  hasExisting: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    label: "",
    brand: "Visa",
    last4: "",
    exp_month: "",
    exp_year: "",
    makeDefault: !hasExisting,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(form.last4)) return toast.error("Enter the last four digits only");
    const month = Number(form.exp_month);
    const year = Number(form.exp_year);
    if (!(month >= 1 && month <= 12)) return toast.error("Expiry month must be 1–12");
    if (!(year >= 2000 && year <= 2100)) return toast.error("Enter a four-digit expiry year");

    setBusy(true);
    if (form.makeDefault) {
      await supabase.from("payment_methods").update({ is_default: false }).eq("is_default", true);
    }
    const { error } = await supabase.from("payment_methods").insert({
      user_id: uid,
      label: form.label || null,
      brand: form.brand,
      last4: form.last4,
      exp_month: month,
      exp_year: year,
      processor: "unlinked",
      is_default: form.makeDefault,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Card saved");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-background p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="eyebrow mb-2">Backup payment</p>
        <h2 className="font-serif text-3xl">Add a debit card</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Enter only the last four digits. Full card details are collected by the payment processor at the
          moment of a charge — never stored by Postbail.
        </p>

        <form onSubmit={save} className="mt-6 space-y-4">
          <label className="block">
            <span className="eyebrow mb-1.5 block">Nickname</span>
            <input
              className="pm-input w-full"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Everyday debit"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow mb-1.5 block">Brand</span>
              <select
                className="pm-input w-full"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              >
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="eyebrow mb-1.5 block">Last 4 digits</span>
              <input
                required
                className="pm-input w-full"
                value={form.last4}
                onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder="4242"
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow mb-1.5 block">Exp. month</span>
              <input
                required
                className="pm-input w-full"
                value={form.exp_month}
                onChange={(e) => setForm({ ...form, exp_month: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                placeholder="04"
                inputMode="numeric"
              />
            </label>
            <label className="block">
              <span className="eyebrow mb-1.5 block">Exp. year</span>
              <input
                required
                className="pm-input w-full"
                value={form.exp_year}
                onChange={(e) => setForm({ ...form, exp_year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder="2029"
                inputMode="numeric"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.makeDefault}
              onChange={(e) => setForm({ ...form, makeDefault: e.target.checked })}
            />
            Use as my default payment method
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm hover:bg-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save card"}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .pm-input { border:1px solid var(--color-input); background:var(--color-background); padding:.5rem .7rem; border-radius:4px; font-size:.9rem; outline:none; }
        .pm-input:focus { border-color: var(--color-primary); }
      `}</style>
    </div>
  );
}
