import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CardRow = {
  user_id: string;
  holder_name: string | null;
  email: string | null;
  activation_code: string;
  pin: string;
  call_in_number: string | null;
  tracking_active: boolean;
  card_printed_at: string | null;
};

/**
 * Card-printing export for a funding account. Owner only — emails live in the
 * auth schema, so the enrichment needs an admin read after the ownership check.
 */
export const exportCardData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { poolId: string }) => {
    if (!data?.poolId) throw new Error("poolId is required");
    return data;
  })
  .handler(async ({ data, context }): Promise<CardRow[]> => {
    const { supabase, userId } = context;

    const { data: isOwner, error: ownerErr } = await supabase.rpc("is_pool_owner", {
      _pool_id: data.poolId,
      _user_id: userId,
    });
    if (ownerErr) throw new Error(ownerErr.message);
    if (!isOwner) throw new Error("Only the account owner can export card data");

    const { data: pool, error: poolErr } = await supabase
      .from("funding_pools")
      .select("call_in_number")
      .eq("id", data.poolId)
      .maybeSingle();
    if (poolErr) throw new Error(poolErr.message);

    const { data: members, error: memberErr } = await supabase
      .from("pool_members")
      .select("user_id")
      .eq("pool_id", data.poolId);
    if (memberErr) throw new Error(memberErr.message);

    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) return [];

    const { data: activations, error: actErr } = await supabase
      .from("holder_activations")
      .select("user_id, activation_code, pin, tracking_active, card_printed_at")
      .in("user_id", ids);
    if (actErr) throw new Error(actErr.message);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emails = new Map<string, string | null>();
    for (const id of ids) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      emails.set(id, u?.user?.email ?? null);
    }

    return (activations ?? []).map((a) => ({
      user_id: a.user_id,
      holder_name: profiles?.find((p) => p.id === a.user_id)?.full_name ?? null,
      email: emails.get(a.user_id) ?? null,
      activation_code: a.activation_code,
      pin: a.pin,
      call_in_number: pool?.call_in_number ?? null,
      tracking_active: a.tracking_active,
      card_printed_at: a.card_printed_at,
    }));
  });
