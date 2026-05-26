import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getContactSettings, THEMES, type ThemeName } from "@/lib/settings.functions";

const THEME_CLASSES = THEMES.map((t) => `theme-${t}`);

export function ThemeApplier() {
  const q = useQuery({
    queryKey: ["public-contact-settings"],
    queryFn: () => getContactSettings(),
    staleTime: 60_000,
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
