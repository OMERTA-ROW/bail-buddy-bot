import { describe, expect, it } from "vitest";
import { canAssignRole, clampExpiryDays, generateInviteToken, hashInviteToken, invitationUsable } from "./invitations";

const base = { status: "pending" as const, expires_at: "2026-11-01T00:00:00Z", email: "Tester@Example.com" };
const now = new Date("2026-10-26T00:00:00Z");

describe("role assignment", () => {
  it("non-owner cannot assign roles (escalation)", () => expect(canAssignRole(["tester"], "member")).toBe(false));
  it("owner cannot grant owner", () => expect(canAssignRole(["owner"], "owner")).toBe(false));
  it("owner can grant tester", () => expect(canAssignRole(["owner"], "tester")).toBe(true));
});

describe("invitation use", () => {
  it("accepts matching verified email", () => expect(invitationUsable(base, "tester@example.com", true, now).ok).toBe(true));
  it("rejects signed-out", () => expect(invitationUsable(base, null, false, now)).toEqual({ ok: false, reason: "unverified" }));
  it("rejects other user's invite", () => expect(invitationUsable(base, "other@example.com", true, now)).toEqual({ ok: false, reason: "email_mismatch" }));
  it("is single-use", () => expect(invitationUsable({ ...base, status: "accepted" }, "tester@example.com", true, now)).toEqual({ ok: false, reason: "already_used" }));
  it("rejects revoked", () => expect(invitationUsable({ ...base, status: "revoked" }, "tester@example.com", true, now)).toEqual({ ok: false, reason: "revoked" }));
  it("rejects expired", () => expect(invitationUsable(base, "tester@example.com", true, new Date("2026-11-02T00:00:00Z"))).toEqual({ ok: false, reason: "expired" }));
});

describe("tokens", () => {
  it("are 64 hex chars and unique", () => {
    const a = generateInviteToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(generateInviteToken());
  });
  it("hash deterministically, never equal to token", async () => {
    const t = generateInviteToken();
    expect(await hashInviteToken(t)).toBe(await hashInviteToken(t));
    expect(await hashInviteToken(t)).not.toBe(t);
  });
  it("expiry clamps to 1..30 days", () => {
    expect(clampExpiryDays(0)).toBe(1);
    expect(clampExpiryDays(90)).toBe(30);
  });
});
