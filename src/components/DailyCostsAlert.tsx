import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { listDailyCosts, updateDailyCost } from "@/lib/billing.functions";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { useAuthReady } from "@/hooks/use-auth-ready";

export function DailyCostsAlert({ scope }: { scope: "master" | "tenant" }) {
  const qc = useQueryClient();
  const fetchList = useServerFn(listDailyCosts);
  const updateFn = useServerFn(updateDailyCost);
  const { isAuthed } = useAuthReady();
  const q = useQuery({
    queryKey: ["daily-costs", scope, "today"],
    queryFn: () => fetchList({ data: { scope, only_today: true } }),
    enabled: isAuthed,
    retry: false,
  });
  const m = useMutation({
    mutationFn: (id: string) => updateFn({ data: { id, status: "pago" } }),
    onSuccess: () => {
      toast.success("Conta marcada como paga");
      qc.invalidateQueries({ queryKey: ["daily-costs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = q.data ?? [];
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
  return (
    <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Contas vencendo hoje · {formatBRL(total)}
          </p>
          <ul className="mt-2 space-y-1.5">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.descricao}</p>
                  {r.notes && (
                    <p className="text-xs text-muted-foreground truncate">{r.notes}</p>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatBRL(Number(r.valor))}
                </span>
                <button
                  onClick={() => m.mutate(r.id)}
                  disabled={m.isPending}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                  title="Marcar como paga"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Paga
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}