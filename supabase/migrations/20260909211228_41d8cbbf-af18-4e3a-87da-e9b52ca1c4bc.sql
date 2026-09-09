CREATE TYPE public.cosigner_status AS ENUM ('invited','documents_pending','signature_pending','verified');
CREATE TYPE public.signature_doc_type AS ENUM ('cosigner_indemnity','bond_application','disclosure_of_terms');
CREATE TYPE public.signature_doc_status AS ENUM ('draft','sent','viewed','signed','declined','voided');

CREATE TABLE public.cosigners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inmate_id uuid REFERENCES public.tracked_inmates(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date,
  phone text,
  email text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  years_at_address numeric,
  employer_name text,
  employer_phone text,
  relationship text,
  id_document_path text,
  status public.cosigner_status NOT NULL DEFAULT 'invited',
  invite_sent_at timestamptz,
  invite_channel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosigners TO authenticated;
GRANT ALL ON public.cosigners TO service_role;
ALTER TABLE public.cosigners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cosigners" ON public.cosigners FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER touch_cosigners BEFORE UPDATE ON public.cosigners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_cosigners_user ON public.cosigners(user_id);
CREATE INDEX idx_cosigners_inmate ON public.cosigners(inmate_id);

CREATE TABLE public.release_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inmate_id uuid NOT NULL UNIQUE REFERENCES public.tracked_inmates(id) ON DELETE CASCADE,
  released_to_name text NOT NULL,
  relationship text,
  phone text,
  address_street text NOT NULL,
  address_city text NOT NULL,
  address_state text NOT NULL,
  address_zip text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_plans TO authenticated;
GRANT ALL ON public.release_plans TO service_role;
ALTER TABLE public.release_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own release plans" ON public.release_plans FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER touch_release_plans BEFORE UPDATE ON public.release_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.signature_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inmate_id uuid REFERENCES public.tracked_inmates(id) ON DELETE CASCADE,
  cosigner_id uuid REFERENCES public.cosigners(id) ON DELETE CASCADE,
  doc_type public.signature_doc_type NOT NULL,
  status public.signature_doc_status NOT NULL DEFAULT 'draft',
  provider text NOT NULL DEFAULT 'docusign',
  envelope_id text,
  recipient_email text,
  recipient_name text,
  signed_document_url text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signature_documents TO authenticated;
GRANT ALL ON public.signature_documents TO service_role;
ALTER TABLE public.signature_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own signature documents" ON public.signature_documents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER touch_signature_documents BEFORE UPDATE ON public.signature_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_sigdocs_user ON public.signature_documents(user_id);
CREATE INDEX idx_sigdocs_inmate ON public.signature_documents(inmate_id);
CREATE INDEX idx_sigdocs_envelope ON public.signature_documents(envelope_id);