-- =====================================================================
-- Hockey Risk Guard — Phase 1 fixes
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Auto-generated Risk ID (DB-side default)
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.rg_risk_id_seq START WITH 11;

CREATE OR REPLACE FUNCTION public.rg_next_risk_external_id()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'R-' || lpad(nextval('public.rg_risk_id_seq')::text, 3, '0');
$$;

-- Bump sequence above any existing R-### values so we never collide.
DO $$
DECLARE
  v_max int;
BEGIN
  SELECT COALESCE(MAX( (regexp_replace(risk_external_id, '\D', '', 'g'))::int ), 0)
    INTO v_max
  FROM public.rg_risk_register
  WHERE risk_external_id ~ '^R-\d+$';

  PERFORM setval('public.rg_risk_id_seq', GREATEST(v_max + 1, 11), false);
END $$;

ALTER TABLE public.rg_risk_register
  ALTER COLUMN risk_external_id SET DEFAULT public.rg_next_risk_external_id();

-- ---------------------------------------------------------------------
-- 2. Clubs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rg_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS rg_clubs_updated_at ON public.rg_clubs;
CREATE TRIGGER rg_clubs_updated_at
  BEFORE UPDATE ON public.rg_clubs
  FOR EACH ROW EXECUTE FUNCTION public.rg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.rg_team_club_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.rg_clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, team_id)
);
CREATE INDEX IF NOT EXISTS rg_team_club_links_club_idx
  ON public.rg_team_club_links (club_id);
CREATE INDEX IF NOT EXISTS rg_team_club_links_team_idx
  ON public.rg_team_club_links (team_id);

-- ---------------------------------------------------------------------
-- 3. Add club_id to risk register
-- ---------------------------------------------------------------------
ALTER TABLE public.rg_risk_register
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.rg_clubs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS rg_risk_register_club_idx
  ON public.rg_risk_register (club_id);

-- ---------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.rg_clubs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg_team_club_links  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS rg_clubs_select ON public.rg_clubs';
  EXECUTE 'CREATE POLICY rg_clubs_select ON public.rg_clubs
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_clubs_insert ON public.rg_clubs';
  EXECUTE 'CREATE POLICY rg_clubs_insert ON public.rg_clubs
            FOR INSERT TO authenticated
            WITH CHECK (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_clubs_update ON public.rg_clubs';
  EXECUTE 'CREATE POLICY rg_clubs_update ON public.rg_clubs
            FOR UPDATE TO authenticated
            USING (public.has_risk_access(auth.uid()))
            WITH CHECK (public.has_risk_access(auth.uid()))';

  EXECUTE 'DROP POLICY IF EXISTS rg_team_club_links_select ON public.rg_team_club_links';
  EXECUTE 'CREATE POLICY rg_team_club_links_select ON public.rg_team_club_links
            FOR SELECT TO authenticated
            USING (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_team_club_links_insert ON public.rg_team_club_links';
  EXECUTE 'CREATE POLICY rg_team_club_links_insert ON public.rg_team_club_links
            FOR INSERT TO authenticated
            WITH CHECK (public.has_risk_access(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS rg_team_club_links_update ON public.rg_team_club_links';
  EXECUTE 'CREATE POLICY rg_team_club_links_update ON public.rg_team_club_links
            FOR UPDATE TO authenticated
            USING (public.has_risk_access(auth.uid()))
            WITH CHECK (public.has_risk_access(auth.uid()))';
END $$;

-- ---------------------------------------------------------------------
-- 5. Seed clubs
-- ---------------------------------------------------------------------
INSERT INTO public.rg_clubs (name) VALUES
  ('Ballarat'),
  ('Eureka'),
  ('Grampians'),
  ('WestVic'),
  ('East Grampians'),
  ('Other / Unknown')
ON CONFLICT (name) DO NOTHING;
