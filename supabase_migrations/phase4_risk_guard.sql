-- =====================================================================
-- Hockey Risk Guard — Phase 4 (final): Admin tools, matrix/guidance
-- editing RPCs, sample data clearing, venues, sensitive audit hardening.
--
-- Assumes Phase 1–3 migrations are already applied. Idempotent where
-- practical so re-running this file is safe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Venues table (Settings → Clubs/Teams/Venues)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rg_venues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rg_venues_name_unique
  ON public.rg_venues (lower(name));

DROP TRIGGER IF EXISTS rg_venues_updated_at ON public.rg_venues;
CREATE TRIGGER rg_venues_updated_at
  BEFORE UPDATE ON public.rg_venues
  FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

ALTER TABLE public.rg_venues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS rg_venues_select ON public.rg_venues';
  EXECUTE 'CREATE POLICY rg_venues_select ON public.rg_venues
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_venues_insert ON public.rg_venues';
  EXECUTE 'CREATE POLICY rg_venues_insert ON public.rg_venues
            FOR INSERT TO authenticated
            WITH CHECK (public.can_edit_risk_matrix(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_venues_update ON public.rg_venues';
  EXECUTE 'CREATE POLICY rg_venues_update ON public.rg_venues
            FOR UPDATE TO authenticated
            USING (public.can_edit_risk_matrix(auth.uid()))
            WITH CHECK (public.can_edit_risk_matrix(auth.uid()))';
END $$;

-- ---------------------------------------------------------------------
-- 2. Seed any missing guidance sections (safe / idempotent)
-- ---------------------------------------------------------------------
-- Defensive: dedupe by section_key (keep oldest), then ensure unique index
-- exists before the ON CONFLICT (section_key) clause is used below.
WITH duplicates AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY section_key
           ORDER BY created_at, id
         ) AS rn
  FROM public.rg_risk_guidance_sections
)
DELETE FROM public.rg_risk_guidance_sections
 WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS rg_risk_guidance_sections_section_key_unique
  ON public.rg_risk_guidance_sections (section_key);

INSERT INTO public.rg_risk_guidance_sections (section_key, title, content, sort_order)
VALUES
  ('introduction',          'Introduction and Purpose',
   'This Risk Management Framework helps the association identify, assess, treat and review strategic and operational risks consistently.',
   10),
  ('strategic_vs_operational', 'Strategic vs Operational Risks',
   'Strategic risks affect long-term direction (governance, reputation, financial sustainability). Operational risks affect day-to-day delivery (events, umpire supply, facilities, member safety).',
   20),
  ('response_guide',        'Risk Response Guide',
   'Choose a treatment that matches the rating: Low — accept and monitor. Medium — manage with controls. High — active treatment plan and owner. Very High — escalate, treat urgently and review frequently.',
   30),
  ('likelihood_scale',      'Likelihood Scale',
   '1 Rare · 2 Unlikely · 3 Possible · 4 Likely · 5 Almost Certain.',
   40),
  ('consequence_scale',     'Consequence Scale',
   '1 Insignificant · 2 Minor · 3 Moderate · 4 Major · 5 Severe.',
   50),
  ('category_definitions',  'Risk Category Definitions',
   'Governance, Financial, Operational, People & Safety, Reputation, Compliance, Technology, Strategic.',
   60),
  ('ownership_escalation',  'Ownership and Escalation',
   'Every risk has an owner. High and Very High risks escalate to the President and Committee. Sensitive matters escalate to the Super Admin.',
   70),
  ('linking_records',       'Linking Records',
   'Risks link to BE SMART Actions for treatment, Quality Improvement items for improvement initiatives, and Risk Reviews for periodic reassessment.',
   80)
