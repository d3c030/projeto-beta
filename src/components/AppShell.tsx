import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, CalendarDays, Receipt, LogOut, Users, Shield, CalendarCheck, Settings, Sparkles, Crown, AlertTriangle, Lock, CalendarClock, MoreHorizontal, LifeBuoy } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getContactSettings } from "@/lib/settings.functions";
import { getAccessState } from "@/lib/tenant.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import defaultLogo from "@/assets/logo.png";

function LicenseCountdown({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-card/50 px-3 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>Licença</span>
        </div>
        <p className="mt-1 text-muted-foreground/80">Aguardando 1º pagamento</p>
      </div>
    );
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = expiresAt.split("-").map(Number);
  const exp = new Date(y, m - 1, d);
  const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  const expired = days < 0;
  const warn = days <= 5;
  const tone = expired
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : warn
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-border bg-card/50 text-foreground";
  const fmt = exp.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <div className={cn("mt-4 rounded-lg border px-3 py-2.5 text-xs", tone)}>
      <div className="flex items-center gap-2 opacity-80">
        <CalendarClock className="h-3.5 w-3.5" />
        <span>Licença</span>
      </div>
      <p className="mt-1 font-medium">
        {expired
          ? `Vencida há ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"}`
          : days === 0
            ? "Vence hoje"
            : `${days} ${days === 1 ? "dia" : "dias"} restantes`}
      </p>
      <p className="opacity-70 mt-0.5">Venc.: {fmt}</p>
    </div>
  );
}

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/atendimentos", label: "Atendimentos", icon: CalendarDays },
  { to: "/agenda", label: "Agenda", icon: CalendarCheck },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/procedimentos", label: "Procedimentos", icon: Sparkles },
  { to: "/custos", label: "Custos", icon: Receipt },
  { to: "/usuarios", label: "Usuários", icon: Shield },
  { to: "/ajuda", label: "Ajuda", icon: LifeBuoy },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const mobilePrimary = navItems.slice(0, 4); // Início, Atend., Agenda, Clientes
const mobileSecondary = navItems.slice(4);  // Procedimentos, Custos, Usuários, Configurações

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
  const licenseExpiresAt = accessQ.data?.tenant?.license_expires_at ?? null;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState(session ? "in" : "out");
      setUserEmail(session?.user?.email ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthState(data.session ? "in" : "out");
      setUserEmail(data.session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Public pages render standalone (no admin shell, no auth required)
  const isPublic =
    pathname === "/login" ||
    pathname === "/agendar" ||
    pathname.startsWith("/agendar/") ||
    pathname.startsWith("/t/");
  if (isPublic) return <Outlet />;

  if (authState === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>;
  }
  if (authState === "out") {
    if (typeof window !== "undefined") navigate({ to: "/login", replace: true });
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  // Block suspended tenants entirely (superadmin bypasses)
  const todayIso = new Date().toISOString().slice(0, 10);
  const isExpired = !!licenseExpiresAt && licenseExpiresAt < todayIso;
  if (!isSuperadmin && (tenantStatus === "suspenso" || isExpired)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4 border border-border rounded-2xl p-8 bg-card">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-display text-xl">Acesso bloqueado</h1>
          <p className="text-sm text-muted-foreground">
            Contate o administrador do sistema para regularizar sua licença e voltar a usar o painel.
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
            alt="Logo"
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
          {isSuperadmin && userEmail === "d3c030@gmail.com" && (
            <Link
              to="/master"
              className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <Crown className="h-4 w-4" />
              Painel Master
            </Link>
          )}
        </nav>
        {!isSuperadmin && <LicenseCountdown expiresAt={licenseExpiresAt} />}
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
          alt="Logo"
          className="h-10 w-auto"
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
        <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {mobilePrimary.map(({ to, label, icon: Icon }) => {
            const shortLabel = label === "Atendimentos" ? "Atend." : label;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors leading-tight",
                  isActive(to) ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-full px-1">{shortLabel}</span>
              </Link>
            );
          })}
          <MoreMenu
            isActive={isActive}
            isSuperadmin={isSuperadmin}
            userEmail={userEmail}
          />
        </div>
      </nav>

    </div>
  );
}

function MoreMenu({
  isActive,
  isSuperadmin,
  userEmail,
}: {
  isActive: (to: string) => boolean;
  isSuperadmin: boolean;
  userEmail: string | null;
}) {
  const [open, setOpen] = useState(false);
  const anySecondaryActive = mobileSecondary.some((i) => isActive(i.to)) || isActive("/master");
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors leading-tight",
            anySecondaryActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="text-left">
          <SheetTitle>Mais opções</SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {mobileSecondary.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-2 py-4 text-xs font-medium transition-colors",
                isActive(to) ? "border-primary/50 bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-center leading-tight">{label}</span>
            </Link>
          ))}
          {isSuperadmin && userEmail === "d3c030@gmail.com" && (
            <Link
              to="/master"
              onClick={() => setOpen(false)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-4 text-xs font-medium transition-colors",
                isActive("/master")
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-700/90 dark:text-amber-300/90 hover:bg-amber-500/10"
              )}
            >
              <Crown className="h-5 w-5" />
              <span className="text-center leading-tight">Painel Master</span>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
