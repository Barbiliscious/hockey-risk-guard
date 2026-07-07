
CREATE SEQUENCE IF NOT EXISTS public.rg_risk_id_seq START WITH 11;

CREATE OR REPLACE FUNCTION public.rg_next_risk_external_id()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'R-' || lpad(nextval('public.rg_risk_id_seq')::text, 3, '0');
$$;

DO $$
DECLARE v_max int;
BEGIN
  SELECT COALESCE(MAX((regexp_replace(risk_external_id, '\D', '', 'g'))::int), 0) INTO v_max
    FROM public.rg_risk_register WHERE risk_external_id ~ '^R-\d+$';
  PERFORM setval('public.rg_risk_id_seq', GREATEST(v_max + 1, 11), false);
END $$;

ALTER TABLE public.rg_risk_register ALTER COLUMN risk_external_id SET DEFAULT public.rg_next_risk_external_id();

CREATE TABLE IF NOT EXISTS public.rg_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_clubs TO authenticated, anon;
GRANT ALL ON public.rg_clubs TO service_role;

DROP TRIGGER IF EXISTS rg_clubs_updated_at ON public.rg_clubs;
CREATE TRIGGER rg_clubs_updated_at BEFORE UPDATE ON public.rg_clubs FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.rg_team_club_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.rg_clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, team_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rg_team_club_links TO authenticated, anon;
GRANT ALL ON public.rg_team_club_links TO service_role;
CREATE INDEX IF NOT EXISTS rg_team_club_links_club_idx ON public.rg_team_club_links (club_id);
CREATE INDEX IF NOT EXISTS rg_team_club_links_team_idx ON public.rg_team_club_links (team_id);

ALTER TABLE public.rg_risk_register ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.rg_clubs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS rg_risk_register_club_idx ON public.rg_risk_register (club_id);

ALTER TABLE public.rg_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_team_club_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rg_clubs_all ON public.rg_clubs;
CREATE POLICY rg_clubs_all ON public.rg_clubs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS rg_team_club_links_all ON public.rg_team_club_links;
CREATE POLICY rg_team_club_links_all ON public.rg_team_club_links FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.rg_clubs (name) VALUES
  ('Ballarat'),('Eureka'),('Grampians'),('WestVic'),('East Grampians'),('Other / Unknown')
ON CONFLICT (name) DO NOTHING;

-- Now seed the 10 sample risks
INSERT INTO public.rg_risk_register
  (risk_external_id, risk_category, risk_type, level, risk_event, consequences,
   inherent_likelihood_score, inherent_consequence_score,
   current_risk_summary, controls_in_place,
   residual_likelihood_score, residual_consequence_score,
   risk_target_rating, risk_target_description, treatment_plan,
   risk_owner, status, review_frequency, next_review_date, evidence_notes)