ON CONFLICT (section_key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Helper: write sensitive audit row (used by RPCs below)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._rg_audit_write(
  p_action_type text,
  p_entity_type text,
  p_entity_id   uuid,
  p_field       text,
  p_old         text,
  p_new         text,
  p_reason      text,
  p_sensitive   boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_user_role text;
BEGIN
  SELECT COALESCE(p.full_name, p.email, v_user_id::text)
    INTO v_user_name FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;
  SELECT string_agg(role::text, ',') INTO v_user_role
    FROM public.user_roles WHERE user_id = v_user_id;

  INSERT INTO public.rg_audit_log
    (user_id, user_name, user_role, action_type, entity_type, entity_id,
     field_changed, previous_value, new_value, reason_for_change, is_sensitive)
  VALUES
    (v_user_id, v_user_name, v_user_role, p_action_type, p_entity_type, p_entity_id,
     p_field, p_old, p_new, p_reason, p_sensitive);
END $$;

REVOKE ALL ON FUNCTION public._rg_audit_write(text,text,uuid,text,text,text,text,boolean) FROM PUBLIC;

-- ---------------------------------------------------------------------
-- 4. RPC: rg_update_matrix_cell
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rg_update_matrix_cell(
  p_likelihood_score   integer,
  p_consequence_score  integer,
  p_new_rating         text,
  p_reason_for_change  text
) RETURNS public.rg_risk_matrix
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old public.rg_risk_matrix%ROWTYPE;
  v_new public.rg_risk_matrix%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.can_edit_risk_matrix(v_uid) THEN
    RAISE EXCEPTION 'Not authorised to edit the risk matrix';
  END IF;
  IF p_new_rating NOT IN ('Low','Medium','High','Very High') THEN
    RAISE EXCEPTION 'Invalid rating: %', p_new_rating;
  END IF;
  IF p_reason_for_change IS NULL OR length(btrim(p_reason_for_change)) = 0 THEN
    RAISE EXCEPTION 'Reason for change is required';
  END IF;

  SELECT * INTO v_old
    FROM public.rg_risk_matrix
   WHERE likelihood_score = p_likelihood_score
     AND consequence_score = p_consequence_score
   LIMIT 1;
  IF v_old.id IS NULL THEN
    RAISE EXCEPTION 'Matrix cell not found for L=% C=%', p_likelihood_score, p_consequence_score;
  END IF;

  UPDATE public.rg_risk_matrix
     SET rating = p_new_rating
   WHERE id = v_old.id
   RETURNING * INTO v_new;

  PERFORM public._rg_audit_write(
    'update', 'rg_risk_matrix', v_old.id,
    'rating', v_old.rating, v_new.rating,
    p_reason_for_change, true
  );

  RETURN v_new;
END $$;

GRANT EXECUTE ON FUNCTION public.rg_update_matrix_cell(integer,integer,text,text) TO authenticated;

-- ---------------------------------------------------------------------
-- 5. RPC: rg_update_guidance_section
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rg_update_guidance_section(
  p_section_key       text,
  p_title             text,
  p_content           text,
  p_reason_for_change text
) RETURNS public.rg_risk_guidance_sections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old public.rg_risk_guidance_sections%ROWTYPE;
  v_new public.rg_risk_guidance_sections%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_edit_risk_matrix(v_uid) THEN
    RAISE EXCEPTION 'Not authorised to edit guidance';
  END IF;
  IF p_reason_for_change IS NULL OR length(btrim(p_reason_for_change)) = 0 THEN
    RAISE EXCEPTION 'Reason for change is required';
  END IF;

  SELECT * INTO v_old FROM public.rg_risk_guidance_sections
   WHERE section_key = p_section_key LIMIT 1;
  IF v_old.id IS NULL THEN
    RAISE EXCEPTION 'Guidance section not found: %', p_section_key;
  END IF;

  UPDATE public.rg_risk_guidance_sections
     SET title   = COALESCE(p_title, title),
         content = COALESCE(p_content, content)
   WHERE id = v_old.id
   RETURNING * INTO v_new;

  IF v_old.title IS DISTINCT FROM v_new.title THEN
    PERFORM public._rg_audit_write(
      'update','rg_risk_guidance_sections', v_old.id,
      'title', v_old.title, v_new.title, p_reason_for_change, true
    );
  END IF;
  IF v_old.content IS DISTINCT FROM v_new.content THEN
    PERFORM public._rg_audit_write(
      'update','rg_risk_guidance_sections', v_old.id,
      'content',
      left(coalesce(v_old.content,''), 500),
      left(coalesce(v_new.content,''), 500),
      p_reason_for_change, true
    );
  END IF;

  RETURN v_new;
END $$;

GRANT EXECUTE ON FUNCTION public.rg_update_guidance_section(text,text,text,text) TO authenticated;

-- ---------------------------------------------------------------------
-- 6. RPC: rg_set_user_role  (add or remove a role with audit)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rg_set_user_role(
  p_user_id           uuid,
  p_role              text,
  p_grant             boolean,
  p_reason_for_change text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_super boolean;
  v_is_president boolean;
  v_sensitive boolean;
  v_existing boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT public.has_role(v_uid, 'super_admin'::public.app_role) INTO v_is_super;
  SELECT public.has_role(v_uid, 'president'::public.app_role)   INTO v_is_president;

  -- Permission rules
  IF p_role IN ('super_admin','president') THEN
    IF NOT v_is_super THEN
      RAISE EXCEPTION 'Only super_admin can change super_admin/president roles';
    END IF;
  ELSIF p_role = 'committee' THEN
    IF NOT (v_is_super OR v_is_president) THEN
      RAISE EXCEPTION 'Only super_admin or president can change committee role';
    END IF;
  ELSE
    -- admin / umpire / risk roles: super_admin only (safe default)
    IF NOT v_is_super THEN
      RAISE EXCEPTION 'Only super_admin can change this role';
    END IF;
  END IF;

  IF p_reason_for_change IS NULL OR length(btrim(p_reason_for_change)) = 0 THEN
    RAISE EXCEPTION 'Reason for change is required';
  END IF;

  v_sensitive := p_role IN ('super_admin','president','committee');

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = p_user_id AND role::text = p_role
  ) INTO v_existing;

  IF p_grant THEN
    IF v_existing THEN RETURN; END IF;
    EXECUTE format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, %L::public.app_role)',
                   p_user_id, p_role);
    PERFORM public._rg_audit_write(
      'role_grant','user_roles', p_user_id,
      'role', NULL, p_role, p_reason_for_change, v_sensitive
    );
  ELSE
    IF NOT v_existing THEN RETURN; END IF;
    EXECUTE format('DELETE FROM public.user_roles WHERE user_id = %L AND role = %L::public.app_role',
                   p_user_id, p_role);
    PERFORM public._rg_audit_write(
      'role_revoke','user_roles', p_user_id,
      'role', p_role, NULL, p_reason_for_change, v_sensitive
    );
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.rg_set_user_role(uuid,text,boolean,text) TO authenticated;

