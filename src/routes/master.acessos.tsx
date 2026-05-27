import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { listAccessReport } from "@/lib/tenant.functions";

export const Route = createFileRoute("/master/acessos")({
  component: AcessosPage,
});

function formatDateTime(iso: string | null) {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeFrom(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months > 1 ? "es" : ""}`;
  return `há ${Math.floor(months / 12)}a`;
}

function AcessosPage() {
  const fetchReport = useServerFn(listAccessReport);
  const q = useQuery({ queryKey: ["access-report"], queryFn: () => fetchReport() });
  const [search, setSearch] = useState("");

  const rows = q.data ?? [];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(s) ||
        r.display_name.toLowerCase().includes(s) ||
        (r.tenant_name ?? "").toLowerCase().includes(s) ||
        (r.tenant_slug ?? "").toLowerCase().includes(s),
    );
  }, [rows, search]);

  const totalUsers = rows.length;
  const ativos30d = rows.filter((r) => {
    if (!r.last_sign_in_at) return false;
    return Date.now() - new Date(r.last_sign_in_at).getTime() < 30 * 86400000;
  }).length;
  const nuncaAcessaram = rows.filter((r) => !r.last_sign_in_at).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80 mb-1.5">Auditoria</p>
          <h1 className="font-display text-3xl md:text-4xl text-zinc-50">Relatório de acessos</h1>
          <p className="text-sm text-zinc-400 mt-1">Quem acessou a plataforma, quando e por qual cliente.</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-center">
          <Activity className="h-5 w-5 text-amber-400" />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Stat label="Usuários" value={totalUsers} tone="default" />
        <Stat label="Ativos (30 dias)" value={ativos30d} tone="emerald" />
        <Stat label="Nunca acessaram" value={nuncaAcessaram} tone="amber" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email, nome ou cliente"
          className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur pl-10 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/40 transition-all"
        />
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur overflow-hidden">
        {q.isLoading ? (
          <div className="p-6 text-sm text-zinc-400">Carregando…</div>
        ) : q.isError ? (
          <div className="p-6 text-sm text-red-400">
            Erro ao carregar relatório: {(q.error as Error).message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-zinc-400">Nenhum acesso encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/60 text-zinc-500 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3.5 font-medium">Usuário</th>
                  <th className="text-left px-4 py-3.5 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3.5 font-medium">Papéis</th>
                  <th className="text-left px-4 py-3.5 font-medium">Último acesso</th>
                  <th className="text-left px-4 py-3.5 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((r) => (
                  <tr key={r.user_id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="text-zinc-100">{r.display_name || "—"}</div>
                      <div className="text-xs text-zinc-500">{r.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {r.tenant_name ? (
                        <>
                          <div className="text-zinc-200">{r.tenant_name}</div>
                          <div className="text-xs text-zinc-500">/{r.tenant_slug}</div>
                        </>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.roles.length === 0 ? (
                          <span className="text-xs text-zinc-600">sem papel</span>
                        ) : (
                          r.roles.map((role) => (
                            <span
                              key={role}
                              className={
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] " +
                                (role === "superadmin"
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  : "bg-zinc-800 text-zinc-300 border border-zinc-700")
                              }
                            >
                              {role}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-zinc-200">{formatDateTime(r.last_sign_in_at)}</div>
                      <div className="text-xs text-zinc-500">{relativeFrom(r.last_sign_in_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatDateTime(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-display text-zinc-50">{value}</p>
    </div>
  );
}