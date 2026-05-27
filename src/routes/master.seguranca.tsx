import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Lock, RefreshCw, Database } from "lucide-react";
import { getSecurityAudit, type SecurityCheck } from "@/lib/tenant.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/master/seguranca")({
  component: SecurityPage,
});

function SecurityPage() {
  const fetch = useServerFn(getSecurityAudit);
  const q = useQuery({ queryKey: ["security-audit"], queryFn: () => fetch() });
  const d = q.data;

  const scoreColor =
    !d ? "text-zinc-400"
      : d.score >= 95 ? "text-emerald-400"
      : d.score >= 70 ? "text-amber-400"
      : "text-rose-400";

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80 mb-1.5">Auditoria</p>
          <h1 className="font-display text-3xl md:text-4xl text-zinc-50">Segurança & Confiabilidade</h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Verificação contínua do isolamento entre clientes. Cada estabelecimento só
            enxerga os próprios dados — garantido por políticas no banco, não apenas no app.
          </p>
        </div>
        <button
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 px-3 py-2 text-xs text-zinc-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", q.isFetching && "animate-spin")} />
          Re-auditar
        </button>
      </header>

      {/* Score */}
      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/80 via-zinc-900/40 to-zinc-900/20 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-16 w-16 md:h-20 md:w-20 rounded-2xl flex items-center justify-center shrink-0",
              d?.score === 100 ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400",
            )}>
              {d?.score === 100 ? <ShieldCheck className="h-9 w-9 md:h-10 md:w-10" /> : <ShieldAlert className="h-9 w-9 md:h-10 md:w-10" />}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">Índice de confiabilidade</p>
              <p className={cn("font-display text-5xl md:text-6xl leading-none mt-1", scoreColor)}>
                {d ? `${d.score}` : "—"}
                <span className="text-2xl text-zinc-500 ml-1">/100</span>
              </p>
            </div>
          </div>
          <div className="flex-1 text-sm text-zinc-400 md:border-l md:border-zinc-800 md:pl-6">
            {d?.score === 100 ? (
              <p>
                <span className="text-emerald-400 font-medium">Todos os controles passaram.</span> O isolamento
                entre clientes está garantido no nível do banco de dados — qualquer consulta
                feita por um usuário só retorna registros do tenant dele, mesmo que tente burlar.
              </p>
            ) : (
              <p>
                Alguns controles precisam de atenção. Revise os itens abaixo. Mesmo controles em
                aviso normalmente não vazam dados — mas reduzem a confiabilidade do sistema.
              </p>
            )}
            {d && (
              <p className="text-xs text-zinc-500 mt-2">
                Última verificação: {new Date(d.generatedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Checks */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" /> Controles de isolamento
        </h2>
        <div className="grid gap-2">
          {(d?.checks ?? Array.from({ length: 5 }).map(() => null)).map((c, i) => (
            <CheckRow key={i} check={c} />
          ))}
        </div>
      </section>

      {/* Tables */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2">
          <Database className="h-3.5 w-3.5" /> Tabelas auditadas
        </h2>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Tabela</th>
                <th className="text-left px-4 py-2.5 font-medium">RLS</th>
                <th className="text-left px-4 py-2.5 font-medium">Políticas</th>
                <th className="text-right px-4 py-2.5 font-medium">Registros</th>
                <th className="text-right px-4 py-2.5 font-medium">Órfãos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {(d?.tables ?? []).map((t) => (
                <tr key={t.table} className="text-zinc-300">
                  <td className="px-4 py-2.5 font-mono text-xs">{t.table}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> ativo
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{t.policies}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-400">{t.rows}</td>
                  <td className={cn(
                    "px-4 py-2.5 text-right tabular-nums",
                    t.orphans === 0 ? "text-zinc-500" : "text-rose-400 font-medium",
                  )}>
                    {t.orphans}
                  </td>
                </tr>
              ))}
              {!d && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-zinc-500">Carregando…</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          <strong className="text-zinc-400">Órfãos</strong> são registros sem dono identificado.
          Se aparecer qualquer valor diferente de zero, esses dados precisam de revisão imediata.
        </p>
      </section>

      {/* Architecture note */}
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5">
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Como o isolamento funciona</h3>
        <ul className="space-y-2 text-xs text-zinc-400">
          <li className="flex gap-2"><span className="text-emerald-400">•</span> Toda tabela tem uma coluna <code className="text-zinc-300">tenant_id</code> preenchida automaticamente no momento da inserção, baseada no usuário logado.</li>
          <li className="flex gap-2"><span className="text-emerald-400">•</span> Cada política do banco compara <code className="text-zinc-300">tenant_id</code> com o do usuário — se não bater, a linha simplesmente não existe para aquela consulta.</li>
          <li className="flex gap-2"><span className="text-emerald-400">•</span> O cache do navegador é limpo a cada login/logout, evitando que dados de um cliente fiquem visíveis para outro.</li>
          <li className="flex gap-2"><span className="text-emerald-400">•</span> As funções de verificação rodam com <code className="text-zinc-300">SECURITY DEFINER</code>, evitando recursão e brechas em políticas.</li>
        </ul>
      </section>
    </div>
  );
}

function CheckRow({ check }: { check: SecurityCheck | null }) {
  if (!check) {
    return <div className="h-14 rounded-xl border border-zinc-800/80 bg-zinc-900/30 animate-pulse" />;
  }
  const Icon = check.status === "ok" ? CheckCircle2 : check.status === "warn" ? AlertTriangle : XCircle;
  const tone =
    check.status === "ok" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : check.status === "warn" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-rose-400 bg-rose-500/10 border-rose-500/20";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
      <div className={cn("h-8 w-8 rounded-lg border flex items-center justify-center shrink-0", tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-100 font-medium">{check.label}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{check.detail}</p>
      </div>
    </div>
  );
}
