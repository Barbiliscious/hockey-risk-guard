-- =====================================================================
-- Hockey Risk Guard — Phase 1 migration
-- Run this entire file in your Supabase SQL editor (one shot, idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rg_risk_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  likelihood_score integer NOT NULL,
  likelihood_label text NOT NULL,
  consequence_score integer NOT NULL,
  consequence_label text NOT NULL,
  rating text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (likelihood_score, consequence_score)
);
CREATE INDEX IF NOT EXISTS rg_risk_matrix_lc_idx
  ON public.rg_risk_matrix (likelihood_score, consequence_score);

CREATE TABLE IF NOT EXISTS public.rg_risk_guidance_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rg_dropdown_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_type text NOT NULL,
  value text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_type, value)
);
CREATE INDEX IF NOT EXISTS rg_dropdown_values_list_idx
  ON public.rg_dropdown_values (list_type, active, sort_order);

CREATE TABLE IF NOT EXISTS public.rg_risk_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_external_id text NOT NULL UNIQUE,
  risk_category text,
  risk_type text,
  level text,
  risk_event text NOT NULL,
  consequences text,
  inherent_likelihood_score integer,
  inherent_consequence_score integer,
  current_risk_summary text,
  controls_in_place text,
  residual_likelihood_score integer,
  residual_consequence_score integer,
  risk_target_rating text,
  risk_target_description text,
  treatment_plan text,
  risk_owner text,
  status text DEFAULT 'Open',
  review_frequency text,
  last_reviewed_date date,
  next_review_date date,
  reviewed_by uuid,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  evidence_notes text,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rg_risk_register_archived_idx
  ON public.rg_risk_register (is_archived);
CREATE INDEX IF NOT EXISTS rg_risk_register_status_idx
  ON public.rg_risk_register (status);
CREATE INDEX IF NOT EXISTS rg_risk_register_team_idx
  ON public.rg_risk_register (team_id);

CREATE TABLE IF NOT EXISTS public.rg_risk_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id uuid REFERENCES public.rg_risk_register(id) ON DELETE CASCADE,
  reviewed_at timestamptz,
  reviewed_by uuid,
  outcome text,
  notes text,
  inherent_likelihood_score integer,
  inherent_consequence_score integer,
  inherent_rating_snapshot text,
  residual_likelihood_score integer,
  residual_consequence_score integer,
  residual_rating_snapshot text,
  risk_target_rating_snapshot text,
  risk_status_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rg_risk_reviews_risk_idx
  ON public.rg_risk_reviews (risk_id);

CREATE TABLE IF NOT EXISTS public.rg_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  user_name text,
  user_role text,
  action_type text,
  entity_type text,
  entity_id uuid,
  field_changed text,
  previous_value text,
  new_value text,
  reason_for_change text,
  is_sensitive boolean NOT NULL DEFAULT false,
  ip_address text,
  device_info text
);
CREATE INDEX IF NOT EXISTS rg_audit_log_created_idx
  ON public.rg_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS rg_audit_log_entity_idx
  ON public.rg_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS rg_audit_log_user_idx
  ON public.rg_audit_log (user_id);

-- ---------------------------------------------------------------------
-- 2. updated_at trigger helper
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS rg_risk_register_updated_at ON public.rg_risk_register;
CREATE TRIGGER rg_risk_register_updated_at
  BEFORE UPDATE ON public.rg_risk_register
  FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

DROP TRIGGER IF EXISTS rg_risk_matrix_updated_at ON public.rg_risk_matrix;
CREATE TRIGGER rg_risk_matrix_updated_at
  BEFORE UPDATE ON public.rg_risk_matrix
  FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

DROP TRIGGER IF EXISTS rg_risk_guidance_updated_at ON public.rg_risk_guidance_sections;
CREATE TRIGGER rg_risk_guidance_updated_at
  BEFORE UPDATE ON public.rg_risk_guidance_sections
  FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

-- ---------------------------------------------------------------------
-- 3. AUDIT TRIGGER for rg_risk_register
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rg_audit_risk_register()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_user_role text;
  v_reason text;
  v_ip text;
  v_device text;
  v_action text;
  v_field text;
  v_old text;
  v_new text;
