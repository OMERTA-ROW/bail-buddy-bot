import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

const searchSchema = z.object({ code: z.string().optional() });

export const Route = createFileRoute("/activate")({
  validateSearch: searchSchema,
  component: ActivatePage,
  head: () => ({
    meta: [
      { title: "Activate tracking | Bail Buddy" },
      {
        name: "description",
        content:
          "Enter the activation code from your Bail Buddy wallet card and your PIN to start jail tracking and your bond process.",
      },
      { property: "og:title", content: "Activate tracking | Bail Buddy" },
      {
        property: "og:description",
        content: "Activate jail tracking with your card code and PIN.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ActivatePage() {
  const { code: codeFromCard } = Route.useSearch();
  const [code, setCode] = useState(codeFromCard ?? "");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/public/activate-by-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), pin: pin.trim() }),
      });
      const json = (await res.json()) as { ok: boolean; reason?: string; holder_name?: string | null };
      setResult(
        json.ok
          ? { ok: true, message: `Tracking is now active${json.holder_name ? ` for ${json.holder_name}` : ""}.` }
          : { ok: false, message: json.reason ?? "We could not activate that account." },
      );
    } catch {
      setResult({ ok: false, message: "Network problem. Please try again." });
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <p className="eyebrow mb-2">Activation</p>
      <h1 className="text-4xl">Start tracking now</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Enter the activation code printed on the wallet card, plus the member's 6-digit PIN. Both
        are needed so a lost card on its own can't be used.
      </p>

      <form onSubmit={submit} className="panel mt-8 space-y-4 p-6">
        <div>
          <label className="eyebrow mb-2 block" htmlFor="code">Activation code</label>
          <input
            id="code"
            required
            className="field font-mono tracking-widest uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXXXXXX"
          />
        </div>
        <div>
          <label className="eyebrow mb-2 block" htmlFor="pin">Phone PIN</label>
          <input
            id="pin"
            required
            inputMode="numeric"
            className="field font-mono tracking-widest"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="••••••"
          />
        </div>
        <button disabled={busy} className="btn-primary" type="submit">
          {busy ? "Activating…" : "Activate tracking"}
        </button>

        {result && (
          <p className={`text-sm ${result.ok ? "text-accent" : "text-alert"}`}>{result.message}</p>
        )}
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        Activating starts jail tracking and the bond authorization process. Bonds are posted by
        state-licensed bail agents, not by Bail Buddy.
      </p>
    </div>
  );
}
