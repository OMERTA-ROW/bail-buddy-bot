import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActivation } from "@/components/activation-panel";
import { FlipCard, PrintSheet, type WalletCardData } from "@/components/wallet-card";
import { US_STATES } from "@/lib/us-states";

export const Route = createFileRoute("/_authenticated/card")({
  component: MyCardPage,
  head: () => ({
    meta: [
      { title: "My activation card | Bail Buddy" },
      {
        name: "description",
        content:
          "Print, save, or order your Bail Buddy wallet card with your activation code and the 24/7 call-in activation number.",
      },
      { property: "og:title", content: "My activation card | Bail Buddy" },
      {
        property: "og:description",
        content: "Your wallet-sized activation card with your code and call-in number.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Fulfillment = {
  id: string;
  recipient_name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  status: string;
  created_at: string;
  tracking_reference: string | null;
};

const FULFILLMENT_LABEL: Record<string, string> = {
  requested: "Requested",
  printing: "At the printer",
  shipped: "In the mail",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function MyCardPage() {
  const { activation, callInNumber, loading } = useActivation();
  const [holderName, setHolderName] = useState("Member");
  const [paidTick, setPaidTick] = useState(0);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      setEmail(userRes.user?.email ?? null);
      if (!uid) return;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      if (data?.full_name) setHolderName(data.full_name);
      else if (userRes.user?.email) setHolderName(userRes.user.email);
    })();
  }, []);

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const data: WalletCardData | null = useMemo(() => {
    if (!activation) return null;
    return {
      holderName,
      activationCode: activation.activation_code,
      callInNumber,
      activationUrl: `${origin}/activate?code=${encodeURIComponent(activation.activation_code)}`,
    };
  }, [activation, holderName, callInNumber, origin]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading your card…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">No activation code on this account yet.</p>;

  return (
    <div>
      <div className="mb-10">
        <p className="eyebrow mb-2">My card</p>
        <h1 className="text-4xl">Your activation card</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Keep this in your wallet. If you are ever detained, the number and code on it are all
          anyone needs to start your bond process.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-start">
        <div>
          <FlipCard data={data} />
          <p className="mt-3 text-xs text-muted-foreground">Tap the card to flip it over.</p>
        </div>

        <div className="space-y-4">
          <CardCheckout email={email} onPaid={() => setPaidTick((t) => t + 1)} />
          <CardActions data={data} email={email} pin={activation?.pin ?? ""} paidTick={paidTick} />
          <PhysicalCardSection defaultName={holderName} paidTick={paidTick} />
        </div>
      </div>

      <PrintSheet data={data} />
    </div>
  );
}

const CARD_PRICE_CENTS = 200;

type CardPayment = {
  id: string;
  kind: "print" | "email" | "physical";
  amount_cents: number;
  status: string;
  receipt_reference: string;
  created_at: string;
};

function useCardPayments(paidTick: number) {
  const [payments, setPayments] = useState<CardPayment[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("card_payments")
        .select("id, kind, amount_cents, status, receipt_reference, created_at")
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      setPayments((data ?? []) as CardPayment[]);
      setLoaded(true);
    })();
  }, [paidTick]);
  const paidFor = (kind: CardPayment["kind"]) => payments.some((p) => p.kind === kind);
  return { payments, loaded, paidFor };
}

const PURPOSE_COPY =
  "This card costs $2. We charge for it on purpose — paying for it makes you remember you have it. Keep it in your wallet. If you are ever detained, this card is how you activate your bond.";

