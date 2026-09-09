import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usd, usdPrecise, parseDollars } from "@/lib/money";
import { listPoolMembers, addPoolMemberByEmail, type PoolMemberRow } from "@/lib/pool.functions";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

type MemberPatch = {
  can_draw?: boolean;
  spend_limit_cents?: number | null;
  card_fallback_consent?: boolean;
};

type Pool = {
  id: string;
  name: string;
  owner_id: string;
  balance_cents: number;
  allow_card_fallback: boolean;
};

type Contribution = {
  id: string;
  contributor_id: string;
  amount_cents: number;
  note: string | null;
  created_at: string;
};

type Disbursement = {
  id: string;
  amount_cents: number;
  source: string;
  status: string;
  failure_reason: string | null;
  created_at: string;
  inmate_id: string | null;
};

const STATUS_TONE: Record<string, string> = {
  authorized: "text-signal",
  routed_to_agent: "text-accent",
  completed: "text-emerald-600",
  failed: "text-alert",
  cancelled: "text-muted-foreground",
  pending: "text-muted-foreground",
};

function AccountPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [members, setMembers] = useState<PoolMemberRow[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useServerFn(listPoolMembers);
  const inviteMember = useServerFn(addPoolMemberByEmail);

  const pool = pools.find((p) => p.id === activeId) ?? null;
  const isOwner = !!pool && !!uid && pool.owner_id === uid;
  const me = members.find((m) => m.user_id === uid) ?? null;

  const loadPools = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const id = userRes.user?.id ?? null;
    setUid(id);
    if (!id) return;

    const { data, error } = await supabase
      .from("funding_pools")
      .select("id, name, owner_id, balance_cents, allow_card_fallback")
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    const rows = (data ?? []) as Pool[];
    setPools(rows);
    setActiveId((prev) => prev ?? rows[0]?.id ?? null);
    setLoading(false);
  }, []);

  const loadDetail = useCallback(
    async (poolId: string) => {
      const [c, d] = await Promise.all([
        supabase
          .from("pool_contributions")
          .select("id, contributor_id, amount_cents, note, created_at")
          .eq("pool_id", poolId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("disbursements")
          .select("id, amount_cents, source, status, failure_reason, created_at, inmate_id")
          .eq("pool_id", poolId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setContributions((c.data ?? []) as Contribution[]);
      setPayouts((d.data ?? []) as Disbursement[]);

      try {
        setMembers(await fetchMembers({ data: { poolId } }));
      } catch (e) {
        setMembers([]);
        toast.error(e instanceof Error ? e.message : "Could not load holders");
      }
    },
    [fetchMembers],
  );

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  useEffect(() => {
    if (activeId) loadDetail(activeId);
  }, [activeId, loadDetail]);

  async function createPool(name: string) {
    if (!uid) return;
    const { data, error } = await supabase
      .from("funding_pools")
      .insert({ name, owner_id: uid })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    toast.success("Funding account created");
    setActiveId(data.id);
    loadPools();
  }

  async function addFunds(amount: string, note: string) {
    if (!pool) return;
    const cents = parseDollars(amount);
    if (!cents) {
      toast.error("Enter a valid dollar amount");
      return;
    }
    const { error } = await supabase.rpc("contribute_to_pool", {
      _pool_id: pool.id,
      _amount_cents: cents,
      _note: note || undefined,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Added ${usd(cents)} to ${pool.name}`);
    await loadPools();
    await loadDetail(pool.id);
  }

  async function patchMember(memberId: string, patch: MemberPatch) {
    const { error } = await supabase.from("pool_members").update(patch).eq("id", memberId);
    if (error) return toast.error(error.message);
    if (activeId) loadDetail(activeId);
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase.from("pool_members").delete().eq("id", memberId);
    if (error) return toast.error(error.message);
    toast.success("Holder removed");
    if (activeId) loadDetail(activeId);
  }

  async function invite(email: string) {
    if (!pool) return;
    try {
      await inviteMember({ data: { poolId: pool.id, email } });
      toast.success("Holder added");
      loadDetail(pool.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add holder");
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!pool) return <NoPool onCreate={createPool} />;

  return (
    <div className="space-y-12">
      <ComplianceNotice />

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-2">Main funding account</p>
          {pools.length > 1 ? (
            <select
              className="bg-transparent font-serif text-4xl outline-none"
              value={pool.id}
              onChange={(e) => setActiveId(e.target.value)}
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <h1 className="text-4xl">{pool.name}</h1>
          )}
        </div>
        <div className="text-right">
          <p className="eyebrow mb-1">Available balance</p>
          <p className="font-serif text-5xl tabular-nums">{usdPrecise(pool.balance_cents)}</p>
        </div>
      </header>

      <AddFunds onSubmit={addFunds} />

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-serif text-2xl">Account holders</h2>
          <Link to="/payment-methods" className="text-sm text-muted-foreground underline hover:text-foreground">
            Your payment methods →
          </Link>
        </div>
        <MemberTable
          members={members}
          isOwner={isOwner}
          uid={uid}
          onPatch={patchMember}
          onRemove={removeMember}
        />
        {isOwner && <InviteRow onInvite={invite} />}
        {!isOwner && me && (
          <p className="mt-4 text-xs text-muted-foreground">
            Draw permission and spending limits are set by the account owner. You control only your own
            backup-card consent.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-serif text-2xl">Activation & wallet card</h2>
        <ActivationPanel />
      </section>

      {isOwner && (
        <section className="grid gap-10 md:grid-cols-2">
          <CallInSettings
            poolId={pool.id}
            current={pool.call_in_number}
            onSaved={loadPools}
          />
          <CardExport poolId={pool.id} />
        </section>
      )}



      <div className="grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="mb-4 font-serif text-2xl">Contributions</h2>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contributions yet.</p>
          ) : (
            <ul className="border-t border-border">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
                  <div>
                    <p className="text-sm">
                      {c.contributor_id === uid ? "You" : shortId(c.contributor_id)}
                    </p>
                    {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg tabular-nums text-emerald-600">
                      +{usdPrecise(c.amount_cents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-serif text-2xl">Payout history</h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts requested yet.</p>
          ) : (
            <ul className="border-t border-border">
              {payouts.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
                  <div>
                    <p className={`text-sm ${STATUS_TONE[d.status] ?? ""}`}>
                      {d.status.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.source === "pool" ? "Shared account" : "Personal backup card"}
                      {d.failure_reason ? ` — ${d.failure_reason}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg tabular-nums">−{usdPrecise(d.amount_cents)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function shortId(id: string) {
  return `Holder ${id.slice(0, 8)}`;
}

function ComplianceNotice() {
  return (
    <div className="rounded-md border border-signal/40 bg-signal/10 p-4 text-xs leading-relaxed">
      <p className="font-medium text-foreground">How the funding account actually works</p>
      <p className="mt-1 text-muted-foreground">
        Postbail is not a bail agency and not a money transmitter. This account is an earmarked ledger:
        when a bond is set, an authorized amount is reserved and routed to a state-licensed bail agent who
        posts the bond. Postbail never pays a jail directly. Card details are held by a payment processor —
        we store only the brand and last four digits.
      </p>
    </div>
  );
}

function NoPool({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("Main funding account");
  return (
    <div className="space-y-8">
      <ComplianceNotice />
      <div className="rounded-lg border border-dashed border-border p-16 text-center">
        <p className="eyebrow mb-3">No funding account</p>
        <h1 className="text-3xl">Open the shared account</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          One pooled account funds bonds for everyone you add. You'll control who can draw from it and how
          much each person may spend.
        </p>
        <div className="mx-auto mt-8 flex max-w-sm gap-2">
          <input
            className="pm-input flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name"
          />
          <button
            onClick={() => name.trim() && onCreate(name.trim())}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create
          </button>
        </div>
      </div>
      <FieldStyles />
    </div>
  );
}

function AddFunds({ onSubmit }: { onSubmit: (amount: string, note: string) => Promise<void> }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit(amount, note);
        setBusy(false);
        setAmount("");
        setNote("");
      }}
      className="flex flex-wrap items-end gap-3 rounded-md border border-border p-4"
    >
      <label className="block">
        <span className="eyebrow mb-1.5 block">Add funds</span>
        <input
          className="pm-input w-40"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$2,500"
          inputMode="decimal"
        />
      </label>
      <label className="block flex-1 min-w-52">
        <span className="eyebrow mb-1.5 block">Note</span>
        <input
          className="pm-input w-full"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Adding…" : "Contribute"}
      </button>
      <FieldStyles />
    </form>
  );
}

function MemberTable({
  members,
  isOwner,
  uid,
  onPatch,
  onRemove,
}: {
  members: PoolMemberRow[];
  isOwner: boolean;
  uid: string | null;
  onPatch: (id: string, patch: MemberPatch) => void;
  onRemove: (id: string) => void;
}) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No holders yet.</p>;
  }

  return (
    <div className="border-t border-border">
      {members.map((m) => {
        const isMe = m.user_id === uid;
        return (
          <div
            key={m.id}
            className="grid grid-cols-1 gap-3 border-b border-border py-4 md:grid-cols-[1.4fr_auto_1fr_1fr_auto] md:items-center"
          >
            <div>
              <p className="text-sm">
                {m.full_name || m.email || shortId(m.user_id)}
                {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
              </p>
              {m.email && m.full_name && <p className="text-xs text-muted-foreground">{m.email}</p>}
            </div>

            <span className="eyebrow">{m.role}</span>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={m.can_draw}
                disabled={!isOwner}
                onChange={(e) => onPatch(m.id, { can_draw: e.target.checked })}
              />
              May draw from pool
            </label>

            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Limit</span>
              <input
                className="pm-input w-28"
                defaultValue={m.spend_limit_cents != null ? String(m.spend_limit_cents / 100) : ""}
                disabled={!isOwner}
                placeholder="No limit"
                inputMode="decimal"
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  const next = raw === "" ? null : parseDollars(raw);
                  if (raw !== "" && next == null) { toast.error("Enter a valid amount"); return; }
                  if (next !== m.spend_limit_cents) onPatch(m.id, { spend_limit_cents: next });
                }}
              />
            </label>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={m.card_fallback_consent}
                  disabled={!isMe}
                  onChange={(e) => onPatch(m.id, { card_fallback_consent: e.target.checked })}
                />
                Card backup
              </label>
              {isOwner && m.role !== "owner" && (
                <button
                  onClick={() => onRemove(m.id)}
                  className="text-xs text-alert hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        );
      })}
      <FieldStyles />
    </div>
  );
}

function InviteRow({ onInvite }: { onInvite: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onInvite(email);
        setBusy(false);
        setEmail("");
      }}
      className="mt-4 flex gap-2"
    >
      <input
        className="pm-input flex-1"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="holder@email.com"
        type="email"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md border border-input px-4 py-2 text-sm hover:bg-secondary disabled:opacity-60"
      >
        {busy ? "Adding…" : "Add holder"}
      </button>
      <FieldStyles />
    </form>
  );
}

function FieldStyles() {
  return (
    <style>{`
      .pm-input { border:1px solid var(--color-input); background:var(--color-background); padding:.5rem .7rem; border-radius:4px; font-size:.9rem; outline:none; }
      .pm-input:focus { border-color: var(--color-primary); }
      .pm-input:disabled { opacity:.55; }
    `}</style>
  );
}
