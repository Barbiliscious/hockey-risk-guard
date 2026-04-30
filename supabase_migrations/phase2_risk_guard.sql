-- =====================================================================
-- Hockey Risk Guard — Phase 2 migration
-- Adds: BE SMART actions, QI register, comments, risk-review RPC.
-- Idempotent — run in Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ID sequences + generators
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.rg_action_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.rg_qi_id_seq     START WITH 1;

CREATE OR REPLACE FUNCTION public.rg_next_action_external_id()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'A-' || lpad(nextval('public.rg_action_id_seq')::text, 3, '0');
$$;

CREATE OR REPLACE FUNCTION public.rg_next_qi_external_id()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'QI-' || lpad(nextval('public.rg_qi_id_seq')::text, 3, '0');
$$;

-- ---------------------------------------------------------------------
-- 2. BE SMART actions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rg_be_smart_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_external_id text NOT NULL UNIQUE DEFAULT public.rg_next_action_external_id(),
  linked_risk_id uuid REFERENCES public.rg_risk_register(id) ON DELETE SET NULL,
  action_title text NOT NULL,
  baseline text,
  evaluate text,
  specific text,
  measurable text,
  achievable text,
  relevant text,
  time_based text,
  responsible_person_role text,
  resources_needed text,
  due_date date,
  status text NOT NULL DEFAULT 'Not Started',
  progress_notes text,
  date_completed date,
  club_id uuid REFERENCES public.rg_clubs(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  evidence_notes text,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rg_actions_risk_idx     ON public.rg_be_smart_actions (linked_risk_id);
CREATE INDEX IF NOT EXISTS rg_actions_status_idx   ON public.rg_be_smart_actions (status);
CREATE INDEX IF NOT EXISTS rg_actions_archived_idx ON public.rg_be_smart_actions (is_archived);

DROP TRIGGER IF EXISTS rg_actions_updated_at ON public.rg_be_smart_actions;
CREATE TRIGGER rg_actions_updated_at
  BEFORE UPDATE ON public.rg_be_smart_actions
  FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Quality Improvement
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rg_quality_improvement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qi_external_id text NOT NULL UNIQUE DEFAULT public.rg_next_qi_external_id(),
  date_logged date NOT NULL DEFAULT current_date,
  logged_by uuid DEFAULT auth.uid(),
  source text,
  qi_type text,
  area text,
  description text NOT NULL,
  reason_background text,
  linked_risk_id uuid REFERENCES public.rg_risk_register(id) ON DELETE SET NULL,
  linked_action_id uuid REFERENCES public.rg_be_smart_actions(id) ON DELETE SET NULL,
  related_project_review text,
  priority text,
  status text NOT NULL DEFAULT 'Logged',
  recommended_action text,
  owner_reviewer text,
  review_trigger text,
  review_date date,
  outcome_decision text,
  date_closed date,
  club_id uuid REFERENCES public.rg_clubs(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  evidence_notes text,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rg_qi_risk_idx     ON public.rg_quality_improvement_items (linked_risk_id);
CREATE INDEX IF NOT EXISTS rg_qi_action_idx   ON public.rg_quality_improvement_items (linked_action_id);
CREATE INDEX IF NOT EXISTS rg_qi_status_idx   ON public.rg_quality_improvement_items (status);
CREATE INDEX IF NOT EXISTS rg_qi_archived_idx ON public.rg_quality_improvement_items (is_archived);
CREATE INDEX IF NOT EXISTS rg_qi_project_idx  ON public.rg_quality_improvement_items (related_project_review);

DROP TRIGGER IF EXISTS rg_qi_updated_at ON public.rg_quality_improvement_items;
CREATE TRIGGER rg_qi_updated_at
  BEFORE UPDATE ON public.rg_quality_improvement_items
  FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Comments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rg_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  author_id uuid DEFAULT auth.uid(),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS rg_comments_entity_idx
  ON public.rg_comments (entity_type, entity_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 5. Generic audit trigger for new rg_ tables
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rg_audit_generic()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_user_role text;
  v_reason text;
  v_ip text;
  v_device text;
  v_label text;
  v_field text;
  v_old text;
  v_new text;
BEGIN
  SELECT COALESCE(p.full_name, p.email, v_user_id::text)
    INTO v_user_name FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;
  SELECT string_agg(role::text, ',') INTO v_user_role
    FROM public.user_roles WHERE user_id = v_user_id;

  v_reason := NULLIF(current_setting('rg.reason_for_change', true), '');
  v_ip     := NULLIF(current_setting('rg.ip_address',        true), '');
  v_device := NULLIF(current_setting('rg.device_info',       true), '');

  IF TG_TABLE_NAME = 'rg_be_smart_actions' THEN
    v_label := COALESCE((to_jsonb(NEW)->>'action_external_id'), '');
  ELSIF TG_TABLE_NAME = 'rg_quality_improvement_items' THEN
    v_label := COALESCE((to_jsonb(NEW)->>'qi_external_id'), '');
  ELSE
    v_label := COALESCE((to_jsonb(NEW)->>'id'), '');
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rg_audit_log
      (user_id, user_name, user_role, action_type, entity_type, entity_id,
       field_changed, previous_value, new_value, reason_for_change,
       is_sensitive, ip_address, device_info)
    VALUES
      (v_user_id, v_user_name, v_user_role, 'create', TG_TABLE_NAME, NEW.id,
       NULL, NULL, v_label, v_reason, false, v_ip, v_device);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW)->>'is_archived')::boolean = true
       AND COALESCE((to_jsonb(OLD)->>'is_archived')::boolean, false) = false THEN
      INSERT INTO public.rg_audit_log
        (user_id, user_name, user_role, action_type, entity_type, entity_id,
         field_changed, previous_value, new_value, reason_for_change,
         is_sensitive, ip_address, device_info)
      VALUES
        (v_user_id, v_user_name, v_user_role, 'archive', TG_TABLE_NAME, NEW.id,
         'is_archived', 'false', 'true', v_reason, false, v_ip, v_device);
    END IF;

    FOR v_field, v_old, v_new IN
      SELECT key,
             CASE WHEN jsonb_typeof(o.value) IN ('object','array') THEN o.value::text
                  ELSE COALESCE(o.value #>> '{}', '') END,
             CASE WHEN jsonb_typeof(n.value) IN ('object','array') THEN n.value::text
                  ELSE COALESCE(n.value #>> '{}', '') END
      FROM jsonb_each(to_jsonb(OLD)) o
      JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
      WHERE o.value IS DISTINCT FROM n.value
        AND key NOT IN ('updated_at','created_at')
    LOOP
      INSERT INTO public.rg_audit_log
        (user_id, user_name, user_role, action_type, entity_type, entity_id,
         field_changed, previous_value, new_value, reason_for_change,
         is_sensitive, ip_address, device_info)
      VALUES
        (v_user_id, v_user_name, v_user_role, 'update', TG_TABLE_NAME, NEW.id,
         v_field, v_old, v_new, v_reason, false, v_ip, v_device);
    END LOOP;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rg_actions_audit ON public.rg_be_smart_actions;
CREATE TRIGGER rg_actions_audit
  AFTER INSERT OR UPDATE ON public.rg_be_smart_actions
  FOR EACH ROW EXECUTE FUNCTION public.rg_audit_generic();

DROP TRIGGER IF EXISTS rg_qi_audit ON public.rg_quality_improvement_items;
CREATE TRIGGER rg_qi_audit
  AFTER INSERT OR UPDATE ON public.rg_quality_improvement_items
  FOR EACH ROW EXECUTE FUNCTION public.rg_audit_generic();

-- ---------------------------------------------------------------------
-- 6. Comments audit trigger
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rg_audit_comment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_user_role text;
  v_action text;
BEGIN
  SELECT COALESCE(p.full_name, p.email, v_user_id::text)
    INTO v_user_name FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;
  SELECT string_agg(role::text, ',') INTO v_user_role
    FROM public.user_roles WHERE user_id = v_user_id;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted = true AND COALESCE(OLD.is_deleted, false) = false THEN
      v_action := 'soft_delete';
    ELSIF NEW.body IS DISTINCT FROM OLD.body THEN
      v_action := 'edit';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.rg_audit_log
    (user_id, user_name, user_role, action_type, entity_type, entity_id,
     field_changed, previous_value, new_value)
  VALUES
    (v_user_id, v_user_name, v_user_role, v_action, 'rg_comments', NEW.id,
     NEW.entity_type || ':' || NEW.entity_id::text,
     CASE WHEN TG_OP = 'UPDATE' THEN OLD.body ELSE NULL END,
     NEW.body);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rg_comments_audit ON public.rg_comments;
CREATE TRIGGER rg_comments_audit
  AFTER INSERT OR UPDATE ON public.rg_comments
  FOR EACH ROW EXECUTE FUNCTION public.rg_audit_comment();

-- ---------------------------------------------------------------------
-- 7. Risk-review RPC — DB-side immutable snapshots
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rg_record_risk_review(
  p_risk_id uuid,
  p_outcome text,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_user_role text;
  v_risk public.rg_risk_register%ROWTYPE;
  v_inh_rating text;
  v_res_rating text;
  v_review_id uuid;
  v_next_review date;
  v_freq text;
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL OR NOT public.has_risk_access(v_user_id) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_risk FROM public.rg_risk_register WHERE id = p_risk_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Risk not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT rating INTO v_inh_rating
    FROM public.rg_risk_matrix
    WHERE likelihood_score  = v_risk.inherent_likelihood_score
      AND consequence_score = v_risk.inherent_consequence_score;

  SELECT rating INTO v_res_rating
    FROM public.rg_risk_matrix
    WHERE likelihood_score  = v_risk.residual_likelihood_score
      AND consequence_score = v_risk.residual_consequence_score;

  v_freq := v_risk.review_frequency;
  v_next_review := CASE
    WHEN v_freq = 'Monthly'   THEN (v_now::date + INTERVAL '1 month')::date
    WHEN v_freq = 'Quarterly' THEN (v_now::date + INTERVAL '3 months')::date
    WHEN v_freq = 'Annually'  THEN (v_now::date + INTERVAL '1 year')::date
    ELSE v_risk.next_review_date
  END;

  INSERT INTO public.rg_risk_reviews (
    risk_id, reviewed_at, reviewed_by, outcome, notes,
    inherent_likelihood_score, inherent_consequence_score, inherent_rating_snapshot,
    residual_likelihood_score, residual_consequence_score, residual_rating_snapshot,
    risk_target_rating_snapshot, risk_status_snapshot
  ) VALUES (
    p_risk_id, v_now, v_user_id, p_outcome, p_notes,
    v_risk.inherent_likelihood_score, v_risk.inherent_consequence_score, v_inh_rating,
    v_risk.residual_likelihood_score, v_risk.residual_consequence_score, v_res_rating,
    v_risk.risk_target_rating, v_risk.status
  )
  RETURNING id INTO v_review_id;

  UPDATE public.rg_risk_register
     SET last_reviewed_date = v_now::date,
         next_review_date   = v_next_review,
         reviewed_by        = v_user_id,
         status             = CASE WHEN p_outcome = 'Risk Closed' THEN 'Closed' ELSE status END
   WHERE id = p_risk_id;

  SELECT COALESCE(p.full_name, p.email, v_user_id::text)
    INTO v_user_name FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;
  SELECT string_agg(role::text, ',') INTO v_user_role
    FROM public.user_roles WHERE user_id = v_user_id;

  INSERT INTO public.rg_audit_log
    (user_id, user_name, user_role, action_type, entity_type, entity_id,
     field_changed, previous_value, new_value)
  VALUES
    (v_user_id, v_user_name, v_user_role, 'create', 'rg_risk_reviews', v_review_id,
     'outcome', NULL, p_outcome);

  RETURN v_review_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rg_record_risk_review(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.rg_be_smart_actions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_quality_improvement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_comments                  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS rg_actions_select ON public.rg_be_smart_actions';
  EXECUTE 'CREATE POLICY rg_actions_select ON public.rg_be_smart_actions
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_actions_insert ON public.rg_be_smart_actions';
  EXECUTE 'CREATE POLICY rg_actions_insert ON public.rg_be_smart_actions
            FOR INSERT TO authenticated
            WITH CHECK (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_actions_update ON public.rg_be_smart_actions';
  EXECUTE 'CREATE POLICY rg_actions_update ON public.rg_be_smart_actions
            FOR UPDATE TO authenticated
            USING (public.has_risk_access(auth.uid()))
            WITH CHECK (public.has_risk_access(auth.uid()))';

  EXECUTE 'DROP POLICY IF EXISTS rg_qi_select ON public.rg_quality_improvement_items';
  EXECUTE 'CREATE POLICY rg_qi_select ON public.rg_quality_improvement_items
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_qi_insert ON public.rg_quality_improvement_items';
  EXECUTE 'CREATE POLICY rg_qi_insert ON public.rg_quality_improvement_items
            FOR INSERT TO authenticated
            WITH CHECK (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_qi_update ON public.rg_quality_improvement_items';
  EXECUTE 'CREATE POLICY rg_qi_update ON public.rg_quality_improvement_items
            FOR UPDATE TO authenticated
            USING (public.has_risk_access(auth.uid()))
            WITH CHECK (public.has_risk_access(auth.uid()))';

  EXECUTE 'DROP POLICY IF EXISTS rg_comments_select ON public.rg_comments';
  EXECUTE 'CREATE POLICY rg_comments_select ON public.rg_comments
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_comments_insert ON public.rg_comments';
  EXECUTE 'CREATE POLICY rg_comments_insert ON public.rg_comments
            FOR INSERT TO authenticated
            WITH CHECK (public.has_risk_access(auth.uid()) AND author_id = auth.uid())';
  EXECUTE 'DROP POLICY IF EXISTS rg_comments_update ON public.rg_comments';
  EXECUTE 'CREATE POLICY rg_comments_update ON public.rg_comments
            FOR UPDATE TO authenticated
            USING (public.has_risk_access(auth.uid()) AND author_id = auth.uid())
            WITH CHECK (public.has_risk_access(auth.uid()) AND author_id = auth.uid())';

  EXECUTE 'DROP POLICY IF EXISTS rg_reviews_insert ON public.rg_risk_reviews';
  EXECUTE 'CREATE POLICY rg_reviews_insert ON public.rg_risk_reviews
            FOR INSERT TO authenticated
            WITH CHECK (public.has_risk_access(auth.uid()))';
END $$;

-- ---------------------------------------------------------------------
-- 9. Dropdown seeds
-- ---------------------------------------------------------------------

-- Ensure (list_type, value) is unique so ON CONFLICT below works.
-- Remove any pre-existing exact duplicates, keeping the oldest row.
WITH duplicates AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY list_type, value
      ORDER BY created_at, id
    ) AS rn
  FROM public.rg_dropdown_values
)
DELETE FROM public.rg_dropdown_values
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS rg_dropdown_values_list_type_value_unique
  ON public.rg_dropdown_values (list_type, value);

INSERT INTO public.rg_dropdown_values (list_type, value, sort_order) VALUES
('action_status','Not Started',1),
('action_status','In Progress',2),
('action_status','Complete',3),
('action_status','Ongoing',4),
('action_status','Deferred',5),
('review_outcome','No Change',1),
('review_outcome','Risk Updated',2),
('review_outcome','Controls Updated',3),
('review_outcome','New BE SMART Action Added',4),
('review_outcome','Risk Closed',5),
('review_outcome','Escalated to Committee',6),
('review_outcome','Added to QI Register',7),
('qi_type','Completed Improvement',1),
('qi_type','Suggestion',2),
('qi_type','Issue',3),
('qi_type','Lesson Learned',4),
('qi_type','By-Law Suggestion',5),
('qi_type','Process Gap',6),
('qi_type','Good Practice to Repeat',7),
('qi_status','Logged',1),
('qi_status','Under Review',2),
('qi_status','Accepted',3),
('qi_status','Deferred',4),
('qi_status','Actioned',5),
('qi_status','Rejected',6),
('qi_status','Closed',7),
('qi_status','Awaiting Decision',8),
('qi_priority','Low',1),
('qi_priority','Medium',2),
('qi_priority','High',3),
('related_project_review','2027 By-Law Review',1),
('related_project_review','Annual Policy Review',2),
('related_project_review','Pre-Season Planning',3),
('related_project_review','Mid-Season Review',4),
('related_project_review','Finals Review',5),
('related_project_review','Junior Competition Review',6),
('related_project_review','Umpire Program Review',7),
('related_project_review','Venue Safety Review',8),
('related_project_review','Club Compliance Review',9),
('related_project_review','Post-Season Review',10),
('related_project_review','Other / Emerging Review',11),
('qi_source','Risk Review',1),
('qi_source','Committee Meeting',2),
('qi_source','Incident',3),
('qi_source','Member Feedback',4),
('qi_source','Audit',5),
('qi_source','Other',6)
ON CONFLICT (list_type, value) DO NOTHING;
