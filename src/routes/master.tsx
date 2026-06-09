import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Users2, Activity, Crown, ShieldCheck, Gift, CreditCard, ExternalLink, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAccessState } from "@/lib/tenant.functions";
import { useAuthReady } from "@/hooks/use-auth-ready";

export const Route = createFileRoute("/master")({
  head: () => ({ meta: [{ title: "Painel Master — Super Admin" }] }),
  component: MasterLayout,
});

const items = [
  { to: "/master", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/master/clientes", label: "Clientes", icon: Users2, exact: false },
  { to: "/master/cobranca", label: "Cobrança", icon: CreditCard, exact: false },
  { to: "/master/indicacoes", label: "Indicações", icon: Gift, exact: false },
  { to: "/master/acessos", label: "Acessos", icon: Activity, exact: false },
  { to: "/master/seguranca", label: "Segurança", icon: ShieldCheck, exact: false },
] as const;

function MasterLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isAuthed, ready } = useAuthReady();
  const accessQ = useQuery({
    queryKey: ["access-state"],
    queryFn: () => getAccessState(),
    enabled: isAuthed,
    retry: false,
    staleTime: 30_000,
  });

  // Redirect só depois que a sessão estiver pronta E a query resolveu.
  // Evita o loop "/" ↔ "/master" quando o token ainda não foi anexado.
  if (ready && !isAuthed) {
    if (typeof window !== "undefined") navigate({ to: "/login", replace: true });
    return null;
  }
  if (accessQ.isSuccess && !accessQ.data?.isSuperadmin) {
    if (typeof window !== "undefined") navigate({ to: "/", replace: true });
    return null;
  }
  if (!accessQ.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm bg-slate-950">
        Carregando cockpit…
      </div>
    );
  }
  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);
  return (
    <div className="-mx-4 md:-mx-8 -my-6 min-h-[calc(100vh-3.5rem)] md:min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_55%),_linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] text-slate-100">
      {/* Top header */}
      <header className="sticky top-0 md:top-0 z-20 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Crown className="h-4 w-4 md:h-4.5 md:w-4.5 text-slate-50" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400/80 leading-none">Admin</p>
              <h1 className="font-display text-base md:text-lg text-slate-50 leading-tight truncate">Cockpit Master</h1>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800/80 hover:text-slate-100 px-2.5 py-1.5 text-xs text-slate-300 transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Painel do cliente</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-2 md:px-6">
          <nav className="flex gap-1 overflow-x-auto scrollbar-none">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative inline-flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "text-blue-400"
                      : "text-slate-400 hover:text-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {active && (
                    <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-blue-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}