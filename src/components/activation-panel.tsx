import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Activation = {
  user_id: string;
  activation_code: string;
  pin: string;
  tracking_active: boolean;
  activated_at: string | null;
  activated_via: string | null;
  deactivated_at: string | null;
};

export type ActivationEvent = {
  id: string;
  event_type: string;
  method: string;
  detail: string | null;
  created_at: string;
};

const EVENT_LABEL: Record<string, string> = {
  activated: "Tracking activated",
  deactivated: "Tracking paused",
  code_regenerated: "Code regenerated",
};

export function useActivation() {
  const [activation, setActivation] = useState<Activation | null>(null);
  const [events, setEvents] = useState<ActivationEvent[]>([]);
  const [callInNumber, setCallInNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) { setLoading(false); return; }

    const [{ data: act }, { data: evs }, { data: pools }] = await Promise.all([
      supabase
        .from("holder_activations")
        .select("user_id, activation_code, pin, tracking_active, activated_at, activated_via, deactivated_at")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("activation_events")
        .select("id, event_type, method, detail, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase.from("funding_pools").select("call_in_number").not("call_in_number", "is", null).limit(1),
    ]);

    setActivation((act as Activation | null) ?? null);
    setEvents((evs ?? []) as ActivationEvent[]);
    setCallInNumber(pools?.[0]?.call_in_number ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { activation, events, callInNumber, loading, reload: load };
}

export function ActivationPanel({ compact = false }: { compact?: boolean }) {
  const { activation, events, callInNumber, loading, reload } = useActivation();
  const [busy, setBusy] = useState(false);
  const [showPin, setShowPin] = useState(false);

  async function toggleTracking(active: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("set_tracking_active", { _active: active });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(active ? "Tracking is active" : "Tracking paused");
      reload();
    }
  }

  async function regenerate() {
    if (!confirm("Issue a new code and PIN? The old card will stop working.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("regenerate_activation_code");
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("New activation code and PIN issued");
      reload();
    }
  }

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`));
  }

  if (loading) return <div className="panel p-6 text-sm text-muted-foreground">Loading activation…</div>;
  if (!activation) return <div className="panel p-6 text-sm text-muted-foreground">No activation code on this account yet.</div>;

  const active = activation.tracking_active;

  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Tracking status</p>
            <p className={`flex items-center gap-2 font-serif text-2xl ${active ? "text-accent" : "text-muted-foreground"}`}>
              <span className="status-dot" />
              {active ? "Active" : "Not active"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {active && activation.activated_at
                ? `Activated ${new Date(activation.activated_at).toLocaleString()} ${
                    activation.activated_via === "phone" ? "by phone call" : "in the app"
                  }`
                : "Activate in the app, or call the activation line from the jail."}
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() => toggleTracking(!active)}
            className={active ? "btn-quiet" : "btn-primary"}
          >
            {active ? "Pause tracking" : "Activate tracking"}
          </button>
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Your activation card</p>
            <p className="text-xs text-muted-foreground">Keep this in your wallet. You'll need it if you call from the jail.</p>
          </div>
          <button disabled={busy} onClick={regenerate} className="btn-quiet">
            Regenerate code
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <CardField label="Activation code" value={activation.activation_code} onCopy={() => copy(activation.activation_code, "Activation code")} />
          <CardField
            label="Phone PIN"
            value={showPin ? activation.pin : "••••••"}
            onCopy={() => copy(activation.pin, "PIN")}
            extra={
              <button onClick={() => setShowPin((v) => !v)} className="text-xs text-muted-foreground underline">
                {showPin ? "Hide" : "Show"}
              </button>
            }
          />
          <CardField
            label="Call-in number"
            value={callInNumber ?? "Not set yet"}
            onCopy={callInNumber ? () => copy(callInNumber, "Call-in number") : undefined}
          />
        </div>
      </div>

      {!compact && (
        <div className="panel p-6">
          <p className="eyebrow mb-4">Activation log</p>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activation events yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {events.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm">{EVENT_LABEL[e.event_type] ?? e.event_type}</p>
                    {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{e.method === "phone" ? "Phone call" : "App"}</p>
                    <p>{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CardField({
  label,
  value,
  onCopy,
  extra,
}: {
  label: string;
  value: string;
  onCopy?: (() => void) | undefined;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="eyebrow mb-2">{label}</p>
      <p className="font-mono text-lg tracking-widest">{value}</p>
      <div className="mt-2 flex items-center gap-3">
        {onCopy && (
          <button onClick={onCopy} className="text-xs text-muted-foreground underline">
            Copy
          </button>
        )}
        {extra}
      </div>
    </div>
  );
}
