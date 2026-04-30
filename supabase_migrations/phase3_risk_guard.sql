-- =====================================================================
-- Hockey Risk Guard — Phase 3 migration
-- Adds helper SQL views for dashboard, alerts and the due-items list.
-- All views are explicitly SECURITY INVOKER so callers must have
-- has_risk_access(auth.uid()) via underlying table RLS.
-- Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Risks with live ratings (joined to current rg_risk_matrix)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.rg_v_risks_with_live_ratings
WITH (security_invoker = true)
AS
SELECT
  r.*,
  mi.rating AS live_inherent_rating,
  mr.rating AS live_residual_rating,
  CASE r.risk_target_rating
    WHEN 'Low' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'High' THEN 3
    WHEN 'Very High' THEN 4
    ELSE NULL
  END AS target_rating_score,
  CASE mr.rating
    WHEN 'Low' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'High' THEN 3
    WHEN 'Very High' THEN 4
    ELSE NULL
  END AS residual_rating_score
FROM public.rg_risk_register r
LEFT JOIN public.rg_risk_matrix mi
  ON mi.likelihood_score = r.inherent_likelihood_score
 AND mi.consequence_score = r.inherent_consequence_score
LEFT JOIN public.rg_risk_matrix mr
  ON mr.likelihood_score = r.residual_likelihood_score
 AND mr.consequence_score = r.residual_consequence_score;

-- ---------------------------------------------------------------------
-- 2. Combined due items list
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.rg_v_due_items
WITH (security_invoker = true)
AS
-- Risk reviews
SELECT
  'Risk Review'::text                        AS item_type,
  r.id                                       AS item_id,
  r.risk_external_id                         AS external_id,
  r.id                                       AS linked_risk_id,
  r.risk_external_id                         AS linked_risk_external_id,
  r.risk_event                               AS title,
  r.risk_owner                               AS owner,
  r.next_review_date                         AS due_date,
  r.status                                   AS status,
  (CURRENT_DATE - r.next_review_date)        AS days_overdue
FROM public.rg_risk_register r
WHERE r.is_archived = false
  AND COALESCE(r.status, '') <> 'Closed'
  AND r.next_review_date IS NOT NULL
UNION ALL
-- BE SMART actions
SELECT
  'BE SMART Action',
  a.id,
  a.action_external_id,
  a.linked_risk_id,
  rr.risk_external_id,
  a.action_title,
  a.responsible_person_role,
  a.due_date,
  a.status,
  (CURRENT_DATE - a.due_date)
FROM public.rg_be_smart_actions a
LEFT JOIN public.rg_risk_register rr ON rr.id = a.linked_risk_id
WHERE a.is_archived = false
  AND COALESCE(a.status, '') NOT IN ('Complete','Completed','Closed')
  AND a.due_date IS NOT NULL
UNION ALL
-- QI items
SELECT
  'QI Item',
  q.id,
  q.qi_external_id,
  q.linked_risk_id,
  rr.risk_external_id,
  q.description,
  q.owner_reviewer,
  q.review_date,
  q.status,
  (CURRENT_DATE - q.review_date)
FROM public.rg_quality_improvement_items q
LEFT JOIN public.rg_risk_register rr ON rr.id = q.linked_risk_id
WHERE q.is_archived = false
  AND COALESCE(q.status, '') NOT IN ('Closed','Rejected')
  AND q.review_date IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. Risk alerts view (one row per risk, with alert flags)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.rg_v_risk_alerts
