import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, CalendarDays, Receipt, LogOut, Users, Shield, CalendarCheck, Settings, Sparkles, Crown, AlertTriangle, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getContactSettings } from "@/lib/settings.functions";
import { getAccessState } from "@/lib/tenant.functions";
import defaultLogo from "@/assets/logo.png";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/atendimentos", label: "Atendimentos", icon: CalendarDays },
  { to: "/agenda", label: "Agenda", icon: CalendarCheck },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/procedimentos", label: "Procedimentos", icon: Sparkles },
  { to: "/custos", label: "Custos", icon: Receipt },
  { to: "/usuarios", label: "Usuários", icon: Shield },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");

  const settingsQ = useQuery({
    queryKey: ["public-contact-settings"],
    queryFn: () => getContactSettings(),
    enabled: authState === "in",
  });
  const accessQ = useQuery({
    queryKey: ["access-state"],
    queryFn: () => getAccessState(),
    enabled: authState === "in",
  });
  const tenantLogo = accessQ.data?.tenant?.logo_url;
  const logo = tenantLogo || settingsQ.data?.logo_url || defaultLogo;
  const isSuperadmin = !!accessQ.data?.isSuperadmin;
  const tenantStatus = accessQ.data?.tenant?.status ?? "ativo";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState(session ? "in" : "out");
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthState(data.session ? "in" : "out");
    });
    return () => subscription.unsubscribe();
  }, []);

  // Public pages render standalone (no admin shell, no auth required)
  const isPublic = pathname === "/login" || pathname === "/agendar" || pathname.startsWith("/agendar/");
  if (isPublic) return <Outlet />;

  if (authState === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>;
  }
  if (authState === "out") {
    if (typeof window !== "undefined") navigate({ to: "/agendar", replace: true });
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  // Block suspended tenants entirely (superadmin bypasses)
  if (!isSuperadmin && tenantStatus === "suspenso") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4 border border-border rounded-2xl p-8 bg-card">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-display text-xl">Acesso suspenso</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta está temporariamente suspensa. Entre em contato com o suporte para regularizar e voltar a usar o painel.
          </p>
          <button
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-sidebar p-6">
        <div className="mb-10 flex justify-center">
          <img
            src={logo}
            alt="Studio Taiane Oliveira — Sobrancelhas e Piercing"
            className="w-44 h-auto"
          />
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(to)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {isSuperadmin && (
            <Link
              to="/master"
              className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <Crown className="h-4 w-4" />
              Painel Master
            </Link>
          )}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="w-9" />
        <img
          src={logo}
          alt="Studio Taiane Oliveira — Sobrancelhas e Piercing"
          className="h-14 w-auto"
        />
        <button
          onClick={handleLogout}
          aria-label="Sair"
          className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Main */}
      <main className="md:ml-64 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          {!isSuperadmin && tenantStatus === "inadimplente" && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Pagamento em atraso</p>
                <p className="text-xs opacity-90">Sua mensalidade está pendente. Regularize para evitar a suspensão do acesso.</p>
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-8">
          {navItems.map(({ to, label, icon: Icon }) => {
            const shortLabel =
              label === "Atendimentos" ? "Atend." :
              label === "Procedimentos" ? "Proc." :
              label === "Usuários" ? "Usuár." :
              label === "Configurações" ? "Config." :
              label;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors leading-tight",
                  isActive(to) ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-full px-0.5">{shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