SELECT * FROM (VALUES
  ('R-001','Participant Safety & Welfare','Operational','Association','Serious player injury during a match','Player suffers serious injury; ambulance required; possible long-term harm.',3,5,'Injuries do occur; first-aid kits and trained first-aiders are present at most venues.','First-aid kits at all venues; trained first-aiders rostered; emergency procedure displayed.',2,4,'Medium','Reduce to Medium through stronger first-aid coverage and reporting.','Roster a qualified first-aider at every game; quarterly first-aid refresher.','Participation Officer','Open','Quarterly',(now() + interval '60 days')::date,'Reviewed after 2025 season opener.'),
  ('R-002','Participant Safety & Welfare','Operational','Association','Concussion not managed correctly','Player returns to play too soon; risk of second-impact syndrome and long-term harm.',4,5,'Coaches generally aware of return-to-play but inconsistent paperwork.','Concussion policy adopted; HeadCheck app referenced.',3,4,'Medium','Embed mandatory concussion form for any suspected concussion.','Annual coach education; mandatory concussion form; medical clearance before return.','Participation Officer','In Progress','Pre-season',(now() + interval '30 days')::date,'Form drafted but not yet enforced.'),
  ('R-003','Child Safety & Member Protection','Strategic','Association','Child safety incident or disclosure','Harm to a child; reputational and legal consequences; mandatory reporting obligations.',2,5,'Child Safe policy in place; incident pathway defined.','Child Safe Code of Conduct; Child Safety Officer appointed; reporting flowchart.',1,5,'Low','Maintain at Low through ongoing training and clear reporting.','Annual Child Safe training; quarterly review of CSO inbox.','Child Safety Officer','Open','Quarterly',(now() + interval '45 days')::date,''),
  ('R-004','Governance & Compliance','Operational','Association','Coach/volunteer working without valid WWCC','Breach of Working with Children obligations; child placed at risk.',3,4,'Most volunteers have WWCC on file; some gaps for new coaches mid-season.','WWCC register maintained; pre-season check.',2,4,'Medium','Maintain at Medium with monthly WWCC audit.','Monthly WWCC audit; block sign-on without verified WWCC.','Secretary','In Progress','Monthly',(now() + interval '14 days')::date,''),
  ('R-005','Competition Operations','Operational','Association','Umpire abuse or assault by spectator/player','Umpire harm; loss of umpiring workforce; reputational damage.',4,4,'Incidents have occurred; tribunal process exists but enforcement is inconsistent.','Code of Conduct displayed; tribunal process; spectator behaviour policy.',3,3,'Medium','Reduce through visible enforcement and umpire support.','Mandatory reporting of any verbal/physical abuse; club sanctions; umpire debrief.','Umpire Coordinator','Open','Mid-season',(now() + interval '21 days')::date,''),
  ('R-006','Venue & Event Management','Operational','Venue','Unsafe venue condition (surface, lighting, fencing)','Player injury; event cancellation; insurance claim.',3,4,'Pre-game checks done informally.','Pre-game venue checklist (paper).',2,3,'Low','Embed digital pre-game venue check.','Move pre-game checklist to digital form; Facilities Manager weekly walkthrough.','Facilities Manager','Open','Pre-season',(now() + interval '90 days')::date,''),
  ('R-007','Competition Operations','Operational','Event','Severe weather causing late cancellation','Player heat illness or lightning exposure; cost of late cancellation; reputational impact.',4,3,'Cancellations happen but call-time is sometimes late.','Heat policy; lightning policy; comms via website + app.',3,2,'Low','Aim for Low with earlier call times.','Decision tree; call by 7am match day; SMS to clubs.','Competition Committee','Open','Pre-season',(now() + interval '120 days')::date,''),
  ('R-008','Competition Operations','Operational','Association','Finals eligibility dispute','Team penalised; tribunal workload; member dissatisfaction.',3,3,'Eligibility tracked in spreadsheet; some ambiguity in by-laws.','By-laws published; eligibility report mid-season.',2,3,'Low','Aim for Low through clearer by-laws (2027 review).','Eligibility report from round 10; clarify in 2027 by-law review.','Competition Committee','Open','Pre-finals',(now() + interval '150 days')::date,''),
  ('R-009','Resources & Volunteers','Strategic','Association','Volunteer burnout / loss of key office bearers','Loss of corporate knowledge; gaps in roles; reputational damage.',4,4,'Same small group carrying most workload.','Position descriptions; some succession notes.',3,3,'Medium','Reduce by sharing workload and recruiting.','Recruit assistant for each key role; document procedures; rotate tasks.','President','Open','Quarterly',(now() + interval '75 days')::date,''),
  ('R-010','Knowledge Management & Data','Operational','Association','Privacy / data breach (member data exposed)','Breach of Privacy Act; member trust eroded; possible notifiable data breach.',3,4,'Data lives across spreadsheets and email; access controls patchy.','Limited admin access; password manager partially used.',2,3,'Low','Reduce by consolidating systems and access controls.','Move member data to single platform; MFA; quarterly access review.','Secretary','Open','Quarterly',(now() + interval '60 days')::date,'')
) AS v(risk_external_id, risk_category, risk_type, level, risk_event, consequences, inherent_likelihood_score, inherent_consequence_score, current_risk_summary, controls_in_place, residual_likelihood_score, residual_consequence_score, risk_target_rating, risk_target_description, treatment_plan, risk_owner, status, review_frequency, next_review_date, evidence_notes)
WHERE NOT EXISTS (SELECT 1 FROM public.rg_risk_register);
