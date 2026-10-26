// Pure, server-safe rules for owner-issued tester invitations.
// Persistence lives in the SQL in docs/owner-admin-setup.md (not yet applied:
// this project has one shared backend for preview and production).

export const ASSIGNABLE_ROLES = ["tester", "member"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
export type AppRole = AssignableRole | "owner";

export type InvitationRecord = {
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  email: string;
};

/** Only the verified owner may assign roles, and never "owner" itself. */
export function canAssignRole(actorRoles: AppRole[], target: string): target is AssignableRole {
  return actorRoles.includes("owner") && (ASSIGNABLE_ROLES as readonly string[]).includes(target);
}

/** Single-use, unexpired, unrevoked, and bound to the signed-in verified email. */
export function invitationUsable(
  inv: InvitationRecord,
  signedInEmail: string | null,
  emailVerified: boolean,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  if (inv.status === "accepted") return { ok: false, reason: "already_used" };
  if (inv.status === "revoked") return { ok: false, reason: "revoked" };
  if (new Date(inv.expires_at).getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  if (!signedInEmail || !emailVerified) return { ok: false, reason: "unverified" };
  if (signedInEmail.trim().toLowerCase() !== inv.email.trim().toLowerCase())
    return { ok: false, reason: "email_mismatch" };
  return { ok: true };
}

/** Random token shown once to the owner; only its SHA-256 hash is stored. */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function clampExpiryDays(days: number): number {
  if (!Number.isFinite(days)) return 7;
  return Math.min(30, Math.max(1, Math.round(days)));
}
