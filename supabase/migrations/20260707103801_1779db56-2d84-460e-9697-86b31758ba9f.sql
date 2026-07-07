
CREATE SEQUENCE IF NOT EXISTS public.rg_action_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.rg_qi_id_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.rg_next_action_external_id()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'A-' || lpad(nextval('public.rg_action_id_seq')::text, 3, '0');
$$;
CREATE OR REPLACE FUNCTION public.rg_next_qi_external_id()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'QI-' || lpad(nextval('public.rg_qi_id_seq')::text, 3, '0');
$$;

CREATE TABLE IF NOT EXISTS public.rg_be_smart_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_external_id text NOT NULL UNIQUE DEFAULT public.rg_next_action_external_id(),
  linked_risk_id uuid REFERENCES public.rg_risk_register(id) ON DELETE SET NULL,
  action_title text NOT NULL,
  baseline text, evaluate text, specific text, measurable text, achievable text, relevant text, time_based text,
  responsible_person_role text, resources_needed text,
  due_date date,
  status text NOT NULL DEFAULT 'Not Started',
  progress_notes text, date_completed date,
  club_id uuid REFERENCES public.rg_clubs(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  evidence_notes text,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz, archived_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_be_smart_actions TO authenticated, anon;
GRANT ALL ON public.rg_be_smart_actions TO service_role;
CREATE INDEX IF NOT EXISTS rg_actions_risk_idx ON public.rg_be_smart_actions (linked_risk_id);
CREATE INDEX IF NOT EXISTS rg_actions_status_idx ON public.rg_be_smart_actions (status);
CREATE INDEX IF NOT EXISTS rg_actions_archived_idx ON public.rg_be_smart_actions (is_archived);

DROP TRIGGER IF EXISTS rg_actions_updated_at ON public.rg_be_smart_actions;
CREATE TRIGGER rg_actions_updated_at BEFORE UPDATE ON public.rg_be_smart_actions FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.rg_quality_improvement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qi_external_id text NOT NULL UNIQUE DEFAULT public.rg_next_qi_external_id(),
  date_logged date NOT NULL DEFAULT current_date,
  logged_by uuid DEFAULT auth.uid(),
  source text, qi_type text, area text,
  description text NOT NULL,
  reason_background text,
  linked_risk_id uuid REFERENCES public.rg_risk_register(id) ON DELETE SET NULL,
  linked_action_id uuid REFERENCES public.rg_be_smart_actions(id) ON DELETE SET NULL,
  related_project_review text,
  priority text,
  status text NOT NULL DEFAULT 'Logged',
  recommended_action text, owner_reviewer text, review_trigger text, review_date date,
  outcome_decision text, date_closed date,
  club_id uuid REFERENCES public.rg_clubs(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  evidence_notes text,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_quality_improvement_items TO authenticated, anon;
GRANT ALL ON public.rg_quality_improvement_items TO service_role;
CREATE INDEX IF NOT EXISTS rg_qi_risk_idx ON public.rg_quality_improvement_items (linked_risk_id);
CREATE INDEX IF NOT EXISTS rg_qi_action_idx ON public.rg_quality_improvement_items (linked_action_id);
CREATE INDEX IF NOT EXISTS rg_qi_status_idx ON public.rg_quality_improvement_items (status);
CREATE INDEX IF NOT EXISTS rg_qi_archived_idx ON public.rg_quality_improvement_items (is_archived);
CREATE INDEX IF NOT EXISTS rg_qi_project_idx ON public.rg_quality_improvement_items (related_project_review);

DROP TRIGGER IF EXISTS rg_qi_updated_at ON public.rg_quality_improvement_items;
CREATE TRIGGER rg_qi_updated_at BEFORE UPDATE ON public.rg_quality_improvement_items FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_comments TO authenticated, anon;
GRANT ALL ON public.rg_comments TO service_role;
CREATE INDEX IF NOT EXISTS rg_comments_entity_idx ON public.rg_comments (entity_type, entity_id, created_at DESC);

-- Review RPC
CREATE OR REPLACE FUNCTION public.rg_record_risk_review(p_risk_id uuid, p_outcome text, p_notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_risk public.rg_risk_register%ROWTYPE;
  v_inh_rating text; v_res_rating text; v_review_id uuid;
  v_next_review date; v_freq text; v_now timestamptz := now();
BEGIN
  SELECT * INTO v_risk FROM public.rg_risk_register WHERE id = p_risk_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Risk not found' USING ERRCODE = 'P0002'; END IF;
  SELECT rating INTO v_inh_rating FROM public.rg_risk_matrix WHERE likelihood_score = v_risk.inherent_likelihood_score AND consequence_score = v_risk.inherent_consequence_score;
  SELECT rating INTO v_res_rating FROM public.rg_risk_matrix WHERE likelihood_score = v_risk.residual_likelihood_score AND consequence_score = v_risk.residual_consequence_score;
  v_freq := v_risk.review_frequency;
  v_next_review := CASE
    WHEN v_freq = 'Monthly' THEN (v_now::date + INTERVAL '1 month')::date
    WHEN v_freq = 'Quarterly' THEN (v_now::date + INTERVAL '3 months')::date
    WHEN v_freq = 'Annually' THEN (v_now::date + INTERVAL '1 year')::date
    ELSE v_risk.next_review_date END;
  INSERT INTO public.rg_risk_reviews (risk_id, reviewed_at, reviewed_by, outcome, notes,
    inherent_likelihood_score, inherent_consequence_score, inherent_rating_snapshot,
    residual_likelihood_score, residual_consequence_score, residual_rating_snapshot,
    risk_target_rating_snapshot, risk_status_snapshot)
  VALUES (p_risk_id, v_now, v_user_id, p_outcome, p_notes,
    v_risk.inherent_likelihood_score, v_risk.inherent_consequence_score, v_inh_rating,
    v_risk.residual_likelihood_score, v_risk.residual_consequence_score, v_res_rating,
    v_risk.risk_target_rating, v_risk.status)
  RETURNING id INTO v_review_id;
  UPDATE public.rg_risk_register SET last_reviewed_date = v_now::date, next_review_date = v_next_review, reviewed_by = v_user_id,
    status = CASE WHEN p_outcome = 'Risk Closed' THEN 'Closed' ELSE status END
  WHERE id = p_risk_id;
  RETURN v_review_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.rg_record_risk_review(uuid, text, text) TO authenticated, anon;

ALTER TABLE public.rg_be_smart_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_quality_improvement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rg_actions_all ON public.rg_be_smart_actions;
CREATE POLICY rg_actions_all ON public.rg_be_smart_actions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rg_qi_all ON public.rg_quality_improvement_items;
CREATE POLICY rg_qi_all ON public.rg_quality_improvement_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rg_comments_all ON public.rg_comments;
CREATE POLICY rg_comments_all ON public.rg_comments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Extra dropdowns
WITH duplicates AS (
  SELECT id, row_number() OVER (PARTITION BY list_type, value ORDER BY created_at, id) AS rn
  FROM public.rg_dropdown_values
)
DELETE FROM public.rg_dropdown_values WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

INSERT INTO public.rg_dropdown_values (list_type, value, sort_order) VALUES
('action_status','Not Started',1),('action_status','In Progress',2),('action_status','Complete',3),('action_status','Ongoing',4),('action_status','Deferred',5),
('review_outcome','No Change',1),('review_outcome','Risk Updated',2),('review_outcome','Controls Updated',3),('review_outcome','New BE SMART Action Added',4),('review_outcome','Risk Closed',5),('review_outcome','Escalated to Committee',6),('review_outcome','Added to QI Register',7),
('qi_type','Completed Improvement',1),('qi_type','Suggestion',2),('qi_type','Issue',3),('qi_type','Lesson Learned',4),('qi_type','By-Law Suggestion',5),('qi_type','Process Gap',6),('qi_type','Good Practice to Repeat',7),
('qi_status','Logged',1),('qi_status','Under Review',2),('qi_status','Accepted',3),('qi_status','Deferred',4),('qi_status','Actioned',5),('qi_status','Rejected',6),('qi_status','Closed',7),('qi_status','Awaiting Decision',8),
('qi_priority','Low',1),('qi_priority','Medium',2),('qi_priority','High',3),
('related_project_review','2027 By-Law Review',1),('related_project_review','Annual Policy Review',2),('related_project_review','Pre-Season Planning',3),('related_project_review','Mid-Season Review',4),('related_project_review','Finals Review',5),('related_project_review','Junior Competition Review',6),('related_project_review','Umpire Program Review',7),('related_project_review','Venue Safety Review',8),('related_project_review','Club Compliance Review',9),('related_project_review','Post-Season Review',10),('related_project_review','Other / Emerging Review',11),
('qi_source','Risk Review',1),('qi_source','Committee Meeting',2),('qi_source','Incident',3),('qi_source','Member Feedback',4),('qi_source','Audit',5),('qi_source','Other',6)
ON CONFLICT (list_type, value) DO NOTHING;
