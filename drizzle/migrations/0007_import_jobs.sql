CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  user_id uuid,
  user_email text,
  status text NOT NULL DEFAULT 'running',
  total integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.import_jobs TO authenticated;
GRANT ALL ON public.import_jobs TO service_role;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads import jobs" ON public.import_jobs FOR SELECT TO authenticated USING (public.is_team_member(auth.uid()));
CREATE POLICY "team creates own import jobs" ON public.import_jobs FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "team updates own import jobs" ON public.import_jobs FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_team_member(auth.uid()));