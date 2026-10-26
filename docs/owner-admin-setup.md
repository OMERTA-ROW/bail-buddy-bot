# Owner accounts & tester invitations — setup (NOT yet applied)

Status: blocked on an isolated dev backend. This project's preview and published app share one
backend, so no schema, auth-policy, or user changes were made. Apply only in an isolated draft backend first.

## Schema (apply via migration in an isolated backend)

```sql
CREATE TYPE public.app_role AS ENUM ('owner','tester','member');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles or owner reads" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner'));
-- No INSERT/UPDATE/DELETE policies: role writes only through owner-checked server code.

CREATE TABLE public.tester_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'tester' CHECK (role <> 'owner'),
  token_hash text NOT NULL UNIQUE,          -- SHA-256 only; plaintext never stored
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL,
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tester_invitations TO authenticated;
GRANT ALL ON public.tester_invitations TO service_role;
ALTER TABLE public.tester_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages invites" ON public.tester_invitations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));
```

Acceptance must be a SECURITY DEFINER function that hashes the token, checks the rules in
`src/lib/invitations.ts` (pending, unexpired, caller's verified email matches), inserts the role,
and marks the invite accepted in one transaction.

## Owner bootstrap (trusted, manual)
1. Owner signs up normally and confirms their email.
2. A project admin with database access runs, once, with the owner's real UUID:
   `INSERT INTO public.user_roles (user_id, role) VALUES ('<owner-uuid>','owner');`
No first-visitor owner, no hardcoded email.

## Limits & costs
- No app-side invitation cap. Invites are links the owner shares; nothing is emailed by this feature.
- If invite emails are added later, they need a verified sending domain; auth email volume limits
  of the backend apply. No purchases were made.

## Not changed
Signup policy, existing users, payments (still simulated), DocuSign (simulation), telephony.
