
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
CREATE INDEX IF NOT EXISTS rg_risk_matrix_lc_idx ON public.rg_risk_matrix (likelihood_score, consequence_score);

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
CREATE INDEX IF NOT EXISTS rg_dropdown_values_list_idx ON public.rg_dropdown_values (list_type, active, sort_order);

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
CREATE INDEX IF NOT EXISTS rg_risk_register_archived_idx ON public.rg_risk_register (is_archived);
CREATE INDEX IF NOT EXISTS rg_risk_register_status_idx ON public.rg_risk_register (status);
CREATE INDEX IF NOT EXISTS rg_risk_register_team_idx ON public.rg_risk_register (team_id);

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
CREATE INDEX IF NOT EXISTS rg_risk_reviews_risk_idx ON public.rg_risk_reviews (risk_id);

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
CREATE INDEX IF NOT EXISTS rg_audit_log_created_idx ON public.rg_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS rg_audit_log_entity_idx ON public.rg_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS rg_audit_log_user_idx ON public.rg_audit_log (user_id);

-- Grants (Data API needs these; anon included because app auth is disabled)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_risk_matrix TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_risk_guidance_sections TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_dropdown_values TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_risk_register TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_risk_reviews TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_audit_log TO authenticated, anon;
GRANT ALL ON public.rg_risk_matrix, public.rg_risk_guidance_sections, public.rg_dropdown_values, public.rg_risk_register, public.rg_risk_reviews, public.rg_audit_log TO service_role;

-- updated_at helper
CREATE OR REPLACE FUNCTION public.rg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS rg_risk_register_updated_at ON public.rg_risk_register;
CREATE TRIGGER rg_risk_register_updated_at BEFORE UPDATE ON public.rg_risk_register FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();
DROP TRIGGER IF EXISTS rg_risk_matrix_updated_at ON public.rg_risk_matrix;
CREATE TRIGGER rg_risk_matrix_updated_at BEFORE UPDATE ON public.rg_risk_matrix FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();
DROP TRIGGER IF EXISTS rg_risk_guidance_updated_at ON public.rg_risk_guidance_sections;
CREATE TRIGGER rg_risk_guidance_updated_at BEFORE UPDATE ON public.rg_risk_guidance_sections FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

-- Audit trigger
CREATE OR REPLACE FUNCTION public.rg_audit_risk_register()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_user_role text;
  v_reason text; v_ip text; v_device text;
  v_field text; v_old text; v_new text;
