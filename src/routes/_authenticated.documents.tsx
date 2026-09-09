import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DocBadge } from "@/components/status-badges";
import { DOC_LABEL, refreshSignatureStatus, type DocType } from "@/lib/docusign.functions";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DocumentsPage,
  head: () => ({
    meta: [
      { title: "Documents on file | Postbail" },
      {
        name: "description",
        content:
          "Every signed bond document per case — indemnity agreement, bond application and disclosure of terms with signature status and timestamps.",
      },
      { property: "og:title", content: "Documents on file | Postbail" },
      {
        property: "og:description",
        content: "Signature status and signed document references for each case.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Doc = {
  id: string;
  inmate_id: string | null;
  cosigner_id: string | null;
  doc_type: DocType;
  status: string;
  provider: string;
  envelope_id: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  signed_document_url: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  created_at: string;
};

function ts(v: string | null) {
  return v ? new Date(v).toLocaleString() : "—";
}

function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: d, error }, { data: inmates }] = await Promise.all([
      supabase.from("signature_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("tracked_inmates").select("id, full_name"),
    ]);
    if (error) toast.error(error.message);
    setDocs((d ?? []) as Doc[]);
    setNames(Object.fromEntries((inmates ?? []).map((i) => [i.id, i.full_name])));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const byCase = docs.reduce<Record<string, Doc[]>>((acc, d) => {
    const key = d.inmate_id ?? "unassigned";
    (acc[key] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-10">
        <p className="eyebrow mb-2">Case file</p>
        <h1 className="text-4xl">Documents on file</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Indemnity agreements, bond applications and disclosures sent for e-signature, with a
          full timestamped trail per case.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : docs.length === 0 ? (
        <div className="panel p-16 text-center">
          <h2 className="text-2xl">Nothing sent yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Add a cosigner and send their paperwork for signature — it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(byCase).map(([caseKey, list]) => (
            <section key={caseKey}>
              <h2 className="text-2xl">{names[caseKey] ?? "Unassigned case"}</h2>
              <div className="mt-4 space-y-3">
                {list.map((d) => (
                  <DocRow key={d.id} doc={d} onChanged={load} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DocRow({ doc, onChanged }: { doc: Doc; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const res = await refreshSignatureStatus({ data: { documentId: doc.id } });
      toast.success(
        res.live ? `Status: ${res.status}` : "No DocuSign keys yet — status unchanged",
      );
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not refresh");
    }
    setBusy(false);
  }

  async function mark(status: "viewed" | "signed" | "declined") {
    setBusy(true);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status };
    if (status === "viewed") patch["viewed_at"] = now;
    if (status === "signed") {
      patch["signed_at"] = now;
      patch["signed_document_url"] = `simulated://envelope/${doc.envelope_id}`;
    }
    if (status === "declined") patch["declined_at"] = now;
    const { error } = await supabase.from("signature_documents").update(patch).eq("id", doc.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChanged();
  }

  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-xl">{DOC_LABEL[doc.doc_type] ?? doc.doc_type}</p>
          <p className="text-xs text-muted-foreground">
            {doc.recipient_name ?? "Recipient"}
            {doc.recipient_email ? ` · ${doc.recipient_email}` : ""} ·{" "}
            {doc.provider === "docusign" ? "DocuSign" : "Simulated"}
          </p>
        </div>
        <DocBadge status={doc.status} />
      </div>

      <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-4">
        <p>Sent {ts(doc.sent_at)}</p>
        <p>Viewed {ts(doc.viewed_at)}</p>
        <p>Signed {ts(doc.signed_at)}</p>
        <p>Declined {ts(doc.declined_at)}</p>
      </div>

      {doc.signed_document_url && (
        <p className="mt-3 break-all text-xs text-accent">Signed copy: {doc.signed_document_url}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button disabled={busy} onClick={refresh} className="btn-quiet">
          Refresh status
        </button>
        {doc.provider !== "docusign" && doc.status !== "signed" && (
          <>
            <button disabled={busy} onClick={() => mark("viewed")} className="btn-quiet">
              Mark viewed
            </button>
            <button disabled={busy} onClick={() => mark("signed")} className="btn-quiet">
              Mark signed
            </button>
            <button disabled={busy} onClick={() => mark("declined")} className="btn-quiet text-destructive">
              Mark declined
            </button>
          </>
        )}
      </div>
    </div>
  );
}
