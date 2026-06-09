import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, DollarSign, AlertTriangle, Activity, TrendingUp, TrendingDown,
  CalendarClock, Zap, CheckCircle2, PauseCircle, Ban, ArrowUpRight, MessageCircle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import {
  getMasterOverview,
  updateTenantStatus,
  type TenantOverviewRow,
  type TenantStatus,
} from "@/lib/tenant.functions";
import { formatBRL } from "@/lib/format";
import { DailyCostsAlert } from "@/components/DailyCostsAlert";
import { toast } from "sonner";

export const Route = createFileRoute("/master/")({
  component: MasterDashboard,
});

function MasterDashboard() {
  const qc = useQueryClient();
  const fetch = useServerFn(getMasterOverview);
  const setStatus = useServerFn(updateTenantStatus);
  const q = useQuery({ queryKey: ["master-overview"], queryFn: () => fetch() });
  const m = q.data;

  const mutStatus = useMutation({
    mutationFn: (vars: { id: string; status: TenantStatus }) =>
      setStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["master-overview"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const receitaDelta = m
    ? m.kpi.receitaMesAnterior > 0
      ? ((m.kpi.receitaMes - m.kpi.receitaMesAnterior) / m.kpi.receitaMesAnterior) * 100
      : m.kpi.receitaMes > 0
        ? 100
        : 0
    : 0;

  return (
    <div className="space-y-6">
      <DailyCostsAlert scope="master" />

      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-blue-400/80 mb-1.5">Cockpit</p>
          <h1 className="font-display text-3xl md:text-4xl text-slate-50">Visão 360</h1>
          <p className="text-sm text-slate-400 mt-1">
            Tudo da operação numa tela: clientes, uso, receita e alertas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-slate-900/60 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ao vivo
          </span>
        </div>
      </header>

      {/* KPI strip — 5 colunas no desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="MRR"
          value={m ? formatBRL(m.kpi.mrr) : "—"}
          accent
          sub={`${m?.kpi.ativos ?? 0} clientes ativos`}
        />
        <Kpi
          icon={<Activity className="h-4 w-4" />}
          label="Receita no mês"
          value={m ? formatBRL(m.kpi.receitaMes) : "—"}
          sub={
            <span className={receitaDelta >= 0 ? "text-emerald-400" : "text-red-400"}>
              {receitaDelta >= 0 ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
              {Math.abs(receitaDelta).toFixed(0)}% vs anterior
            </span>
          }
        />
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Total clientes"
          value={m?.kpi.total ?? "—"}
          sub={`+${m?.kpi.novosNoMes ?? 0} novos este mês`}
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Inativos >3d"
          value={m?.kpi.inativos3d ?? "—"}
          tone="amber"
          sub="sem atendimento"
        />
        <Kpi
          icon={<CalendarClock className="h-4 w-4" />}
          label="Vencendo 7d"
          value={m?.kpi.vencendoEm7d ?? "—"}
          tone="rose"
          sub={`${m?.kpi.inadimplentes ?? 0} inad. · ${m?.kpi.suspensos ?? 0} susp.`}
        />
      </div>

      {/* Alertas */}
      {m && m.alerts.length > 0 && (
        <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/40 to-slate-900/40 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-medium text-slate-100">
              Atenção — {m.alerts.length} cliente{m.alerts.length > 1 ? "s" : ""} precisam de ação
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {m.alerts.slice(0, 6).map((a) => (
              <AlertCard key={a.id} t={a} />
            ))}
          </div>
        </section>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Frequência de uso por cliente"
          subtitle="Atendimentos criados — últimos 30 dias / 7 dias"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={m?.usageChart ?? []} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, color: "#f8fafc", fontSize: 12 }}
                cursor={{ fill: "#1e293b55" }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Bar dataKey="total" name="30 dias" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="semana" name="7 dias" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Receita vs previsão"
          subtitle="Recebido nos últimos 6 meses contra MRR"
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={m?.revenueChart ?? []} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, color: "#f8fafc", fontSize: 12 }}
                formatter={(v: number) => formatBRL(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Line type="monotone" dataKey="recebido" name="Recebido" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} />
              <Line type="monotone" dataKey="previsto" name="Previsto (MRR)" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tabela completa de clientes com ações inline */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-medium text-slate-100">Todos os clientes</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ações rápidas sem sair da tela — suspender, ativar, contatar.
            </p>
          </div>
          <Link
            to="/master/clientes"
            className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
          >
            Gerenciar completo <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-900/60">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Cliente</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-right px-3 py-2.5 font-medium">MRR</th>
                <th className="text-center px-3 py-2.5 font-medium">Uso 30d</th>
                <th className="text-left px-3 py-2.5 font-medium">Última atividade</th>
                <th className="text-left px-3 py-2.5 font-medium">Vencimento</th>
                <th className="text-right px-4 py-2.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(m?.tenants ?? []).map((t) => (
                <TenantRow
                  key={t.id}
                  t={t}
                  onStatus={(status) => mutStatus.mutate({ id: t.id, status })}
                  busy={mutStatus.isPending}
                />
              ))}
              {m && m.tenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Nenhum cliente cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon, label, value, sub, accent, tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  tone?: "default" | "amber" | "rose" | "emerald";
}) {
  const toneIcon = {
    amber: "text-amber-400 bg-amber-500/10",
    rose: "text-rose-400 bg-rose-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    default: "text-blue-400 bg-blue-500/10",
  }[tone];
  return (
    <div
      className={
        "relative rounded-xl border p-4 overflow-hidden transition-colors " +
        (accent
          ? "border-blue-500/40 bg-gradient-to-br from-blue-500/15 via-slate-900/60 to-slate-900/40"
          : "border-slate-800 bg-slate-900/50 hover:border-slate-700")
      }
    >
      {accent && (
        <div className="absolute -top-12 -right-12 h-28 w-28 rounded-full bg-blue-500/30 blur-3xl" />
      )}
      <div className="relative flex items-start justify-between gap-2">
        <div className={"h-8 w-8 rounded-lg flex items-center justify-center " + toneIcon}>
          {icon}
        </div>
      </div>
      <div className="relative mt-2.5">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-display text-slate-50 leading-none">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({
  title, subtitle, children,
}: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:p-5">
      <div className="mb-3">
        <h2 className="text-sm font-medium text-slate-100">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function AlertCard({ t }: { t: TenantOverviewRow }) {
  const reasons: string[] = [];
  if (t.status !== "suspenso" && t.inactive_alert) {
    reasons.push(
      t.days_since_last_activity == null
        ? "nunca usou"
        : `${t.days_since_last_activity}d inativo`,
    );
  }
  if (t.license_expires_at) {
    const today = new Date().toISOString().slice(0, 10);
    if (t.license_expires_at < today) reasons.push("licença vencida");
    else {
      const days = Math.ceil(
        (new Date(t.license_expires_at).getTime() - Date.now()) / 86400000,
      );
      if (days <= 7) reasons.push(`vence em ${days}d`);
    }
  }
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-slate-100 font-medium truncate">{t.business_name}</p>
        <p className="text-[11px] text-amber-300/90">{reasons.join(" · ")}</p>
      </div>
      <Link
        to="/master/clientes"
        className="text-[11px] text-blue-400 hover:text-blue-300 shrink-0"
      >
        abrir
      </Link>
    </div>
  );
}

function TenantRow({
  t, onStatus, busy,
}: {
  t: TenantOverviewRow;
  onStatus: (s: TenantStatus) => void;
  busy: boolean;
}) {
  const statusStyle: Record<TenantStatus, string> = {
    ativo: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
    inadimplente: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    suspenso: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  };
  const useColor =
    t.appointments_30d === 0
      ? "text-rose-400"
      : t.appointments_30d < 5
        ? "text-amber-300"
        : "text-emerald-300";
  const lastActivity = t.last_appointment_at ?? t.owner_last_sign_in_at;
  const lastActivityLabel = lastActivity
    ? new Date(lastActivity).toLocaleDateString("pt-BR")
    : "—";
  const vencLabel = t.license_expires_at
    ? new Date(t.license_expires_at).toLocaleDateString("pt-BR")
    : "—";
  const today = new Date().toISOString().slice(0, 10);
  const vencTone =
    t.license_expires_at && t.license_expires_at < today
      ? "text-rose-400"
      : t.license_expires_at && t.license_expires_at <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
        ? "text-amber-300"
        : "text-slate-300";
  return (
    <tr className="hover:bg-slate-900/60 transition-colors">
      <td className="px-4 py-3">
        <div className="text-slate-100 font-medium">{t.business_name}</div>
        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
          {t.owner_email ?? `/${t.slug}`}
        </div>
      </td>
      <td className="px-3 py-3">
        <span className={"inline-flex text-[11px] font-medium px-2 py-0.5 rounded-md " + statusStyle[t.status]}>
          {t.status}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-slate-200 tabular-nums">{formatBRL(t.monthly_price)}</td>
      <td className="px-3 py-3 text-center">
        <div className={"font-medium tabular-nums " + useColor}>{t.appointments_30d}</div>
        <div className="text-[10px] text-slate-500">{t.appointments_7d} esta semana</div>
      </td>
      <td className="px-3 py-3 text-slate-300 text-xs">
        {lastActivityLabel}
        {t.days_since_last_activity != null && t.days_since_last_activity > 3 && (
          <div className="text-[10px] text-amber-300">{t.days_since_last_activity}d atrás</div>
        )}
      </td>
      <td className={"px-3 py-3 text-xs tabular-nums " + vencTone}>{vencLabel}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {t.status !== "ativo" && (
            <button
              disabled={busy}
              onClick={() => onStatus("ativo")}
              title="Ativar"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
          {t.status !== "inadimplente" && (
            <button
              disabled={busy}
              onClick={() => onStatus("inadimplente")}
              title="Marcar inadimplente"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-400 hover:bg-amber-500/10 disabled:opacity-40"
            >
              <PauseCircle className="h-3.5 w-3.5" />
            </button>
          )}
          {t.status !== "suspenso" && (
            <button
              disabled={busy}
              onClick={() => onStatus("suspenso")}
              title="Suspender"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-400 hover:bg-rose-500/10 disabled:opacity-40"
            >
              <Ban className="h-3.5 w-3.5" />
            </button>
          )}
          <Link
            to="/master/cobranca"
            title="Cobrança"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-blue-400 hover:bg-blue-500/10"
          >
            <DollarSign className="h-3.5 w-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}