function CardCheckout({ email, onPaid }: { email: string | null; onPaid: () => void }) {
  const [kind, setKind] = useState<CardPayment["kind"]>("print");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<CardPayment | null>(null);
  const [defaultMethod, setDefaultMethod] = useState<{ brand: string; last4: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("payment_methods")
        .select("brand, last4")
        .eq("is_default", true)
        .maybeSingle();
      setDefaultMethod(data ?? null);
    })();
  }, []);

  async function pay() {
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { toast.error("Please sign in again"); setBusy(false); return; }

    const { data: method } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("is_default", true)
      .maybeSingle();

    const { data, error } = await supabase
      .from("card_payments")
      .insert({
        user_id: uid,
        kind,
        amount_cents: CARD_PRICE_CENTS,
        payment_method_id: method?.id ?? null,
      })
      .select("id, kind, amount_cents, status, receipt_reference, created_at")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setReceipt(data as CardPayment);
    onPaid();
  }

  return (
    <div className="panel p-6">
      <p className="eyebrow mb-2">Card fee — $2</p>
      <p className="text-sm leading-relaxed text-foreground/90">{PURPOSE_COPY}</p>

      {receipt ? (
        <div className="mt-5 rounded-md border border-signal/40 bg-signal/10 p-4 text-sm">
          <p className="font-medium text-foreground">Paid — your card is unlocked.</p>
          <p className="mt-1 text-muted-foreground">
            Receipt {receipt.receipt_reference} · $2.00 ·{" "}
            {new Date(receipt.created_at).toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Remember: you paid for this card so you would not forget it. It is how you activate
            your bond if you are detained.
            {email
              ? " A confirmation email will follow once your sending domain is connected."
              : ""}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["print", "email", "physical"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={kind === k ? "btn-primary" : "btn-quiet"}
              >
                {k === "print" ? "Print at home" : k === "email" ? "Emailed card" : "Mailed plastic card"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {defaultMethod
              ? `Charged to your default card, ${defaultMethod.brand} •••• ${defaultMethod.last4}.`
              : "No card on file yet — the $2 is recorded now and charged to your default card once a payment processor is connected."}
          </p>
          <button className="btn-primary" disabled={busy} onClick={pay}>
            {busy ? "Processing…" : "Pay $2 and continue"}
          </button>
        </div>
      )}
    </div>
  );
}

function CardActions({
  data,
  email,
  pin,
  paidTick,
}: {
  data: WalletCardData;
  email: string | null;
  pin: string;
  paidTick: number;
}) {
  const { paidFor, loaded } = useCardPayments(paidTick);
  const unlocked = paidFor("print") || paidFor("email");

  return (
    <div className="panel p-6">
      <p className="eyebrow mb-4">Keep a copy</p>
      <div className="flex flex-wrap gap-3">
        <button
          className="btn-primary"
          onClick={() => {
            if (!unlocked) return toast.info("Pay the $2 card fee above first — it is what makes the card stick in your memory.");
            window.print();
          }}
        >
          Print card
        </button>
        <button
          className="btn-quiet"
          onClick={() => {
            if (!unlocked) return toast.info("Pay the $2 card fee above first.");
            toast.info(
              email
                ? `Emailing to ${email} needs your own sending domain connected first.`
                : "Add an email address to your account first.",
            );
          }}
        >
          Email me my card
        </button>
      </div>
      {loaded && !unlocked && (
        <p className="mt-3 text-xs text-muted-foreground">
          These options unlock after the $2 card fee above.
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Printing gives you a page at exact wallet-card size with cut marks — front and back, ready
        to trim. Your 6-digit phone PIN ({pin ? "kept off the card on purpose" : "not set"}) is
        never printed, so a lost card cannot be used by someone else.
      </p>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="eyebrow mb-1">Activation code</dt>
          <dd className="font-mono tracking-widest">{data.activationCode}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Call-in number</dt>
          <dd className="font-mono">{data.callInNumber ?? "Not set yet"}</dd>
        </div>
      </dl>
    </div>
  );
}

function PhysicalCardSection({ defaultName, paidTick }: { defaultName: string; paidTick: number }) {
  const { paidFor } = useCardPayments(paidTick);
  const physicalPaid = paidFor("physical");
  const [rows, setRows] = useState<Fulfillment[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    recipient_name: defaultName,
    address_street: "",
    address_street2: "",
    address_city: "",
    address_state: "TX",
    address_zip: "",
    note: "",
  });

  useEffect(() => {
    setForm((f) => (f.recipient_name ? f : { ...f, recipient_name: defaultName }));
  }, [defaultName]);

  async function load() {
    const { data } = await supabase
      .from("card_fulfillment_requests")
      .select("id, recipient_name, address_street, address_city, address_state, address_zip, status, created_at, tracking_reference")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Fulfillment[]);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!physicalPaid) { toast.error("Pay the $2 card fee first — choose the mailed plastic card option above."); return; }
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { toast.error("Please sign in again"); setBusy(false); return; }

    const { error } = await supabase.from("card_fulfillment_requests").insert({
      user_id: uid,
      recipient_name: form.recipient_name,
      address_street: form.address_street,
      address_street2: form.address_street2 || null,
      address_city: form.address_city,
      address_state: form.address_state,
      address_zip: form.address_zip,
      note: form.note || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Card request sent to the printer queue");
    setOpen(false);
    setForm({ ...form, address_street: "", address_street2: "", address_city: "", address_zip: "", note: "" });
    load();
  }

  async function cancel(id: string) {
    const { error } = await supabase
      .from("card_fulfillment_requests")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Request cancelled"); load(); }
  }

  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Physical card</p>
          <p className="text-sm text-muted-foreground">
            Have a printed plastic card mailed to you.
          </p>
        </div>
        <button
          className="btn-quiet"
          onClick={() => {
            if (!physicalPaid) return toast.info("Pay the $2 card fee above first — choose the mailed plastic card option.");
            setOpen((v) => !v);
          }}
        >
          {open ? "Cancel" : "Request physical card"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-5 grid gap-3">
          <input
            required
            className="field"
            placeholder="Name on the envelope"
            value={form.recipient_name}
            onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
          />
          <input
            required
            className="field"
            placeholder="Street address"
            value={form.address_street}
            onChange={(e) => setForm({ ...form, address_street: e.target.value })}
          />
          <input
            className="field"
            placeholder="Apartment, unit (optional)"
            value={form.address_street2}
            onChange={(e) => setForm({ ...form, address_street2: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              required
              className="field"
              placeholder="City"
              value={form.address_city}
              onChange={(e) => setForm({ ...form, address_city: e.target.value })}
            />
            <select
              className="field"
              value={form.address_state}
              onChange={(e) => setForm({ ...form, address_state: e.target.value })}
            >
              {US_STATES.map(([abbr, name]) => (
                <option key={abbr} value={abbr}>{abbr} — {name}</option>
              ))}
            </select>
            <input
              required
              className="field"
              placeholder="ZIP"
              value={form.address_zip}
              onChange={(e) => setForm({ ...form, address_zip: e.target.value })}
            />
          </div>
          <textarea
            className="field"
            rows={2}
            placeholder="Delivery note (optional)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <div>
            <button disabled={busy} className="btn-primary" type="submit">
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      )}

      {rows.length > 0 && (
        <div className="mt-6 divide-y divide-border border-t border-border">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm">{r.recipient_name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.address_street}, {r.address_city} {r.address_state} {r.address_zip}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="text-foreground">{FULFILLMENT_LABEL[r.status] ?? r.status}</p>
                <p>{new Date(r.created_at).toLocaleDateString()}</p>
                {r.tracking_reference && <p>Tracking {r.tracking_reference}</p>}
                {r.status === "requested" && (
                  <button className="mt-1 underline" onClick={() => cancel(r.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
