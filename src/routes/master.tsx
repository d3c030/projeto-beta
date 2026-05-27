import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
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
  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08),_transparent_55%),_linear-gradient(180deg,_#09090b_0%,_#050507_100%)] text-zinc-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/70 backdrop-blur px-5 py-6">
        <div className="mb-10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="h-4.5 w-4.5 text-zinc-950" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Painel</p>
            <h1 className="font-display text-base text-zinc-50 leading-tight">Master</h1>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {items.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-zinc-100 text-zinc-950 shadow-sm font-medium"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
                )}
              >
                <Icon className={cn("h-4 w-4 transition-colors", active ? "text-zinc-950" : "text-zinc-500 group-hover:text-zinc-200")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-6 border-t border-zinc-800/60">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao painel
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Crown className="h-4 w-4 text-zinc-950" />
          </div>
          <h1 className="font-display text-base">Painel Master</h1>
        </div>
        <Link to="/" className="text-xs text-zinc-400 hover:text-zinc-100">Sair</Link>
      </header>

      {/* Main */}
      <main className="md:ml-64 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
        <div className="grid grid-cols-3">
          {items.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 text-[11px] transition-colors",
                  active ? "text-amber-400" : "text-zinc-500",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}