BEGIN
  -- Who
  SELECT COALESCE(p.full_name, p.email, v_user_id::text)
    INTO v_user_name FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;
  SELECT string_agg(role::text, ',') INTO v_user_role
    FROM public.user_roles WHERE user_id = v_user_id;

  -- Optional context (set by client via SET LOCAL "rg.reason_for_change" = '...')
  v_reason := NULLIF(current_setting('rg.reason_for_change', true), '');
  v_ip     := NULLIF(current_setting('rg.ip_address', true), '');
  v_device := NULLIF(current_setting('rg.device_info', true), '');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rg_audit_log
      (user_id, user_name, user_role, action_type, entity_type, entity_id,
       field_changed, previous_value, new_value, reason_for_change,
       is_sensitive, ip_address, device_info)
    VALUES
      (v_user_id, v_user_name, v_user_role, 'create', 'rg_risk_register', NEW.id,
       NULL, NULL, NEW.risk_external_id, v_reason, false, v_ip, v_device);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Detect archive specifically
    IF NEW.is_archived = true AND COALESCE(OLD.is_archived, false) = false THEN
      INSERT INTO public.rg_audit_log
        (user_id, user_name, user_role, action_type, entity_type, entity_id,
         field_changed, previous_value, new_value, reason_for_change,
         is_sensitive, ip_address, device_info)
      VALUES
        (v_user_id, v_user_name, v_user_role, 'archive', 'rg_risk_register', NEW.id,
         'is_archived', 'false', 'true', v_reason, false, v_ip, v_device);
    END IF;

    -- Field-by-field change rows
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
        (v_user_id, v_user_name, v_user_role, 'update', 'rg_risk_register', NEW.id,
         v_field, v_old, v_new, v_reason, false, v_ip, v_device);
    END LOOP;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rg_risk_register_audit ON public.rg_risk_register;
CREATE TRIGGER rg_risk_register_audit
  AFTER INSERT OR UPDATE ON public.rg_risk_register
  FOR EACH ROW EXECUTE FUNCTION public.rg_audit_risk_register();

-- ---------------------------------------------------------------------
-- 4. RLS — using existing helper functions only
-- ---------------------------------------------------------------------
ALTER TABLE public.rg_risk_matrix             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_risk_guidance_sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_dropdown_values         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_risk_register           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_risk_reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_audit_log               ENABLE ROW LEVEL SECURITY;