-- ---------------------------------------------------------------------
-- 7. RPC: rg_clear_sample_data
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rg_clear_sample_data(
  p_confirmation text,
  p_reason       text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_risk_ids uuid[];
  v_n_risks int := 0;
  v_n_actions int := 0;
  v_n_qi int := 0;
  v_n_reviews int := 0;
  v_n_comments int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_edit_risk_matrix(v_uid) THEN
    RAISE EXCEPTION 'Not authorised to clear sample data';
  END IF;
  IF p_confirmation IS DISTINCT FROM 'CLEAR SAMPLE DATA' THEN
    RAISE EXCEPTION 'Confirmation phrase does not match';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Reason for change is required';
  END IF;

  -- Identify sample risks: external IDs R-001..R-010 OR title containing "Test"/"Sample"
  SELECT array_agg(id) INTO v_risk_ids
    FROM public.rg_risk_register
   WHERE risk_external_id ~ '^R-0(0[1-9]|10)$'
      OR risk_event ILIKE '%test%'
      OR risk_event ILIKE '%sample%';

  IF v_risk_ids IS NOT NULL THEN
    -- Linked records first (FK safety)
    DELETE FROM public.rg_comments       WHERE entity_type = 'risk' AND entity_id = ANY(v_risk_ids);
    GET DIAGNOSTICS v_n_comments = ROW_COUNT;
    DELETE FROM public.rg_risk_reviews   WHERE risk_id = ANY(v_risk_ids);
    GET DIAGNOSTICS v_n_reviews = ROW_COUNT;
    DELETE FROM public.rg_besmart_actions WHERE risk_id = ANY(v_risk_ids);
    GET DIAGNOSTICS v_n_actions = ROW_COUNT;
    DELETE FROM public.rg_qi_items       WHERE risk_id = ANY(v_risk_ids);
    GET DIAGNOSTICS v_n_qi = ROW_COUNT;
    DELETE FROM public.rg_risk_register  WHERE id = ANY(v_risk_ids);
    GET DIAGNOSTICS v_n_risks = ROW_COUNT;
  END IF;

  -- Test BE SMART actions / QI items not linked to any cleared risk
  WITH d AS (
    DELETE FROM public.rg_besmart_actions
     WHERE action_text ILIKE '%test%' OR action_text ILIKE '%sample%'
    RETURNING 1
  ) SELECT v_n_actions + count(*) INTO v_n_actions FROM d;

  WITH d AS (
    DELETE FROM public.rg_qi_items
     WHERE title ILIKE '%test%' OR title ILIKE '%sample%'
    RETURNING 1
  ) SELECT v_n_qi + count(*) INTO v_n_qi FROM d;

  PERFORM public._rg_audit_write(
    'clear_sample_data','system', NULL,
    'sample_data',
    NULL,
    jsonb_build_object(
      'risks', v_n_risks,
      'actions', v_n_actions,
      'qi', v_n_qi,
      'reviews', v_n_reviews,
      'comments', v_n_comments
    )::text,
    p_reason, true
  );

  RETURN jsonb_build_object(
    'risks', v_n_risks,
    'actions', v_n_actions,
    'qi', v_n_qi,
    'reviews', v_n_reviews,
    'comments', v_n_comments
  );
END $$;

GRANT EXECUTE ON FUNCTION public.rg_clear_sample_data(text,text) TO authenticated;

-- ---------------------------------------------------------------------
-- 8. Profiles read access for Settings → Users & Roles
--    (Read-only listing of users with risk access management.)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  -- Allow authenticated users to read profiles (already the case in most
  -- Lovable Cloud projects). We add a safe ANY-authenticated SELECT only if
  -- no equivalent policy already permits it.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='profiles'
       AND cmd='SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY profiles_select_authenticated ON public.profiles
              FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- =====================================================================
-- End of Phase 4 migration
-- =====================================================================
