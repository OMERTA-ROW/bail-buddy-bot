import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Card activation endpoint. Requires BOTH the printed activation code and the
 * holder's numeric PIN, so a lost card alone cannot activate an account.
 */

const bodySchema = z.object({
  code: z.string().trim().min(6).max(24),
  pin: z.string().regex(/^\d{4,8}$/, "PIN must be 4-8 digits"),
});

export const Route = createFileRoute("/api/public/activate-by-card")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown = {};
        try {
          raw = await request.json();
        } catch {
          raw = {};
        }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { ok: false, reason: "Enter the activation code from your card and your PIN." },
            { status: 400 },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("activate_tracking_by_pin", {
          _pin: parsed.data.pin,
          _caller: "web card activation",
          _activation_code: parsed.data.code,
        });

        if (error) {
          console.error("[activate-by-card]", error.message);
          return Response.json({ ok: false, reason: "Activation failed" }, { status: 500 });
        }

        const result = (data ?? { ok: false }) as { ok: boolean; holder_name?: string | null };
        if (!result.ok) {
          return Response.json(
            { ok: false, reason: "That code and PIN do not match an account." },
            { status: 404 },
          );
        }

        return Response.json({ ok: true, holder_name: result.holder_name ?? null });
      },
    },
  },
});
