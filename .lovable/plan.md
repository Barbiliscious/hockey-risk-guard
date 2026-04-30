
# Phase 1 Fixes — Hockey Risk Guard

Targeted refinements to the existing Phase 1 build. No Phase 2 features.

## 1. Database migration (`supabase_migrations/phase1_fixes.sql`)

**Auto Risk ID generation (DB-side, safe against imports/API):**
- Create `rg_risk_id_seq` sequence starting at 11 (R-001..R-010 already used by seed).
- Function `rg_next_risk_external_id()` returns `'R-' || lpad(nextval('rg_risk_id_seq')::text, 3, '0')`.
- Alter `rg_risk_register.risk_external_id` to `DEFAULT public.rg_next_risk_external_id()` and keep the existing UNIQUE constraint.
- Initialise sequence with `setval` to `GREATEST(11, max+1)` of existing numeric suffixes parsed from `risk_external_id` (so re-running is safe).

**Default status:**
- Already `DEFAULT 'Open'` at the column level — confirmed. No change needed in DB; UI will rely on it (and not send status on insert when blank).

**Clubs support (new tables):**
- `rg_clubs (id uuid pk, name text not null unique, short_name text, active bool default true, created_at, updated_at)`.
- `rg_team_club_links (id uuid pk, club_id uuid → rg_clubs(id) on delete cascade, team_id uuid → public.teams(id) on delete cascade, active bool default true, created_at, unique(club_id, team_id))`.
- Alter `rg_risk_register` to add `club_id uuid REFERENCES rg_clubs(id) ON DELETE SET NULL` (nullable). Index on `club_id`.
- `updated_at` trigger on `rg_clubs`.

**RLS for new tables:**
- Enable RLS on `rg_clubs` and `rg_team_club_links`.
- SELECT for `has_risk_access(auth.uid())` on both.
- INSERT/UPDATE on `rg_clubs` and `rg_team_club_links` gated by `has_risk_access` (admin-only edit UI comes in Phase 4; for now allow risk users to manage minimal seed via SQL or future screens — no UI exposed this phase beyond using them).

**Seed `rg_clubs`** (idempotent, `ON CONFLICT (name) DO NOTHING`):
Ballarat, Eureka, Grampians, WestVic, East Grampians, Other / Unknown.

**Audit logging:**
- The existing `rg_audit_risk_register()` trigger uses `to_jsonb(OLD/NEW)` field-by-field diff, so the new `club_id` column is automatically logged. The auto-generated `risk_external_id` on INSERT is already captured (`new_value = NEW.risk_external_id`). No trigger code change needed.

## 2. Frontend — `src/components/RiskFormDialog.tsx`

- Remove `risk_external_id` from the zod schema (or mark optional and never send on create).
- On **Add**: hide the Risk ID field entirely; show helper text "Risk ID will be generated automatically when saved." Do not include `risk_external_id` in the insert payload — DB default fills it. After insert, invalidate queries (existing) so the new R-### appears.
- On **Edit**: show Risk ID as a read-only, disabled `Input` (display only, never sent in update payload).
- Default `status` to `"Open"` for new risks (already the default in `useForm.values`); ensure on insert if blank we omit it so DB default applies.
- Replace `ScoreSelect` numeric items with labelled items using the loaded `rg_risk_matrix`:
  - Likelihood: `1 — Rare … 5 — Almost Certain` (derived from distinct `likelihood_score`/`likelihood_label` in matrix).
  - Consequence: `1 — Insignificant … 5 — Severe`.
  - Stored value remains the integer score.
  - Trigger `<SelectValue>` displays the same `"N — Label"` string.
- Add **Club** select (optional) using a new `useClubs()` hook.
- Add **Team** select behaviour:
  - New `useTeamClubLinks()` hook fetches `rg_team_club_links`.
  - When a Club is selected, filter `teams` to those linked to the club. If no links exist for that club, show all teams (graceful fallback) with a small hint.
  - When no Club selected, **disable** the Team select with placeholder "Select a Club first (optional)" — chosen as the cleaner option per request.
  - Allow clearing both back to "—" (none).

## 3. Frontend — `src/pages/RiskRegisterPage.tsx`

- Add `club_id` to the `Risk` type.
- Query selects `*` already covers `club_id`.
- New column **Club** in the table (between Team and Evidence/Notes — or before Team, grouping organisationally). Render via club lookup.
- New **Club** filter in the filter bar (uses `useClubs()`); options are active clubs.
- Display likelihood/consequence cells as "`N — Label`" using a small helper that reads from the matrix (table view: keep "Inh L" / "Inh C" header but render labelled value; if column space is tight, render `N` with tooltip showing label — pick labelled inline since user asked "where practical").

## 4. New hooks

- `src/hooks/useClubs.ts` — react-query fetch from `rg_clubs` where `active = true`, ordered by name.
- `src/hooks/useTeamClubLinks.ts` — react-query fetch from `rg_team_club_links` where `active = true`. Provides `teamsForClub(clubId)` helper.
- Extend `useRiskMatrix.ts` with helpers `likelihoodOptions()` and `consequenceOptions()` returning `[{score, label, display: "1 — Rare"}]` derived from matrix rows (deduped).

## 5. Acceptance test mapping

1. Risk ID field hidden on Add, read-only on Edit, helper text shown.
2. Insert with no `risk_external_id` → DB default produces next R-### (R-011 first).
3. Likelihood select shows "3 — Possible".
4. Consequence select shows "2 — Minor".
5. New risk gets `status = 'Open'` (column default).
6. Club select present and optional.
7. Team select present and optional.
8. Selecting a Club filters Team list via `rg_team_club_links`.
9. Save with no Club / no Team works (both nullable).
10. Save with Club + Team works.
11. Existing risks (R-001..R-010) unaffected — their `risk_external_id` values preserved; sequence starts above max.
12. Umpire Portal tables untouched (only new `rg_*` tables created; `public.teams` only referenced via FK).
13. Audit log records `club_id`, `team_id`, status changes, and create rows with generated ID via existing trigger.

## 6. Files to create / change

**Create**
- `supabase_migrations/phase1_fixes.sql`
- `src/hooks/useClubs.ts`
- `src/hooks/useTeamClubLinks.ts`

**Edit**
- `src/hooks/useRiskMatrix.ts` — add option builders.
- `src/components/RiskFormDialog.tsx` — hide/readonly Risk ID, labelled scores, Club field, Team filtering, default Open.
- `src/pages/RiskRegisterPage.tsx` — add Club column + filter, `club_id` in Risk type, labelled L/C cells.

## Out of scope (still deferred to later phases)
BE SMART, QI, reviews UI, comments, dashboard, alerts, exports, matrix/guidance edit UI, club admin screen, user management.

## Note
You will need to run `supabase_migrations/phase1_fixes.sql` in the Supabase SQL editor after I make the code changes. I'll flag this clearly in the post-build summary.
