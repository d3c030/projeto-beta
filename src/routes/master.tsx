import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Users2, Activity, ArrowLeft, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAccessState } from "@/lib/tenant.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/master")({
  head: () => ({ meta: [{ title: "Painel Master — Super Admin" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    try {
      const state = await getAccessState();
      if (!state.isSuperadmin) throw redirect({ to: "/" });
    } catch (e) {
      throw redirect({ to: "/" });
    }
  },
  component: MasterLayout,
});

const items = [
  { to: "/master", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/master/clientes", label: "Clientes", icon: Users2, exact: false },
  { to: "/master/acessos", label: "Acessos", icon: Activity, exact: false },
] as const;

function MasterLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);
  return (
    <div className="-mx-4 md:-mx-8 -my-6 min-h-[calc(100vh-3.5rem)] md:min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08),_transparent_55%),_linear-gradient(180deg,_#09090b_0%,_#050507_100%)] text-zinc-100">
      {/* Top header */}
      <header className="sticky top-0 md:top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Crown className="h-4 w-4 md:h-4.5 md:w-4.5 text-zinc-950" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80 leading-none">Painel</p>
              <h1 className="font-display text-base md:text-lg text-zinc-50 leading-tight truncate">Master</h1>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 hover:text-zinc-100 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-2 md:px-6">
          <nav className="flex gap-1 overflow-x-auto scrollbar-none">
            {items.map(({ to, label, icon: Icon, exact }) => {
              const active = isActive(to, exact);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative inline-flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "text-amber-400"
                      : "text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {active && (
                    <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-amber-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}