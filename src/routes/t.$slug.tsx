import { createFileRoute, Outlet, useParams, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getTenantBySlug, type PublicTenant } from "@/lib/tenant-public.functions";
import { THEMES } from "@/lib/settings.functions";

export const Route = createFileRoute("/t/$slug")({
  component: TenantLayout,
});

const THEME_CLASSES = THEMES.map((t) => `theme-${t}`);

function TenantLayout() {
  const { slug } = useParams({ from: "/t/$slug" });
  const q = useQuery({
    queryKey: ["public-tenant", slug],
    queryFn: () => getTenantBySlug({ data: { slug } }),
    staleTime: 60_000,
  });

  const theme = q.data?.theme ?? "rosa";
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    THEME_CLASSES.forEach((c) => root.classList.remove(c));
    if (theme !== "rosa") root.classList.add(`theme-${theme}`);
  }, [theme]);

  if (q.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-2 max-w-sm">
          <h1 className="font-display text-2xl">Página não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            Esse link não está disponível. Verifique o endereço e tente novamente.
          </p>
        </div>
      </div>
    );
  }
  if (q.data.status === "suspenso") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-2 max-w-sm">
          <h1 className="font-display text-2xl">Indisponível no momento</h1>
          <p className="text-sm text-muted-foreground">
            Esse profissional está temporariamente fora do ar.
          </p>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

export type TenantOutletData = PublicTenant;