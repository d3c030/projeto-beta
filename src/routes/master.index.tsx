import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, TrendingUp, DollarSign, UserPlus, ArrowUpRight, AlertCircle } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getSaasMetrics } from "@/lib/tenant.functions";
import { formatBRL } from "@/lib/format";
import { DailyCostsAlert } from "@/components/DailyCostsAlert";

export const Route = createFileRoute("/master/")({
  component: MasterDashboard,
});

function MasterDashboard() {
  const fetch = useServerFn(getSaasMetrics);
  const q = useQuery({ queryKey: ["saas-metrics"], queryFn: () => fetch() });
  const m = q.data;

  return (
    <div className="space-y-8">
      <DailyCostsAlert scope="master" />
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80 mb-1.5">Dashboard</p>
          <h1 className="font-display text-3xl md:text-4xl text-zinc-50">Visão geral</h1>
          <p className="text-sm text-zinc-400 mt-1">Performance da plataforma e seus clientes.</p>
        </div>
        {m && (
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
            <span className="text-zinc-500">Total de clientes: </span>
            <span className="text-zinc-100 font-medium">{m.total}</span>
          </div>
        )}
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="MRR"
          value={m ? formatBRL(m.mrr) : "—"}
          accent
          hint="Receita recorrente mensal"
        />
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Clientes ativos"
          value={m?.ativos ?? "—"}
          tone="emerald"
        />
        <Kpi
          icon={<AlertCircle className="h-4 w-4" />}
          label="Inativos"
          value={m?.inativos ?? "—"}
          sub={`${m?.suspensos ?? 0} susp. · ${m?.inadimplentes ?? 0} inad.`}
          tone="amber"
        />
        <Kpi
          icon={<UserPlus className="h-4 w-4" />}
          label="Novos no mês"
          value={m?.novosNoMes ?? "—"}
          tone="sky"
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur p-5 md:p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-zinc-800/80 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-zinc-100">Crescimento</h2>
              <p className="text-xs text-zinc-500">Novos clientes nos últimos 6 meses</p>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={m?.growth ?? []} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a", borderRadius: 10, color: "#fafafa", fontSize: 12 }}
                cursor={{ stroke: "#3f3f46", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#grad)"
                dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#fbbf24", strokeWidth: 2, stroke: "#0a0a0a" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

type Tone = "emerald" | "amber" | "sky" | "default";

function Kpi({
  icon,
  label,
  value,
  sub,
  hint,
  accent,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  hint?: string;
  accent?: boolean;
  tone?: Tone;
}) {
  const toneIcon = {
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    sky: "text-sky-400 bg-sky-500/10",
    default: "text-zinc-300 bg-zinc-800/80",
  }[tone];

  return (
    <div
      className={
        "relative rounded-2xl border p-4 md:p-5 overflow-hidden transition-colors " +
        (accent
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-zinc-900/60 to-zinc-900/40"
          : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700")
      }
    >
      {accent && (
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-amber-500/20 blur-3xl" />
      )}
      <div className="relative flex items-start justify-between gap-2">
        <div className={"h-8 w-8 rounded-lg flex items-center justify-center " + toneIcon}>
          {icon}
        </div>
        {accent && <ArrowUpRight className="h-3.5 w-3.5 text-amber-400/70" />}
      </div>
      <div className="relative mt-3">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="mt-1.5 text-2xl md:text-3xl font-display text-zinc-50 leading-none">{value}</p>
        {sub && <p className="text-[11px] text-zinc-500 mt-2">{sub}</p>}
        {hint && !sub && <p className="text-[11px] text-zinc-500 mt-2">{hint}</p>}
      </div>
    </div>
  );
}