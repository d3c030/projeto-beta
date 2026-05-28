import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getContactSettings, THEMES, type ThemeName } from "@/lib/settings.functions";
import { supabase } from "@/integrations/supabase/client";

const THEME_CLASSES = THEMES.map((t) => `theme-${t}`);

export function ThemeApplier() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    supabase.auth.getSession().then((result) => setAuthed(!!result.data.session));
    return () => subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: ["public-contact-settings"],
    queryFn: () => getContactSettings(),
    staleTime: 60_000,
    enabled: authed,
  });

  const theme: ThemeName = q.data?.theme ?? "rosa";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    THEME_CLASSES.forEach((c) => root.classList.remove(c));
    // 'rosa' is the default :root palette → no class needed.
    if (theme !== "rosa") root.classList.add(`theme-${theme}`);
  }, [theme]);

  return null;
}
