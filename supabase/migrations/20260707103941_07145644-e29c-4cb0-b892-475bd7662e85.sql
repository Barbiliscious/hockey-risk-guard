
CREATE TABLE IF NOT EXISTS public.rg_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_venues TO authenticated, anon;
GRANT ALL ON public.rg_venues TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS rg_venues_name_unique ON public.rg_venues (lower(name));

DROP TRIGGER IF EXISTS rg_venues_updated_at ON public.rg_venues;
CREATE TRIGGER rg_venues_updated_at BEFORE UPDATE ON public.rg_venues FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

ALTER TABLE public.rg_venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rg_venues_all ON public.rg_venues;
CREATE POLICY rg_venues_all ON public.rg_venues FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Extra guidance
WITH duplicates AS (SELECT id, row_number() OVER (PARTITION BY section_key ORDER BY created_at, id) AS rn FROM public.rg_risk_guidance_sections)
DELETE FROM public.rg_risk_guidance_sections WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
CREATE UNIQUE INDEX IF NOT EXISTS rg_risk_guidance_sections_section_key_unique ON public.rg_risk_guidance_sections (section_key);

INSERT INTO public.rg_risk_guidance_sections (section_key, title, content, sort_order) VALUES
  ('introduction','Introduction and Purpose','This Risk Management Framework helps the association identify, assess, treat and review strategic and operational risks consistently.',10),
  ('strategic_vs_operational','Strategic vs Operational Risks','Strategic risks affect long-term direction (governance, reputation, financial sustainability). Operational risks affect day-to-day delivery (events, umpire supply, facilities, member safety).',20),
  ('response_guide','Risk Response Guide','Choose a treatment that matches the rating: Low — accept and monitor. Medium — manage with controls. High — active treatment plan and owner. Very High — escalate, treat urgently and review frequently.',30),
  ('category_definitions','Risk Category Definitions','Governance, Financial, Operational, People & Safety, Reputation, Compliance, Technology, Strategic.',60),
  ('ownership_escalation','Ownership and Escalation','Every risk has an owner. High and Very High risks escalate to the President and Committee. Sensitive matters escalate to the Super Admin.',70),
  ('linking_records','Linking Records','Risks link to BE SMART Actions for treatment, Quality Improvement items for improvement initiatives, and Risk Reviews for periodic reassessment.',80)
ON CONFLICT (section_key) DO NOTHING;

-- Audit helper
CREATE OR REPLACE FUNCTION public._rg_audit_write(p_action_type text, p_entity_type text, p_entity_id uuid, p_field text, p_old text, p_new text, p_reason text, p_sensitive boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_user_name text; v_user_role text;
BEGIN
  SELECT COALESCE(p.full_name, p.email, v_user_id::text) INTO v_user_name FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;
  SELECT string_agg(role::text, ',') INTO v_user_role FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.rg_audit_log (user_id, user_name, user_role, action_type, entity_type, entity_id, field_changed, previous_value, new_value, reason_for_change, is_sensitive)
  VALUES (v_user_id, v_user_name, v_user_role, p_action_type, p_entity_type, p_entity_id, p_field, p_old, p_new, p_reason, p_sensitive);
END $$;

-- Matrix cell update
CREATE OR REPLACE FUNCTION public.rg_update_matrix_cell(p_likelihood_score integer, p_consequence_score integer, p_new_rating text, p_reason_for_change text)
RETURNS public.rg_risk_matrix LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.rg_risk_matrix%ROWTYPE; v_new public.rg_risk_matrix%ROWTYPE;
BEGIN
  IF p_new_rating NOT IN ('Low','Medium','High','Very High') THEN RAISE EXCEPTION 'Invalid rating: %', p_new_rating; END IF;
  IF p_reason_for_change IS NULL OR length(btrim(p_reason_for_change)) = 0 THEN RAISE EXCEPTION 'Reason for change is required'; END IF;
  SELECT * INTO v_old FROM public.rg_risk_matrix WHERE likelihood_score = p_likelihood_score AND consequence_score = p_consequence_score LIMIT 1;
  IF v_old.id IS NULL THEN RAISE EXCEPTION 'Matrix cell not found for L=% C=%', p_likelihood_score, p_consequence_score; END IF;
  UPDATE public.rg_risk_matrix SET rating = p_new_rating WHERE id = v_old.id RETURNING * INTO v_new;
  PERFORM public._rg_audit_write('update','rg_risk_matrix', v_old.id, 'rating', v_old.rating, v_new.rating, p_reason_for_change, true);
  RETURN v_new;
END $$;
GRANT EXECUTE ON FUNCTION public.rg_update_matrix_cell(integer,integer,text,text) TO authenticated, anon;

-- Guidance update
CREATE OR REPLACE FUNCTION public.rg_update_guidance_section(p_section_key text, p_title text, p_content text, p_reason_for_change text)
RETURNS public.rg_risk_guidance_sections LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old public.rg_risk_guidance_sections%ROWTYPE; v_new public.rg_risk_guidance_sections%ROWTYPE;
BEGIN
  IF p_reason_for_change IS NULL OR length(btrim(p_reason_for_change)) = 0 THEN RAISE EXCEPTION 'Reason for change is required'; END IF;
  SELECT * INTO v_old FROM public.rg_risk_guidance_sections WHERE section_key = p_section_key LIMIT 1;
  IF v_old.id IS NULL THEN RAISE EXCEPTION 'Guidance section not found: %', p_section_key; END IF;
  UPDATE public.rg_risk_guidance_sections SET title = COALESCE(p_title, title), content = COALESCE(p_content, content) WHERE id = v_old.id RETURNING * INTO v_new;
  IF v_old.title IS DISTINCT FROM v_new.title THEN
    PERFORM public._rg_audit_write('update','rg_risk_guidance_sections', v_old.id, 'title', v_old.title, v_new.title, p_reason_for_change, true);
  END IF;
  IF v_old.content IS DISTINCT FROM v_new.content THEN
    PERFORM public._rg_audit_write('update','rg_risk_guidance_sections', v_old.id, 'content', left(coalesce(v_old.content,''),500), left(coalesce(v_new.content,''),500), p_reason_for_change, true);
  END IF;
  RETURN v_new;
END $$;
GRANT EXECUTE ON FUNCTION public.rg_update_guidance_section(text,text,text,text) TO authenticated, anon;

-- Set user role (auth disabled, but function exists so client code type-checks)
CREATE OR REPLACE FUNCTION public.rg_set_user_role(p_user_id uuid, p_role text, p_grant boolean, p_reason_for_change text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing boolean;
BEGIN
  IF p_role NOT IN ('super_admin','president','committee','admin','umpire') THEN RAISE EXCEPTION 'Invalid role: %', p_role; END IF;
  IF p_reason_for_change IS NULL OR length(btrim(p_reason_for_change)) = 0 THEN RAISE EXCEPTION 'Reason for change is required'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = p_role) INTO v_existing;
  IF p_grant THEN
    IF v_existing THEN RETURN; END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role);
    PERFORM public._rg_audit_write('role_grant','user_roles', p_user_id, 'role', NULL, p_role, p_reason_for_change, true);
  ELSE
    IF NOT v_existing THEN RETURN; END IF;
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;
    PERFORM public._rg_audit_write('role_revoke','user_roles', p_user_id, 'role', p_role, NULL, p_reason_for_change, true);
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.rg_set_user_role(uuid,text,boolean,text) TO authenticated, anon;

