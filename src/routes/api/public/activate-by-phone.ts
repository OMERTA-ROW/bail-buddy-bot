import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Phone activation endpoint.
 *
 * A telephony provider (Twilio etc.) collects the holder's numeric PIN on the
 * keypad and POSTs it here. Accepts JSON `{ pin, from }` or form-encoded
 * `Digits` / `From` so a Twilio <Gather action="..."> can point straight at it.
 *
 * Security: set PHONE_ACTIVATION_SECRET in project secrets and pass it as the
 * `x-activation-secret` header or a `?secret=` query param. When the secret is
 * configured, requests without it are rejected.
 */

const bodySchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/, "PIN must be 4-8 digits"),
  from: z.string().max(32).optional(),
  code: z.string().trim().max(24).optional(),
});

function twiml(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${message}</Say></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}

export const Route = createFileRoute("/api/public/activate-by-phone")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const wantsTwiml = url.searchParams.get("format") === "twiml";

        const expected = process.env["PHONE_ACTIVATION_SECRET"];
        if (expected) {
          const provided =
            request.headers.get("x-activation-secret") ?? url.searchParams.get("secret");
          if (provided !== expected) {
            return wantsTwiml
              ? twiml("This line is not authorized.")
              : new Response("Unauthorized", { status: 401 });
          }
        }

        let raw: { pin?: string; from?: string; code?: string } = {};
        const contentType = request.headers.get("content-type") ?? "";
        try {
          if (contentType.includes("application/json")) {
            const json = (await request.json()) as Record<string, unknown>;
            raw = {
              pin: String(json["pin"] ?? ""),
              from: json["from"] as string | undefined,
              code: (json["code"] ?? json["activation_code"]) as string | undefined,
            };
          } else {
            const form = await request.formData();
            // Twilio <Gather> posts keypad entry as Digits; a two-step IVR can
            // pass the card's activation code through as ActivationCode/code.
            raw = {
              pin: String(form.get("Digits") ?? form.get("pin") ?? ""),
              from: (form.get("From") ?? form.get("from") ?? undefined) as string | undefined,
              code: (form.get("ActivationCode") ?? form.get("code") ?? undefined) as
                | string
                | undefined,
            };
          }
        } catch {
          raw = {};
        }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return wantsTwiml
            ? twiml("Sorry, that PIN was not valid. Please try again.")
            : Response.json({ ok: false, reason: "Invalid PIN format" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("activate_tracking_by_pin", {
          _pin: parsed.data.pin,
          _caller: parsed.data.from,
        });

        if (error) {
          console.error("[activate-by-phone]", error.message);
          return wantsTwiml
            ? twiml("We could not activate tracking right now. Please try again shortly.")
            : Response.json({ ok: false, reason: "Activation failed" }, { status: 500 });
        }

        const result = (data ?? { ok: false }) as { ok: boolean; holder_name?: string | null };

        if (!result.ok) {
          return wantsTwiml
            ? twiml("That PIN was not recognized. Please check your card and try again.")
            : Response.json({ ok: false, reason: "PIN not recognized" }, { status: 404 });
        }

        return wantsTwiml
          ? twiml("Thank you. Jail tracking is now active on your account.")
          : Response.json({ ok: true });
      },
    },
  },
});
