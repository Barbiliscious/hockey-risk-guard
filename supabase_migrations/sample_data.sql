-- =====================================================================
-- Hockey Risk Guard — Sample data seed
-- Safe to run multiple times; only inserts when target tables are empty
-- (or when the specific external ID does not already exist).
-- Run in the Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extra risks (keeps phase 1's R-001..R-010; adds R-011..R-015)
-- ---------------------------------------------------------------------
INSERT INTO public.rg_risk_register
  (risk_external_id, risk_category, risk_type, level, risk_event, consequences,
   inherent_likelihood_score, inherent_consequence_score,
   current_risk_summary, controls_in_place,
   residual_likelihood_score, residual_consequence_score,
   risk_target_rating, risk_target_description, treatment_plan,
   risk_owner, status, review_frequency, next_review_date, evidence_notes)
SELECT * FROM (VALUES
  ('R-011','Financial & Insurance','Strategic','Association',
   'Insurance cover lapses or is insufficient for a major claim',
   'Association exposed to uninsured legal costs; possible insolvency.',
   2, 5,
   'Cover renewed annually; limits not benchmarked recently.',
   'Annual renewal by Treasurer; broker relationship in place.',
   1, 4,
   'Low','Maintain Low with annual benchmark of sums insured.',
   'Treasurer to obtain 3 broker quotes and benchmark limits each June.',
   'Treasurer','Open','Annually', (now() + interval '180 days')::date, ''),

  ('R-012','Reputation & Communication','Operational','Association',
   'Negative social media incident involving a club member',
   'Reputational damage; loss of sponsors; member complaints.',
   3, 3, 'Occasional posts flagged; no formal response protocol.',
   'Social media policy (2023); ad-hoc admin monitoring.',
   2, 3, 'Low','Reduce to Low via response protocol and moderator training.',
   'Publish response protocol; train two committee moderators.',
   'Secretary','In Progress','Quarterly', (now() + interval '30 days')::date, ''),

  ('R-013','Venue & Event Management','Operational','Event',
   'Canteen food safety incident at home venue',
   'Illness to attendees; council intervention; reputation harm.',
   2, 4, 'Volunteers rotate; food safety knowledge inconsistent.',
   'Food handler cards for lead volunteers; temperature log.',
   1, 3, 'Low','Reduce with mandatory annual food-safety refresher.',
   'Run pre-season food-safety session; audit temperature log monthly.',
   'Facilities Manager','Open','Pre-season', (now() + interval '90 days')::date, ''),

  ('R-014','Knowledge Management & Data','Strategic','Association',
   'Loss of historical records after committee turnover',
   'Corporate memory lost; compliance evidence unavailable.',
   4, 3, 'Records scattered across personal drives.',
   'Some records in shared drive; handover checklist drafted.',
   2, 2, 'Low','Consolidate into single shared drive with defined retention.',
   'Migrate to shared drive by end of season; document retention policy.',
   'Secretary','Open','Annually', (now() + interval '200 days')::date, ''),

  ('R-015','Participant Safety & Welfare','Operational','Team',
   'Heat illness during summer training',
   'Player heat exhaustion or worse; possible ambulance.',
   4, 3, 'Heat guidance shared informally; hydration variable.',
   'Heat policy; water available at all sessions.',
   3, 2, 'Low','Reduce via mandatory heat-check before every summer session.',
   'Adopt BOM-based heat decision tree; coach checklist.',
   'Coaches','Open','Pre-season', (now() + interval '45 days')::date, '')
) AS v(risk_external_id, risk_category, risk_type, level, risk_event, consequences,
       inherent_likelihood_score, inherent_consequence_score,
       current_risk_summary, controls_in_place,
       residual_likelihood_score, residual_consequence_score,
       risk_target_rating, risk_target_description, treatment_plan,
       risk_owner, status, review_frequency, next_review_date, evidence_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rg_risk_register r WHERE r.risk_external_id = v.risk_external_id
);

-- ---------------------------------------------------------------------
-- 2. BE SMART actions (only if table is empty)
-- ---------------------------------------------------------------------
INSERT INTO public.rg_be_smart_actions
  (linked_risk_id, action_title, baseline, evaluate,
   specific, measurable, achievable, relevant, time_based,
   responsible_person_role, resources_needed, due_date, status, progress_notes)
SELECT r.id, v.action_title, v.baseline, v.evaluate,
       v.specific, v.measurable, v.achievable, v.relevant, v.time_based,
       v.responsible_person_role, v.resources_needed, v.due_date, v.status, v.progress_notes
FROM (VALUES
  ('R-002','Roll out mandatory concussion form',
   'Form drafted but not enforced; ~30% of suspected concussions documented.',
   'Review at mid-season: target 100% documentation.',
   'Every suspected concussion recorded on the new form before return to play.',
   '100% of suspected concussion incidents have a completed form on file.',
   'Form is a single page; coaches already carry incident book.',
   'Directly addresses R-002 residual risk.',
   'Enforced from Round 1; review Round 8.',
   'Participation Officer','Printed forms, coach briefing pack',
   (now() + interval '30 days')::date, 'In Progress',
   'Draft form finalised. Awaiting coach briefing.'),

  ('R-004','Monthly WWCC audit',
   'Ad-hoc checks; 2 gaps found last season.',
   'Zero gaps at each monthly audit.',
   'Cross-check WWCC register against active volunteer list on 1st of each month.',
   'Audit report emailed to Secretary by 5th of each month.',
   'Register already maintained; audit adds ~1hr/month.',
   'Reduces R-004 to target rating.',
   'Ongoing, monthly.',
   'Secretary','Register access, volunteer list export',
   (now() + interval '14 days')::date, 'Not Started', ''),

  ('R-005','Publish umpire protection protocol',
   'Abuse incidents rising; tribunal outcomes inconsistent.',
   'Reduce reported abuse incidents by 50% year on year.',
   'Publish umpire protection protocol with mandatory reporting and sanctions.',
   'Number of abuse reports and tribunal outcomes tracked each month.',
   'Draft exists; committee approval required.',
   'Directly addresses R-005.',
   'Approve by next committee meeting; publish within 14 days.',
   'Umpire Coordinator','Committee approval, comms channels',
   (now() + interval '21 days')::date, 'In Progress',
   'Draft with committee for review.'),

  ('R-006','Move venue pre-game check to digital form',
   'Paper checklist rarely returned.',
   '100% of home games have a digital check submitted.',
   'Replace paper checklist with a digital form completed pre-game.',
   'Submission count per round.',
   'Existing form platform available.',
   'Reduces R-006 to target Low.',
   'Live by Round 3.',
   'Facilities Manager','Form platform, QR posters',
   (now() + interval '60 days')::date, 'Not Started', ''),

  ('R-009','Recruit assistant for each key committee role',
   'Same 4 people carry 80% of work.',
   'Every key role has a named assistant by AGM.',
   'Advertise assistant roles for President, Secretary, Treasurer, Facilities.',
   'Number of roles with named assistant.',
   'Realistic given club size (~250 members).',
   'Reduces R-009 volunteer burnout risk.',
   'Complete by AGM.',
   'President','Position descriptions, club newsletter',
   (now() + interval '75 days')::date, 'Not Started', ''),

  ('R-010','Move member data to a single platform with MFA',
   'Data spread across spreadsheets/email; no MFA.',
   'All member data in single platform; MFA enforced for admins.',
   'Select and migrate to a single member platform with MFA.',
   'Migration completed; MFA enabled for 100% of admins.',
   'Vendor shortlist prepared; budget available.',
   'Reduces R-010 privacy risk to Low.',
   'Vendor selected by end of quarter; migration within 60 days.',
   'Secretary','Vendor evaluation, budget approval',
   (now() + interval '90 days')::date, 'In Progress',
   'Vendor demos scheduled.'),

  ('R-001','Roster a qualified first-aider at every game',
   'Coverage inconsistent, especially for away fixtures.',
   'Every rostered fixture has a named first-aider.',
   'Add first-aider column to the game-day roster.',
   'Roster completeness per round.',
   'Roster already published weekly.',
   'Reduces R-001 to target Medium.',
   'Live from Round 1.',
   'Participation Officer','Roster template update',
   (now() - interval '7 days')::date, 'In Progress',
   'Round 1 complete; two gaps in Round 2.'),

  ('R-007','Publish weather decision tree with 7am call time',
   'Cancellations sometimes called after 9am.',
   'Cancellations decided by 7am on match day.',
   'Publish decision tree covering heat, storms and lightning.',
   'Time of decision recorded each match day.',
   'Uses existing BOM feeds.',
   'Reduces R-007 to target Low.',
   'Publish before pre-season.',
   'Competition Committee','Comms channels, BOM data',
   (now() + interval '120 days')::date, 'Not Started', '')
) AS v(risk_external_id, action_title, baseline, evaluate,
       specific, measurable, achievable, relevant, time_based,
       responsible_person_role, resources_needed, due_date, status, progress_notes)
JOIN public.rg_risk_register r ON r.risk_external_id = v.risk_external_id
WHERE NOT EXISTS (SELECT 1 FROM public.rg_be_smart_actions);

-- ---------------------------------------------------------------------
-- 3. Quality Improvement items (only if table is empty)
-- ---------------------------------------------------------------------
INSERT INTO public.rg_quality_improvement_items
  (source, qi_type, area, description, reason_background,
   linked_risk_id, priority, status,
   recommended_action, owner_reviewer, review_trigger, review_date)
SELECT v.source, v.qi_type, v.area, v.description, v.reason_background,
       r.id, v.priority, v.status,
       v.recommended_action, v.owner_reviewer, v.review_trigger, v.review_date
FROM (VALUES
  ('Post-season review','Process','Registration',
   'Registration form asks for medical info twice.',
   'Members reported duplication in end-of-season survey.',
   'R-010','Medium','Logged',
   'Simplify registration form; single medical section.',
   'Secretary','Pre-season 2027', (now() + interval '60 days')::date),

  ('Coach feedback','Training','Coaching',
   'Coaches want a short concussion pocket card.',
   'Coaches said the full policy is too long to use on the sideline.',
   'R-002','High','In Progress',
   'Design an A6 pocket card summarising HeadCheck steps.',
   'Participation Officer','Mid-season', (now() + interval '30 days')::date),

  ('Umpire debrief','Policy','Match Day',
   'Umpire abuse reporting form is hard to find.',
   'Three umpires reported not knowing where the form lives.',
   'R-005','High','Logged',
   'Add reporting link to umpire homepage; QR poster in change rooms.',
   'Umpire Coordinator','Post-incident', (now() + interval '21 days')::date),

  ('Committee','Governance','Documentation',
   'Handover notes for Treasurer are incomplete.',
   'New Treasurer spent 3 weeks locating records.',
   'R-014','Medium','Logged',
   'Adopt handover checklist and shared drive template.',
   'President','Annually', (now() + interval '90 days')::date),

  ('Venue inspection','Facility','Venue',
   'Ground A fence panels loose along east side.',
   'Facilities walkthrough identified 6 loose panels.',
   'R-006','Medium','In Progress',
   'Contractor quote requested; repair before finals.',
   'Facilities Manager','Pre-finals', (now() + interval '45 days')::date),

  ('Parent feedback','Communication','Comms',
   'Parents unclear on wet-weather cancellation channel.',
   'Multiple queries in group chat last two rounds.',
   'R-007','Low','Logged',
   'Single-source cancellation page with SMS opt-in.',
   'Secretary','Pre-season', (now() + interval '120 days')::date)
) AS v(source, qi_type, area, description, reason_background,
       risk_external_id, priority, status,
       recommended_action, owner_reviewer, review_trigger, review_date)
LEFT JOIN public.rg_risk_register r ON r.risk_external_id = v.risk_external_id
WHERE NOT EXISTS (SELECT 1 FROM public.rg_quality_improvement_items);

-- ---------------------------------------------------------------------
-- 4. Sample reviews (only if reviews table is empty)
-- ---------------------------------------------------------------------
INSERT INTO public.rg_risk_reviews
  (risk_id, reviewed_at, outcome, notes,
   inherent_likelihood_score, inherent_consequence_score, inherent_rating_snapshot,
   residual_likelihood_score, residual_consequence_score, residual_rating_snapshot,
   risk_target_rating_snapshot, risk_status_snapshot)
SELECT r.id,
       now() - (v.days_ago || ' days')::interval,
       v.outcome, v.notes,
       r.inherent_likelihood_score, r.inherent_consequence_score,
       (SELECT rating FROM public.rg_risk_matrix
         WHERE likelihood_score = r.inherent_likelihood_score
           AND consequence_score = r.inherent_consequence_score),
       r.residual_likelihood_score, r.residual_consequence_score,
       (SELECT rating FROM public.rg_risk_matrix
         WHERE likelihood_score = r.residual_likelihood_score
           AND consequence_score = r.residual_consequence_score),
       r.risk_target_rating, r.status
FROM (VALUES
  ('R-001', 45, 'Controls effective', 'First-aider coverage improved after roster change.'),
  ('R-002', 30, 'Controls partially effective', 'Concussion form now drafted; awaiting rollout.'),
  ('R-004', 20, 'Controls effective', 'Monthly WWCC audit trialled and worked.'),
  ('R-005', 15, 'Controls need review', 'Two abuse incidents this month; protocol still in draft.'),
  ('R-009', 60, 'Controls need review', 'Volunteer fatigue reported at committee meeting.')
) AS v(risk_external_id, days_ago, outcome, notes)
JOIN public.rg_risk_register r ON r.risk_external_id = v.risk_external_id
WHERE NOT EXISTS (SELECT 1 FROM public.rg_risk_reviews);

-- ---------------------------------------------------------------------
-- 5. Sample comments (only if comments table is empty)
-- ---------------------------------------------------------------------
INSERT INTO public.rg_comments (entity_type, entity_id, body)
SELECT 'risk', r.id, v.body
FROM (VALUES
  ('R-002','Coaches raised this at the last meeting — form must be finalised before Round 1.'),
  ('R-005','Two incidents flagged this round; tribunal to review next week.'),
  ('R-009','Consider pairing each key role with an assistant recruited by AGM.')
) AS v(risk_external_id, body)
JOIN public.rg_risk_register r ON r.risk_external_id = v.risk_external_id
WHERE NOT EXISTS (SELECT 1 FROM public.rg_comments);

-- =====================================================================
-- DONE. Reload the app to see the sample data.
-- =====================================================================