-- Clear sample data
CREATE OR REPLACE FUNCTION public.rg_clear_sample_data(p_confirmation text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_risk_ids uuid[]; v_action_ids uuid[]; v_qi_ids uuid[];
  v_n_risks int := 0; v_n_actions int := 0; v_n_qi int := 0; v_n_reviews int := 0; v_n_comments int := 0; v_n_tmp int := 0;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'CLEAR SAMPLE DATA' THEN RAISE EXCEPTION 'Confirmation phrase does not match'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN RAISE EXCEPTION 'Reason for change is required'; END IF;
  SELECT array_agg(id) INTO v_risk_ids FROM public.rg_risk_register
   WHERE risk_external_id ~ '^R-0(0[1-9]|10)$' OR risk_event ILIKE '%test%' OR risk_event ILIKE '%sample%';
  IF v_risk_ids IS NOT NULL THEN
    SELECT array_agg(id) INTO v_action_ids FROM public.rg_be_smart_actions WHERE linked_risk_id = ANY(v_risk_ids);
    SELECT array_agg(id) INTO v_qi_ids FROM public.rg_quality_improvement_items WHERE linked_risk_id = ANY(v_risk_ids);
    DELETE FROM public.rg_comments WHERE entity_type='risk' AND entity_id = ANY(v_risk_ids);
    GET DIAGNOSTICS v_n_tmp = ROW_COUNT; v_n_comments := v_n_comments + v_n_tmp;
    IF v_action_ids IS NOT NULL THEN
      DELETE FROM public.rg_comments WHERE entity_type='be_smart_action' AND entity_id = ANY(v_action_ids);
      GET DIAGNOSTICS v_n_tmp = ROW_COUNT; v_n_comments := v_n_comments + v_n_tmp;
    END IF;
    IF v_qi_ids IS NOT NULL THEN
      DELETE FROM public.rg_comments WHERE entity_type='qi_item' AND entity_id = ANY(v_qi_ids);
      GET DIAGNOSTICS v_n_tmp = ROW_COUNT; v_n_comments := v_n_comments + v_n_tmp;
    END IF;
    DELETE FROM public.rg_risk_reviews WHERE risk_id = ANY(v_risk_ids); GET DIAGNOSTICS v_n_reviews = ROW_COUNT;
    DELETE FROM public.rg_be_smart_actions WHERE linked_risk_id = ANY(v_risk_ids); GET DIAGNOSTICS v_n_actions = ROW_COUNT;
    DELETE FROM public.rg_quality_improvement_items WHERE linked_risk_id = ANY(v_risk_ids); GET DIAGNOSTICS v_n_qi = ROW_COUNT;
    DELETE FROM public.rg_risk_register WHERE id = ANY(v_risk_ids); GET DIAGNOSTICS v_n_risks = ROW_COUNT;
  END IF;
  PERFORM public._rg_audit_write('clear_sample_data','system', NULL, 'sample_data', NULL,
    jsonb_build_object('risks',v_n_risks,'actions',v_n_actions,'qi',v_n_qi,'reviews',v_n_reviews,'comments',v_n_comments)::text,
    p_reason, true);
  RETURN jsonb_build_object('risks',v_n_risks,'actions',v_n_actions,'qi',v_n_qi,'reviews',v_n_reviews,'comments',v_n_comments);
END $$;
GRANT EXECUTE ON FUNCTION public.rg_clear_sample_data(text,text) TO authenticated, anon;

-- Add short_name to teams (the app selects it)
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS short_name text;