BEGIN
  SELECT COALESCE(p.full_name, p.email, v_user_id::text) INTO v_user_name FROM public.profiles p WHERE p.user_id = v_user_id LIMIT 1;
  SELECT string_agg(role::text, ',') INTO v_user_role FROM public.user_roles WHERE user_id = v_user_id;
  v_reason := NULLIF(current_setting('rg.reason_for_change', true), '');
  v_ip := NULLIF(current_setting('rg.ip_address', true), '');
  v_device := NULLIF(current_setting('rg.device_info', true), '');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rg_audit_log (user_id, user_name, user_role, action_type, entity_type, entity_id, field_changed, previous_value, new_value, reason_for_change, is_sensitive, ip_address, device_info)
    VALUES (v_user_id, v_user_name, v_user_role, 'create', 'rg_risk_register', NEW.id, NULL, NULL, NEW.risk_external_id, v_reason, false, v_ip, v_device);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_archived = true AND COALESCE(OLD.is_archived, false) = false THEN
      INSERT INTO public.rg_audit_log (user_id, user_name, user_role, action_type, entity_type, entity_id, field_changed, previous_value, new_value, reason_for_change, is_sensitive, ip_address, device_info)
      VALUES (v_user_id, v_user_name, v_user_role, 'archive', 'rg_risk_register', NEW.id, 'is_archived', 'false', 'true', v_reason, false, v_ip, v_device);
    END IF;
    FOR v_field, v_old, v_new IN
      SELECT key,
        CASE WHEN jsonb_typeof(o.value) IN ('object','array') THEN o.value::text ELSE COALESCE(o.value #>> '{}', '') END,
        CASE WHEN jsonb_typeof(n.value) IN ('object','array') THEN n.value::text ELSE COALESCE(n.value #>> '{}', '') END
      FROM jsonb_each(to_jsonb(OLD)) o JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
      WHERE o.value IS DISTINCT FROM n.value AND key NOT IN ('updated_at','created_at')
    LOOP
      INSERT INTO public.rg_audit_log (user_id, user_name, user_role, action_type, entity_type, entity_id, field_changed, previous_value, new_value, reason_for_change, is_sensitive, ip_address, device_info)
      VALUES (v_user_id, v_user_name, v_user_role, 'update', 'rg_risk_register', NEW.id, v_field, v_old, v_new, v_reason, false, v_ip, v_device);
    END LOOP;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rg_risk_register_audit ON public.rg_risk_register;
CREATE TRIGGER rg_risk_register_audit AFTER INSERT OR UPDATE ON public.rg_risk_register FOR EACH ROW EXECUTE FUNCTION public.rg_audit_risk_register();

-- RLS + broad policies (auth is currently disabled in the app)
ALTER TABLE public.rg_risk_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_risk_guidance_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_dropdown_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_risk_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_risk_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rg_matrix_all ON public.rg_risk_matrix;
CREATE POLICY rg_matrix_all ON public.rg_risk_matrix FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rg_guidance_all ON public.rg_risk_guidance_sections;
CREATE POLICY rg_guidance_all ON public.rg_risk_guidance_sections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rg_dropdowns_all ON public.rg_dropdown_values;
CREATE POLICY rg_dropdowns_all ON public.rg_dropdown_values FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rg_register_all ON public.rg_risk_register;
CREATE POLICY rg_register_all ON public.rg_risk_register FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rg_reviews_all ON public.rg_risk_reviews;
CREATE POLICY rg_reviews_all ON public.rg_risk_reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rg_audit_all ON public.rg_audit_log;
CREATE POLICY rg_audit_all ON public.rg_audit_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed matrix
INSERT INTO public.rg_risk_matrix (likelihood_score, likelihood_label, consequence_score, consequence_label, rating) VALUES
  (1,'Rare',1,'Insignificant','Low'),(1,'Rare',2,'Minor','Low'),(1,'Rare',3,'Moderate','Low'),(1,'Rare',4,'Major','Medium'),(1,'Rare',5,'Severe','High'),
  (2,'Unlikely',1,'Insignificant','Low'),(2,'Unlikely',2,'Minor','Low'),(2,'Unlikely',3,'Moderate','Medium'),(2,'Unlikely',4,'Major','Medium'),(2,'Unlikely',5,'Severe','High'),
  (3,'Possible',1,'Insignificant','Low'),(3,'Possible',2,'Minor','Medium'),(3,'Possible',3,'Moderate','Medium'),(3,'Possible',4,'Major','High'),(3,'Possible',5,'Severe','High'),
  (4,'Likely',1,'Insignificant','Medium'),(4,'Likely',2,'Minor','Medium'),(4,'Likely',3,'Moderate','High'),(4,'Likely',4,'Major','High'),(4,'Likely',5,'Severe','Very High'),
  (5,'Almost Certain',1,'Insignificant','Medium'),(5,'Almost Certain',2,'Minor','High'),(5,'Almost Certain',3,'Moderate','High'),(5,'Almost Certain',4,'Major','Very High'),(5,'Almost Certain',5,'Severe','Very High')
ON CONFLICT (likelihood_score, consequence_score) DO UPDATE SET likelihood_label = EXCLUDED.likelihood_label, consequence_label = EXCLUDED.consequence_label, rating = EXCLUDED.rating, updated_at = now();

-- Seed guidance
INSERT INTO public.rg_risk_guidance_sections (section_key, title, content, sort_order) VALUES
('likelihood_scale','Likelihood Scale',E'1 — Rare: May only occur in exceptional circumstances.\n2 — Unlikely: Could occur at some time but not expected.\n3 — Possible: Might occur occasionally.\n4 — Likely: Will probably occur in most circumstances.\n5 — Almost Certain: Expected to occur in most circumstances.', 1),
('consequence_scale','Consequence Scale',E'1 — Insignificant: No injuries; very low impact on operations or reputation.\n2 — Minor: First aid only; small impact, easily managed.\n3 — Moderate: Medical treatment required; noticeable impact, recoverable.\n4 — Major: Serious injury or significant impact; committee involvement needed.\n5 — Severe: Fatality, permanent disability, or critical impact on the association.', 2),
('risk_response_guide','Risk Response Guide',E'Very High — Risk plan usually required; committee oversight recommended; review monthly or after incident.\nHigh — Risk plan usually required; review at least quarterly.\nMedium — Review and improve controls where practical; review quarterly or seasonally.\nLow — Monitor through normal processes; review annually or as needed.', 3)
ON CONFLICT (section_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, sort_order = EXCLUDED.sort_order, updated_at = now();

-- Seed dropdowns
INSERT INTO public.rg_dropdown_values (list_type, value, sort_order) VALUES
('risk_category','Strategic',1),('risk_category','Governance & Compliance',2),('risk_category','Financial & Insurance',3),('risk_category','Participant Safety & Welfare',4),('risk_category','Child Safety & Member Protection',5),('risk_category','Competition Operations',6),('risk_category','Venue & Event Management',7),('risk_category','Knowledge Management & Data',8),('risk_category','Resources & Volunteers',9),('risk_category','Reputation & Communication',10),('risk_category','Other / Emerging Risk',11),
('risk_type','Strategic',1),('risk_type','Operational',2),
('level','Association',1),('level','Club',2),('level','Team',3),('level','Event',4),('level','Venue',5),
('risk_status','Open',1),('risk_status','In Progress',2),('risk_status','Controlled',3),('risk_status','Closed',4),('risk_status','Deferred',5),
('review_frequency','Monthly',1),('review_frequency','Quarterly',2),('review_frequency','Pre-season',3),('review_frequency','Mid-season',4),('review_frequency','Pre-finals',5),('review_frequency','Post-season',6),('review_frequency','Post-incident',7),('review_frequency','Annually',8),
('risk_owner','President',1),('risk_owner','Vice President',2),('risk_owner','Secretary',3),('risk_owner','Treasurer',4),('risk_owner','Facilities Manager',5),('risk_owner','Participation Officer',6),('risk_owner','Club',7),('risk_owner','Contractor',8),('risk_owner','Child Safety Officer',9),('risk_owner','Umpire Coordinator',10),('risk_owner','Club President',11),('risk_owner','Coaches',12),('risk_owner','Team Managers',13),('risk_owner','Association Committee',14),('risk_owner','Competition Committee',15)
ON CONFLICT (list_type, value) DO NOTHING;