WITH (security_invoker = true)
AS
WITH live AS (
  SELECT * FROM public.rg_v_risks_with_live_ratings
),
action_counts AS (
  SELECT linked_risk_id, COUNT(*) AS active_action_count
  FROM public.rg_be_smart_actions
  WHERE is_archived = false AND linked_risk_id IS NOT NULL
  GROUP BY linked_risk_id
)
SELECT
  l.id,
  l.risk_external_id,
  l.risk_event,
  l.risk_owner,
  l.status,
  l.club_id,
  l.team_id,
  l.controls_in_place,
  l.live_inherent_rating,
  l.live_residual_rating,
  l.risk_target_rating,
  l.next_review_date,
  COALESCE(ac.active_action_count, 0) AS active_action_count,
  -- Flags
  (l.next_review_date IS NOT NULL
    AND l.next_review_date < CURRENT_DATE
    AND COALESCE(l.status,'') <> 'Closed'
    AND l.is_archived = false)                              AS flag_review_overdue,
  (l.live_residual_rating IN ('High','Very High')
    AND COALESCE(l.status,'') <> 'Closed'
    AND l.is_archived = false
    AND COALESCE(ac.active_action_count, 0) = 0)            AS flag_high_no_action,
  (l.target_rating_score IS NOT NULL
    AND l.residual_rating_score IS NOT NULL
    AND l.residual_rating_score > l.target_rating_score
    AND l.is_archived = false
    AND COALESCE(l.status,'') <> 'Closed')                  AS flag_residual_above_target,
  (COALESCE(NULLIF(TRIM(l.controls_in_place), ''), '') = ''
    AND l.is_archived = false
    AND COALESCE(l.status,'') <> 'Closed')                  AS flag_no_controls,
  (COALESCE(NULLIF(TRIM(l.risk_owner), ''), '') = ''
    AND l.is_archived = false
    AND COALESCE(l.status,'') <> 'Closed')                  AS flag_no_owner
FROM live l
LEFT JOIN action_counts ac ON ac.linked_risk_id = l.id;

-- ---------------------------------------------------------------------
-- 4. Dashboard summary view (single row)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.rg_v_dashboard_summary
WITH (security_invoker = true)
AS
WITH live AS (
  SELECT * FROM public.rg_v_risks_with_live_ratings WHERE is_archived = false
),
alerts AS (
  SELECT * FROM public.rg_v_risk_alerts
)
SELECT
  (SELECT COUNT(*) FROM live)                                                 AS total_risks,
  (SELECT COUNT(*) FROM live WHERE live_residual_rating = 'Very High')        AS very_high_risks,
  (SELECT COUNT(*) FROM live WHERE live_residual_rating = 'High')             AS high_risks,
  (SELECT COUNT(*) FROM live WHERE live_residual_rating = 'Medium')           AS medium_risks,
  (SELECT COUNT(*) FROM live WHERE live_residual_rating = 'Low')              AS low_risks,
  (SELECT COUNT(*) FROM public.rg_be_smart_actions
    WHERE is_archived = false
      AND COALESCE(status,'') NOT IN ('Complete','Completed','Closed')
      AND due_date IS NOT NULL AND due_date < CURRENT_DATE)                   AS overdue_actions,
  (SELECT COUNT(*) FROM public.rg_be_smart_actions
    WHERE is_archived = false
      AND COALESCE(status,'') NOT IN ('Complete','Completed','Closed'))      AS open_actions,
  (SELECT COUNT(*) FROM public.rg_quality_improvement_items
    WHERE is_archived = false AND status = 'Under Review')                   AS qi_under_review,
  (SELECT COUNT(*) FROM public.rg_quality_improvement_items
    WHERE is_archived = false AND related_project_review = '2027 By-Law Review') AS bylaw_2027_items,
  (SELECT COUNT(*) FROM alerts WHERE flag_review_overdue)                     AS alert_review_overdue,
  (SELECT COUNT(*) FROM alerts WHERE flag_high_no_action)                     AS alert_high_no_action,
  (SELECT COUNT(*) FROM alerts WHERE flag_residual_above_target)              AS alert_residual_above_target,
  (SELECT COUNT(*) FROM alerts WHERE flag_no_controls)                        AS alert_no_controls,
  (SELECT COUNT(*) FROM alerts WHERE flag_no_owner)                           AS alert_no_owner,
  (SELECT COUNT(*) FROM public.rg_quality_improvement_items
    WHERE is_archived = false
      AND status IN ('Logged','Under Review','Awaiting Decision'))            AS alert_qi_awaiting_decision;

-- ---------------------------------------------------------------------
-- 5. Grants (RLS on underlying tables still applies)
-- ---------------------------------------------------------------------
GRANT SELECT ON public.rg_v_risks_with_live_ratings TO authenticated;
GRANT SELECT ON public.rg_v_due_items               TO authenticated;
GRANT SELECT ON public.rg_v_risk_alerts             TO authenticated;
GRANT SELECT ON public.rg_v_dashboard_summary       TO authenticated;
