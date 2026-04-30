## Phase 1 follow-up — scope check

Most of this request was already delivered in the previous round. Verifying against the current code:

| Requirement | Status |
|---|---|
| 1. Auto Risk ID (hidden on Add, read-only on Edit, helper text) | Done — `RiskFormDialog` lines 170–181; DB sequence in `phase1_fixes.sql` |
| 2. Likelihood/Consequence show "N — Label" | Done — `likelihoodOptions` / `consequenceOptions` in `useRiskMatrix.ts`; `ScoreSelect` renders `display` |
| 3. New risks default to Open | Done — form default `"Open"`, DB column default `'Open'`, insert omits blank status |
| 4. Optional `rg_clubs` table + `club_id` on register | Done — `phase1_fixes.sql` creates table, FK, RLS, seed |
| 5. Club column + filter on Register | Done — `RiskRegisterPage` |
| 6. Audit logs club/team/status/generated ID | Done — existing `rg_audit_risk_register()` field-level diff covers all new columns |

The **only meaningful behaviour change** in this round vs. what's already shipped is in item 4's Team UI rule. Currently:

- Team select is **disabled** (not hidden) until a Club is picked.
- If a club has no `rg_team_club_links` rows, the form **falls back to showing all teams** with a hint.

The new spec asks for: hide-or-grey Team until a Club is chosen, and drop the "complicated linking logic" — i.e., once a Club is selected, just show all teams from `public.teams` (proper mapping comes later in Settings/Admin).

## Plan — single file edit

**`src/components/RiskFormDialog.tsx`**

1. Remove the `useTeamClubLinks` import and usage (no link-based filtering this phase).
2. Replace the `filteredTeams` / `linkedTeamIds` / `noLinksHint` block with simply: `const teamHidden = !selectedClub;`
3. In the Team `<Field>`:
   - When `teamHidden`, render a disabled placeholder input ("Select a Club first") so the grid layout stays stable on the 3-column row, OR conditionally render nothing — picking **disabled placeholder** to preserve layout (matches "hide the Team field or show it disabled/greyed out" wording).
   - When a Club is selected, show the full `teams` list via the existing `SelectField`.
4. Remove the now-unused "No teams are linked to this club yet" hint.
5. Keep the `onChangeExtra` on the Club select that clears `team_id` when the Club changes/clears.

No DB change, no new hooks, no other page edits. `useTeamClubLinks.ts` file can stay (unused) — it's harmless and may be wired up properly in a later admin phase.

## Acceptance check after edit

- Add Risk: Risk ID shows "(auto)" + helper text — already true.
- Likelihood/Consequence dropdowns show "3 — Possible" / "2 — Minor" — already true.
- Status defaults to Open — already true.
- Club optional; Team field appears disabled/greyed with "Select a Club first" until a Club is chosen.
- Once a Club is chosen, Team dropdown lists all teams from `public.teams`.
- Save with no Club & no Team works (both nullable, normalised to `null`).
- Save with Club only works.
- Save with Club + Team works.
- Existing risks (R-001..R-010) untouched; audit log continues to record changes.

## Out of scope (Phase 2+)
BE SMART, QI, reviews UI, comments, dashboard, alerts, exports, matrix/guidance edit UI, Settings/Admin team-to-club mapping screen.
