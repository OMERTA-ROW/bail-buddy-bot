/**
 * DocuSign integration layer (server only).
 *
 * Credentials are read from secrets at call time and never reach the client:
 *   DOCUSIGN_INTEGRATION_KEY  (client id of the DocuSign app)
 *   DOCUSIGN_USER_ID          (API user GUID that impersonates)
 *   DOCUSIGN_ACCOUNT_ID       (API account GUID)
 *   DOCUSIGN_PRIVATE_KEY      (RSA private key, PEM, for JWT grant)
 *   DOCUSIGN_BASE_URI         (e.g. https://demo.docusign.net/restapi)
 *   DOCUSIGN_OAUTH_HOST       (account-d.docusign.com | account.docusign.com)
 *
 * When the secrets are absent the app runs in simulation mode: envelopes get a
 * local reference id so the whole signing flow is exercisable end to end.
 */

export type DocusignConfig = {
  integrationKey: string;
  userId: string;
  accountId: string;
  privateKey: string;
  baseUri: string;
  oauthHost: string;
};

export function readDocusignConfig(): DocusignConfig | null {
  const integrationKey = process.env["DOCUSIGN_INTEGRATION_KEY"];
  const userId = process.env["DOCUSIGN_USER_ID"];
  const accountId = process.env["DOCUSIGN_ACCOUNT_ID"];
  const privateKey = process.env["DOCUSIGN_PRIVATE_KEY"];
  if (!integrationKey || !userId || !accountId || !privateKey) return null;
  return {
    integrationKey,
    userId,
    accountId,
    privateKey,
    baseUri: process.env["DOCUSIGN_BASE_URI"] ?? "https://demo.docusign.net/restapi",
    oauthHost: process.env["DOCUSIGN_OAUTH_HOST"] ?? "account-d.docusign.com",
  };
}

function b64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

/** JWT grant flow — exchanges a signed assertion for an access token. */
export async function getAccessToken(cfg: DocusignConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: cfg.integrationKey,
      sub: cfg.userId,
      aud: cfg.oauthHost,
      iat: now,
      exp: now + 3600,
      scope: "signature impersonation",
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(cfg.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  const assertion = `${header}.${payload}.${b64url(sig)}`;

  const res = await fetch(`https://${cfg.oauthHost}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`DocuSign auth failed (${res.status})`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export type EnvelopeRequest = {
  emailSubject: string;
  documentName: string;
  documentBase64: string;
  recipientName: string;
  recipientEmail: string;
};

export async function createEnvelope(
  cfg: DocusignConfig,
  req: EnvelopeRequest,
): Promise<{ envelopeId: string }> {
  const token = await getAccessToken(cfg);
  const res = await fetch(`${cfg.baseUri}/v2.1/accounts/${cfg.accountId}/envelopes`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      emailSubject: req.emailSubject,
      status: "sent",
      documents: [
        {
          documentBase64: req.documentBase64,
          name: req.documentName,
          fileExtension: "html",
          documentId: "1",
        },
      ],
      recipients: {
        signers: [
          {
            email: req.recipientEmail,
            name: req.recipientName,
            recipientId: "1",
            tabs: {
              signHereTabs: [
                { anchorString: "/sig1/", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "0" },
              ],
              dateSignedTabs: [
                { anchorString: "/date1/", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "0" },
              ],
            },
          },
        ],
      },
    }),
  });
  if (!res.ok) throw new Error(`DocuSign envelope create failed (${res.status})`);
  const json = (await res.json()) as { envelopeId: string };
  return { envelopeId: json.envelopeId };
}

export async function getEnvelopeStatus(
  cfg: DocusignConfig,
  envelopeId: string,
): Promise<string> {
  const token = await getAccessToken(cfg);
  const res = await fetch(
    `${cfg.baseUri}/v2.1/accounts/${cfg.accountId}/envelopes/${envelopeId}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`DocuSign envelope read failed (${res.status})`);
  const json = (await res.json()) as { status: string };
  return json.status;
}

export type SigStatus = "sent" | "viewed" | "signed" | "declined" | "voided";

/** Maps DocuSign envelope status onto our signature_doc_status enum. */
export function mapEnvelopeStatus(status: string): SigStatus {
  switch (status.toLowerCase()) {
    case "sent":
    case "created":
      return "sent";
    case "delivered":
      return "viewed";
    case "completed":
      return "signed";
    case "declined":
      return "declined";
    case "voided":
      return "voided";
    default:
      return "sent";
  }
}
