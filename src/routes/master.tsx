import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Users2, ArrowLeft } from "lucide-react";
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
] as const;

function MasterLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Painel</p>
          <h1 className="font-display text-lg text-zinc-50">Master</h1>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(to, exact)
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <Link
          to="/"
          className="mt-auto flex items-center gap-2 rounded-md px-3 py-2 text-xs text-zinc-500 hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao painel
        </Link>
      </aside>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <h1 className="font-display text-base">Painel Master</h1>
        <Link to="/" className="text-xs text-zinc-400">
          Sair
        </Link>
      </header>
      <main className="md:ml-60 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
          <Outlet />
        </div>
      </main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800 bg-zinc-900">
        <div className="grid grid-cols-2">
          {items.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px]",
                isActive(to, exact) ? "text-zinc-50" : "text-zinc-500",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}