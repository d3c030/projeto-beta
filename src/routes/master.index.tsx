import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, TrendingUp, DollarSign, UserPlus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getSaasMetrics } from "@/lib/tenant.functions";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/master/")({
  component: MasterDashboard,
});

function MasterDashboard() {
  const fetch = useServerFn(getSaasMetrics);
  const q = useQuery({ queryKey: ["saas-metrics"], queryFn: () => fetch() });
  const m = q.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl text-zinc-50">Visão geral SaaS</h1>
        <p className="text-sm text-zinc-400">Performance da plataforma e seus clientes.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={<Users className="h-4 w-4" />} label="Clientes ativos" value={m?.ativos ?? "—"} />
        <Card icon={<Users className="h-4 w-4" />} label="Inativos" value={m?.inativos ?? "—"} sub={`${m?.suspensos ?? 0} susp. / ${m?.inadimplentes ?? 0} inad.`} />
        <Card icon={<DollarSign className="h-4 w-4" />} label="MRR" value={m ? formatBRL(m.mrr) : "—"} accent />
        <Card icon={<UserPlus className="h-4 w-4" />} label="Novos no mês" value={m?.novosNoMes ?? "—"} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-200">Crescimento — últimos 6 meses</h2>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m?.growth ?? []}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fafafa" }} />
              <Bar dataKey="count" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={"rounded-xl border p-4 " + (accent ? "border-emerald-700/40 bg-emerald-950/30" : "border-zinc-800 bg-zinc-900")}>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-50">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}