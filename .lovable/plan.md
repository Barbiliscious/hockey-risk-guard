
# Phase 1 — Hockey Risk Guard Foundation

Build only Phase 1. No BE SMART, QI, reviews, comments, dashboard, exports, matrix edit, or user management.

## 0. Connect to existing Supabase
- Install `@supabase/supabase-js`, create `src/integrations/supabase/client.ts` using `huglmnjlhhngezsrqaok.supabase.co` + provided anon key in `.env`.
- Service role key stored as Lovable secret only (never bundled).
- **Verify first**: read `public.user_roles` schema and check whether `has_risk_access` / `can_edit_risk_matrix` exist. If missing, add them in `public` (with your confirmation) so both apps share them.

## 1. Schema (migration, `rg_` prefix only)
Create if not exists:
- `rg_risk_matrix` (5×5 lookup: likelihood_score+label, consequence_score+label, rating)
- `rg_risk_guidance_sections` (section_key, title, content, sort_order)
- `rg_dropdown_values` (list_type, value, description, active, sort_order)
- `rg_risk_register` — stores **scores only**, never inherent/residual rating text
- `rg_risk_reviews` — created now with all snapshot columns, **no UI yet**
- `rg_audit_log` (action_type, entity_type, entity_id, field_changed, previous/new value, reason, is_sensitive, ip, device)

Indexes on `risk_external_id`, `is_archived`, `status`, `team_id`, plus `(likelihood_score, consequence_score)` on the matrix.

`team_id` on `rg_risk_register` is nullable with FK to `public.teams` if that table is reachable.

## 2. RLS using existing helpers
Enable RLS on every `rg_*` table. Policies call the existing helpers — never `profiles.role`:
- **SELECT** on matrix, guidance, dropdowns, risk register, risk reviews, audit log → `has_risk_access(auth.uid())`
- **INSERT/UPDATE** on `rg_risk_register` → `has_risk_access(auth.uid())` (archive is a soft update)
- **INSERT** on `rg_audit_log` → `has_risk_access(auth.uid())`; **UPDATE/DELETE** denied to all
- **No DELETE** policy on `rg_risk_register` (hard delete blocked at DB level)
- Matrix/guidance/dropdowns: SELECT-only this phase (edit policies in Phase 4)

Result: admin-only or umpire-only users get nothing from any `rg_*` table. Super_admin / president / committee get full Phase 1 access.

## 3. Seed data (one-off, idempotent)
- 25 matrix rows exactly as specified (Rare→Almost Certain × Insignificant→Severe → Low/Medium/High/Very High).
- Guidance sections: Likelihood scale, Consequence scale, Risk Response Guide (Very High / High / Medium / Low text as provided).
- Dropdowns for Risk Category, Risk Type, Level, Risk Status, Review Frequency, Risk Owner — exact lists you provided.
- 10 sample risks (player injury, concussion, child safety, WWCC, umpire abuse, unsafe venue, weather, finals dispute, volunteer burnout, privacy/data) with realistic inherent/residual scores, controls, owners, next review dates.

## 4. App shell
- React Router with `react-router-dom`. Add `AuthProvider` using Supabase `onAuthStateChange` (set listener BEFORE `getSession`).
- Routes: `/auth`, `/reset-password`, `/` (redirects), `/risk` (Risk Guard area).
- Layout: red top bar `#CE2029` with "Hockey Risk Guard" + user menu, collapsible shadcn sidebar with Risk Guard nav (Risk Register, Risk Matrix & Guidance, Audit Log).
- `<RiskAccessGate>` wrapper queries `has_risk_access(auth.uid())` via RPC; if false, shows "You don't have Risk Management access — contact your administrator."
- Sidebar nav items only render when `has_risk_access` is true.
- Theme tokens in `index.css`: red primary `#CE2029`, white surfaces, slate borders. Risk badge classes: blue/amber/orange/red for Low/Medium/High/Very High. Light + dark.

## 5. Risk Matrix & Guidance page (read-only)
- 5×5 grid, columns = Consequence 1–5, rows = Likelihood 1–5, cells coloured by rating with the rating label.
- Likelihood scale, Consequence scale, Risk Response Guide rendered from `rg_risk_guidance_sections`.
- Banner: "Edit mode is available in a later phase."

## 6. Risk Register page
- Table with all listed columns. **Inherent Risk Rank** and **Residual Risk Rank** computed client-side via a `useRiskMatrix()` hook that loads `rg_risk_matrix` once and resolves `(L,C) → rating`.
- Filters: Category, Type, Level, Owner, Status, Team, Inherent Rating, Residual Rating; text search across Risk ID + Risk/Event + Consequences; sort on any column.
- Default view hides `is_archived = true`; toggle to show archived.
- **Add Risk** and **Edit Risk** dialogs (react-hook-form + zod): all fields, dropdowns from `rg_dropdown_values`, live computed rating preview as the user picks scores, Team picker from `public.teams` if accessible.
- **Archive** action: sets `is_archived=true`, `archived_at=now()`, `archived_by=auth.uid()`. No hard delete in UI.
- **View Audit History** per row: drawer filtered to that risk's audit rows.

## 7. Audit logging
- Database trigger `rg_audit_risk_register()` on INSERT/UPDATE of `rg_risk_register`:
  - INSERT → one audit row, `action_type='create'`.
  - UPDATE → one audit row per changed field, capturing previous/new value.
  - Archive (UPDATE setting `is_archived=true`) → additional row with `action_type='archive'`.
  - Captures `auth.uid()`, joins to `profiles` for `user_name`, joins to `user_roles` for `user_role`.
- Reason for change: optional in Phase 1 (set via a session GUC `rg.reason_for_change` from the client when present), mandatory fields land in Phase 4.
- IP/device captured from session GUCs set by the client on each request where available.

## 8. Audit Log page
- Table of `rg_audit_log` ordered by `created_at desc`.
- Filters: user, entity type, action type, date range, "Sensitive only".
- Read-only.

## 9. Acceptance tests covered
All 14 tests in your brief — I'll walk through each in the post-build summary.

## Out of scope (Phase 1)
BE SMART, QI, reviews UI, comments, dashboard, alerts, exports, matrix/guidance edit, impact preview, user management, "Clear sample data".

## After-build summary will include
What was built · new tables · existing tables reused (`profiles`, `teams`, `user_roles` + helpers) · RLS policies · how the live rating lookup works · how to run each acceptance test · limitations and assumptions (helper-function verification result, team FK reachability, reason-for-change handling deferred to Phase 4).

---

**One thing to confirm before approval:** if `has_risk_access` / `can_edit_risk_matrix` don't yet exist in your Supabase, do you want me to create them in `public` as part of Phase 1, or pause and have you add them on the Umpire Portal side first?