-- Helper to drop+create policies idempotently
DO $$
BEGIN
  -- rg_risk_matrix: SELECT for risk users
  EXECUTE 'DROP POLICY IF EXISTS rg_matrix_select ON public.rg_risk_matrix';
  EXECUTE 'CREATE POLICY rg_matrix_select ON public.rg_risk_matrix
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';

  -- rg_risk_guidance_sections: SELECT
  EXECUTE 'DROP POLICY IF EXISTS rg_guidance_select ON public.rg_risk_guidance_sections';
  EXECUTE 'CREATE POLICY rg_guidance_select ON public.rg_risk_guidance_sections
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';

  -- rg_dropdown_values: SELECT
  EXECUTE 'DROP POLICY IF EXISTS rg_dropdowns_select ON public.rg_dropdown_values';
  EXECUTE 'CREATE POLICY rg_dropdowns_select ON public.rg_dropdown_values
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';

  -- rg_risk_register: full SELECT/INSERT/UPDATE for risk users; no DELETE
  EXECUTE 'DROP POLICY IF EXISTS rg_register_select ON public.rg_risk_register';
  EXECUTE 'CREATE POLICY rg_register_select ON public.rg_risk_register
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_register_insert ON public.rg_risk_register';
  EXECUTE 'CREATE POLICY rg_register_insert ON public.rg_risk_register
            FOR INSERT TO authenticated
            WITH CHECK (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_register_update ON public.rg_risk_register';
  EXECUTE 'CREATE POLICY rg_register_update ON public.rg_risk_register
            FOR UPDATE TO authenticated
            USING (public.has_risk_access(auth.uid()))
            WITH CHECK (public.has_risk_access(auth.uid()))';

  -- rg_risk_reviews: SELECT only this phase (insert handled by RPC later)
  EXECUTE 'DROP POLICY IF EXISTS rg_reviews_select ON public.rg_risk_reviews';
  EXECUTE 'CREATE POLICY rg_reviews_select ON public.rg_risk_reviews
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';

  -- rg_audit_log: SELECT for risk users; INSERT only via trigger (no client policy)
  EXECUTE 'DROP POLICY IF EXISTS rg_audit_select ON public.rg_audit_log';
  EXECUTE 'CREATE POLICY rg_audit_select ON public.rg_audit_log
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';
END $$;

-- ---------------------------------------------------------------------
-- 5. SEED — Risk Matrix (25 rows)
-- ---------------------------------------------------------------------
INSERT INTO public.rg_risk_matrix
  (likelihood_score, likelihood_label, consequence_score, consequence_label, rating)
VALUES
  (1,'Rare',1,'Insignificant','Low'),
  (1,'Rare',2,'Minor','Low'),
  (1,'Rare',3,'Moderate','Low'),
  (1,'Rare',4,'Major','Medium'),
  (1,'Rare',5,'Severe','High'),
  (2,'Unlikely',1,'Insignificant','Low'),
  (2,'Unlikely',2,'Minor','Low'),
  (2,'Unlikely',3,'Moderate','Medium'),
  (2,'Unlikely',4,'Major','Medium'),
  (2,'Unlikely',5,'Severe','High'),
  (3,'Possible',1,'Insignificant','Low'),
  (3,'Possible',2,'Minor','Medium'),
  (3,'Possible',3,'Moderate','Medium'),
  (3,'Possible',4,'Major','High'),
  (3,'Possible',5,'Severe','High'),
  (4,'Likely',1,'Insignificant','Medium'),
  (4,'Likely',2,'Minor','Medium'),
  (4,'Likely',3,'Moderate','High'),
  (4,'Likely',4,'Major','High'),
  (4,'Likely',5,'Severe','Very High'),
  (5,'Almost Certain',1,'Insignificant','Medium'),
  (5,'Almost Certain',2,'Minor','High'),
  (5,'Almost Certain',3,'Moderate','High'),
  (5,'Almost Certain',4,'Major','Very High'),
  (5,'Almost Certain',5,'Severe','Very High')
ON CONFLICT (likelihood_score, consequence_score) DO UPDATE
  SET likelihood_label = EXCLUDED.likelihood_label,
      consequence_label = EXCLUDED.consequence_label,
      rating = EXCLUDED.rating,
      updated_at = now();

-- ---------------------------------------------------------------------
-- 6. SEED — Guidance sections
-- ---------------------------------------------------------------------
INSERT INTO public.rg_risk_guidance_sections (section_key, title, content, sort_order) VALUES
('likelihood_scale','Likelihood Scale',
'1 — Rare: May only occur in exceptional circumstances.
2 — Unlikely: Could occur at some time but not expected.
3 — Possible: Might occur occasionally.
4 — Likely: Will probably occur in most circumstances.
5 — Almost Certain: Expected to occur in most circumstances.', 1),
('consequence_scale','Consequence Scale',
'1 — Insignificant: No injuries; very low impact on operations or reputation.
2 — Minor: First aid only; small impact, easily managed.
3 — Moderate: Medical treatment required; noticeable impact, recoverable.
4 — Major: Serious injury or significant impact; committee involvement needed.
5 — Severe: Fatality, permanent disability, or critical impact on the association.', 2),
('risk_response_guide','Risk Response Guide',
'Very High — Risk plan usually required; committee oversight recommended; review monthly or after incident.
High — Risk plan usually required; review at least quarterly.
Medium — Review and improve controls where practical; review quarterly or seasonally.
Low — Monitor through normal processes; review annually or as needed.', 3)
ON CONFLICT (section_key) DO UPDATE
  SET title = EXCLUDED.title, content = EXCLUDED.content,
      sort_order = EXCLUDED.sort_order, updated_at = now();

-- ---------------------------------------------------------------------
-- 7. SEED — Dropdowns
-- ---------------------------------------------------------------------
INSERT INTO public.rg_dropdown_values (list_type, value, sort_order) VALUES
-- Risk Category
('risk_category','Strategic',1),
('risk_category','Governance & Compliance',2),
('risk_category','Financial & Insurance',3),
('risk_category','Participant Safety & Welfare',4),
('risk_category','Child Safety & Member Protection',5),
('risk_category','Competition Operations',6),
('risk_category','Venue & Event Management',7),
('risk_category','Knowledge Management & Data',8),
('risk_category','Resources & Volunteers',9),
('risk_category','Reputation & Communication',10),
('risk_category','Other / Emerging Risk',11),
-- Risk Type
('risk_type','Strategic',1),
('risk_type','Operational',2),
-- Level
('level','Association',1),
('level','Club',2),
('level','Team',3),
('level','Event',4),
('level','Venue',5),
-- Risk Status
('risk_status','Open',1),
('risk_status','In Progress',2),
('risk_status','Controlled',3),
('risk_status','Closed',4),
('risk_status','Deferred',5),
-- Review Frequency
('review_frequency','Monthly',1),
('review_frequency','Quarterly',2),
('review_frequency','Pre-season',3),
('review_frequency','Mid-season',4),
('review_frequency','Pre-finals',5),
('review_frequency','Post-season',6),
('review_frequency','Post-incident',7),
('review_frequency','Annually',8),
-- Risk Owner
('risk_owner','President',1),
('risk_owner','Vice President',2),
('risk_owner','Secretary',3),
('risk_owner','Treasurer',4),
('risk_owner','Facilities Manager',5),
('risk_owner','Participation Officer',6),
('risk_owner','Club',7),
('risk_owner','Contractor',8),
('risk_owner','Child Safety Officer',9),
('risk_owner','Umpire Coordinator',10),
('risk_owner','Club President',11),
('risk_owner','Coaches',12),
('risk_owner','Team Managers',13),
('risk_owner','Association Committee',14),
('risk_owner','Competition Committee',15)
ON CONFLICT (list_type, value) DO NOTHING;

-- ---------------------------------------------------------------------
-- 8. SEED — 10 sample risks (only if register is empty)
-- ---------------------------------------------------------------------
INSERT INTO public.rg_risk_register
  (risk_external_id, risk_category, risk_type, level, risk_event, consequences,
   inherent_likelihood_score, inherent_consequence_score,
   current_risk_summary, controls_in_place,
   residual_likelihood_score, residual_consequence_score,
   risk_target_rating, risk_target_description, treatment_plan,
   risk_owner, status, review_frequency, next_review_date, evidence_notes)
SELECT * FROM (VALUES
  ('R-001','Participant Safety & Welfare','Operational','Association','Serious player injury during a match',
   'Player suffers serious injury; ambulance required; possible long-term harm.',
   3, 5,
   'Injuries do occur; first-aid kits and trained first-aiders are present at most venues.',
   'First-aid kits at all venues; trained first-aiders rostered; emergency procedure displayed.',
   2, 4,
   'Medium','Reduce to Medium through stronger first-aid coverage and reporting.',
   'Roster a qualified first-aider at every game; quarterly first-aid refresher.',
   'Participation Officer','Open','Quarterly', (now() + interval '60 days')::date,
   'Reviewed after 2025 season opener.'),

  ('R-002','Participant Safety & Welfare','Operational','Association','Concussion not managed correctly',
   'Player returns to play too soon; risk of second-impact syndrome and long-term harm.',
   4, 5,
   'Coaches generally aware of return-to-play but inconsistent paperwork.',
   'Concussion policy adopted; HeadCheck app referenced.',
   3, 4,
   'Medium','Embed mandatory concussion form for any suspected concussion.',
   'Annual coach education; mandatory concussion form; medical clearance before return.',
   'Participation Officer','In Progress','Pre-season', (now() + interval '30 days')::date,
   'Form drafted but not yet enforced.'),

  ('R-003','Child Safety & Member Protection','Strategic','Association','Child safety incident or disclosure',
   'Harm to a child; reputational and legal consequences; mandatory reporting obligations.',
   2, 5,
   'Child Safe policy in place; incident pathway defined.',
   'Child Safe Code of Conduct; Child Safety Officer appointed; reporting flowchart.',
   1, 5,
   'Low','Maintain at Low through ongoing training and clear reporting.',
   'Annual Child Safe training; quarterly review of CSO inbox.',
   'Child Safety Officer','Open','Quarterly', (now() + interval '45 days')::date,
   ''),

  ('R-004','Governance & Compliance','Operational','Association','Coach/volunteer working without valid WWCC',
   'Breach of Working with Children obligations; child placed at risk.',
   3, 4,
   'Most volunteers have WWCC on file; some gaps for new coaches mid-season.',
   'WWCC register maintained; pre-season check.',
   2, 4,
   'Medium','Maintain at Medium with monthly WWCC audit.',
   'Monthly WWCC audit; block sign-on without verified WWCC.',
   'Secretary','In Progress','Monthly', (now() + interval '14 days')::date,
   ''),

  ('R-005','Competition Operations','Operational','Association','Umpire abuse or assault by spectator/player',
   'Umpire harm; loss of umpiring workforce; reputational damage.',
   4, 4,
   'Incidents have occurred; tribunal process exists but enforcement is inconsistent.',
   'Code of Conduct displayed; tribunal process; spectator behaviour policy.',
   3, 3,
   'Medium','Reduce through visible enforcement and umpire support.',
   'Mandatory reporting of any verbal/physical abuse; club sanctions; umpire debrief.',
   'Umpire Coordinator','Open','Mid-season', (now() + interval '21 days')::date,
   ''),

  ('R-006','Venue & Event Management','Operational','Venue','Unsafe venue condition (surface, lighting, fencing)',
   'Player injury; event cancellation; insurance claim.',
   3, 4,
   'Pre-game checks done informally.',
   'Pre-game venue checklist (paper).',
   2, 3,
   'Low','Embed digital pre-game venue check.',
   'Move pre-game checklist to digital form; Facilities Manager weekly walkthrough.',
   'Facilities Manager','Open','Pre-season', (now() + interval '90 days')::date,
   ''),

  ('R-007','Competition Operations','Operational','Event','Severe weather causing late cancellation',
   'Player heat illness or lightning exposure; cost of late cancellation; reputational impact.',
   4, 3,
   'Cancellations happen but call-time is sometimes late.',
   'Heat policy; lightning policy; comms via website + app.',
   3, 2,
   'Low','Aim for Low with earlier call times.',
   'Decision tree; call by 7am match day; SMS to clubs.',
   'Competition Committee','Open','Pre-season', (now() + interval '120 days')::date,
   ''),

  ('R-008','Competition Operations','Operational','Association','Finals eligibility dispute',
   'Team penalised; tribunal workload; member dissatisfaction.',
   3, 3,
   'Eligibility tracked in spreadsheet; some ambiguity in by-laws.',
   'By-laws published; eligibility report mid-season.',
   2, 3,
   'Low','Aim for Low through clearer by-laws (2027 review).',
   'Eligibility report from round 10; clarify in 2027 by-law review.',
   'Competition Committee','Open','Pre-finals', (now() + interval '150 days')::date,
   ''),

  ('R-009','Resources & Volunteers','Strategic','Association','Volunteer burnout / loss of key office bearers',
   'Loss of corporate knowledge; gaps in roles; reputational damage.',
   4, 4,
   'Same small group carrying most workload.',
   'Position descriptions; some succession notes.',
   3, 3,
   'Medium','Reduce by sharing workload and recruiting.',
   'Recruit assistant for each key role; document procedures; rotate tasks.',
   'President','Open','Quarterly', (now() + interval '75 days')::date,
   ''),

  ('R-010','Knowledge Management & Data','Operational','Association','Privacy / data breach (member data exposed)',
   'Breach of Privacy Act; member trust eroded; possible notifiable data breach.',
   3, 4,
   'Data lives across spreadsheets and email; access controls patchy.',
   'Limited admin access; password manager partially used.',
   2, 3,
   'Low','Reduce by consolidating systems and access controls.',
   'Move member data to single platform; MFA; quarterly access review.',
   'Secretary','Open','Quarterly', (now() + interval '60 days')::date,
   '')
) AS v(risk_external_id, risk_category, risk_type, level, risk_event, consequences,
       inherent_likelihood_score, inherent_consequence_score,
       current_risk_summary, controls_in_place,
       residual_likelihood_score, residual_consequence_score,
       risk_target_rating, risk_target_description, treatment_plan,
       risk_owner, status, review_frequency, next_review_date, evidence_notes)
WHERE NOT EXISTS (SELECT 1 FROM public.rg_risk_register);

-- =====================================================================
-- DONE.
-- =====================================================================
