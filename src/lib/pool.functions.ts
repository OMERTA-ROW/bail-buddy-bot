import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PoolMemberRow = {
  id: string;
  user_id: string;
  role: "owner" | "member";
  can_draw: boolean;
  spend_limit_cents: number | null;
  card_fallback_consent: boolean;
  email: string | null;
  full_name: string | null;
};

/**
 * Roster for a funding pool, enriched with each holder's email.
 * Emails live in the auth schema, so this needs an admin read — gated on the
 * caller actually being a member of the pool.
 */
export const listPoolMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { poolId: string }) => {
    if (!data?.poolId) throw new Error("poolId is required");
    return data;
  })
  .handler(async ({ data, context }): Promise<PoolMemberRow[]> => {
    const { supabase, userId } = context;

    const { data: isMember, error: memberErr } = await supabase.rpc("is_pool_member", {
      _pool_id: data.poolId,
      _user_id: userId,
    });
    if (memberErr) throw new Error(memberErr.message);
    if (!isMember) throw new Error("You are not a member of this funding account");

    const { data: rows, error } = await supabase
      .from("pool_members")
      .select("id, user_id, role, can_draw, spend_limit_cents, card_fallback_consent")
      .eq("pool_id", data.poolId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!rows?.length) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", rows.map((r) => r.user_id));
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    const enriched = await Promise.all(
      rows.map(async (r) => {
        let email: string | null = null;
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
          email = u?.user?.email ?? null;
        } catch {
          email = null;
        }
        return {
          ...r,
          role: r.role as "owner" | "member",
          email,
          full_name: nameById.get(r.user_id) ?? null,
        };
      }),
    );

    return enriched;
  });

/** Owner-only: invite an existing account holder to the pool by email. */
export const addPoolMemberByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { poolId: string; email: string }) => {
    if (!data?.poolId) throw new Error("poolId is required");
    const email = (data.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
    return { poolId: data.poolId, email };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isOwner, error: ownerErr } = await supabase.rpc("is_pool_owner", {
      _pool_id: data.poolId,
      _user_id: userId,
    });
    if (ownerErr) throw new Error(ownerErr.message);
    if (!isOwner) throw new Error("Only the account owner can add holders");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);

    const match = list.users.find((u) => u.email?.toLowerCase() === data.email);
    if (!match) {
      throw new Error("No Postbail account with that email. Ask them to sign up first.");
    }

    const { error: insErr } = await supabaseAdmin.from("pool_members").insert({
      pool_id: data.poolId,
      user_id: match.id,
      role: "member",
      can_draw: false,
      card_fallback_consent: false,
    });
    if (insErr) {
      if (insErr.code === "23505") throw new Error("That holder is already on this account");
      throw new Error(insErr.message);
    }

    return { ok: true, userId: match.id };
  });
