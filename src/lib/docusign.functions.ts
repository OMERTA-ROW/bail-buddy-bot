import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DocType = "cosigner_indemnity" | "bond_application" | "disclosure_of_terms";

export const DOC_LABEL: Record<DocType, string> = {
  cosigner_indemnity: "Cosigner indemnity agreement",
  bond_application: "Bond application",
  disclosure_of_terms: "Disclosure of terms",
};

export const DOC_TYPES: DocType[] = [
  "cosigner_indemnity",
  "bond_application",
  "disclosure_of_terms",
];

function documentHtml(title: string, defendant: string, signer: string) {
  return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;padding:40px">
  <h1>${title}</h1>
  <p>Defendant: <strong>${defendant}</strong></p>
  <p>Signer: <strong>${signer}</strong></p>
  <p>This agreement is provided through Postbail, a tracking and referral service.
  Postbail is not a bail bond agency. The bond itself is written and posted by a
  state-licensed bail agent. By signing you acknowledge the obligations described
  in this document.</p>
  <p style="margin-top:60px">Signature: /sig1/</p>
  <p>Date: /date1/</p>
  </body></html>`;
}

/**
 * Queue the three case documents for e-signature.
 * Uses DocuSign when credentials are present, otherwise records a simulated
 * envelope so the flow is fully exercisable before credentials land.
 */
export const sendDocumentsForSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { cosignerId: string; docTypes?: DocType[] }) => {
    if (!data?.cosignerId) throw new Error("cosignerId is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: cosigner, error } = await supabase
      .from("cosigners")
      .select("id, full_name, email, inmate_id, user_id")
      .eq("id", data.cosignerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cosigner) throw new Error("Cosigner not found");
    if (!cosigner.email) throw new Error("Add an email address for this cosigner first");

    let defendant = "the defendant";
    if (cosigner.inmate_id) {
      const { data: inmate } = await supabase
        .from("tracked_inmates")
        .select("full_name")
        .eq("id", cosigner.inmate_id)
        .maybeSingle();
      if (inmate?.full_name) defendant = inmate.full_name;
    }

    const { readDocusignConfig, createEnvelope } = await import("./docusign.server");
    const cfg = readDocusignConfig();
    const types = data.docTypes?.length ? data.docTypes : DOC_TYPES;
    const results: { docType: DocType; envelopeId: string; simulated: boolean }[] = [];

    for (const docType of types) {
      const title = DOC_LABEL[docType];
      let envelopeId: string;
      let simulated = false;

      if (cfg) {
        const html = documentHtml(title, defendant, cosigner.full_name);
        const base64 = btoa(unescape(encodeURIComponent(html)));
        const env = await createEnvelope(cfg, {
          emailSubject: `${title} — ${defendant}`,
          documentName: title,
          documentBase64: base64,
          recipientName: cosigner.full_name,
          recipientEmail: cosigner.email,
        });
        envelopeId = env.envelopeId;
      } else {
        envelopeId = `sim-${crypto.randomUUID()}`;
        simulated = true;
      }

      const { error: insErr } = await supabase.from("signature_documents").insert({
        user_id: userId,
        inmate_id: cosigner.inmate_id,
        cosigner_id: cosigner.id,
        doc_type: docType,
        status: "sent",
        provider: cfg ? "docusign" : "simulated",
        envelope_id: envelopeId,
        recipient_email: cosigner.email,
        recipient_name: cosigner.full_name,
        sent_at: new Date().toISOString(),
      });
      if (insErr) throw new Error(insErr.message);
      results.push({ docType, envelopeId, simulated });
    }

    await supabase
      .from("cosigners")
      .update({ status: "signature_pending" })
      .eq("id", cosigner.id);

    return { sent: results, live: !!cfg };
  });

/** Pull the latest envelope status from DocuSign for one document. */
export const refreshSignatureStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { documentId: string }) => {
    if (!data?.documentId) throw new Error("documentId is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: doc, error } = await supabase
      .from("signature_documents")
      .select("id, envelope_id, provider, status")
      .eq("id", data.documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found");

    const { readDocusignConfig, getEnvelopeStatus, mapEnvelopeStatus } = await import(
      "./docusign.server"
    );
    const cfg = readDocusignConfig();
    if (!cfg || doc.provider !== "docusign" || !doc.envelope_id) {
      return { status: doc.status, live: false };
    }

    const raw = await getEnvelopeStatus(cfg, doc.envelope_id);
    const status = mapEnvelopeStatus(raw);
    const now = new Date().toISOString();
    const patch = {
      status,
      ...(status === "viewed" ? { viewed_at: now } : {}),
      ...(status === "signed" ? { signed_at: now } : {}),
      ...(status === "declined" ? { declined_at: now } : {}),
    };

    const { error: upErr } = await supabase
      .from("signature_documents")
      .update(patch)
      .eq("id", doc.id);
    if (upErr) throw new Error(upErr.message);
    return { status, live: true };
  });
