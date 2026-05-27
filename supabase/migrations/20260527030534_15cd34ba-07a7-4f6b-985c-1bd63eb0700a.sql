CREATE TABLE public.help_videos (
  topic_id TEXT PRIMARY KEY,
  video_url TEXT NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_videos TO authenticated;
GRANT ALL ON public.help_videos TO service_role;

ALTER TABLE public.help_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view help videos"
ON public.help_videos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Superadmin can insert help videos"
ON public.help_videos FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update help videos"
ON public.help_videos FOR UPDATE
TO authenticated
USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete help videos"
ON public.help_videos FOR DELETE
TO authenticated
USING (public.is_superadmin(auth.uid()));

CREATE TRIGGER help_videos_touch_updated_at
BEFORE UPDATE ON public.help_videos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();