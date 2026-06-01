import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import {
  listDailyCosts,
  createDailyCost,
  updateDailyCost,
  deleteDailyCost,
  type DailyCost,
} from "@/lib/billing.functions";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function DailyCostsManager({ scope }: { scope: "master" | "tenant" }) {
  const qc = useQueryClient();
  const fetchList = useServerFn(listDailyCosts);
  const createFn = useServerFn(createDailyCost);
  const updateFn = useServerFn(updateDailyCost);
  const deleteFn = useServerFn(deleteDailyCost);

  const q = useQuery({
    queryKey: ["daily-costs", scope, "all"],
    queryFn: () => fetchList({ data: { scope } }),
  });

  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    data_vencimento: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["daily-costs"] });

  const addM = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          scope,
          descricao: form.descricao.trim(),
          valor: Number(form.valor) || 0,
          data_vencimento: form.data_vencimento,
          notes: form.notes.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Conta adicionada");
      setForm({
        descricao: "",
        valor: "",
        data_vencimento: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleM = useMutation({
    mutationFn: (r: DailyCost) =>
      updateFn({ data: { id: r.id, status: r.status === "pago" ? "pendente" : "pago" } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];
  const pendentes = rows.filter((r) => r.status === "pendente");
  const pagas = rows.filter((r) => r.status === "pago");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium mb-3">Nova conta a pagar</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Descrição</Label>
            <Input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Aluguel, Internet…"
            />
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <Input
              type="number"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label className="text-xs">Vencimento</Label>
            <Input
              type="date"
              value={form.data_vencimento}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => addM.mutate()}
              disabled={!form.descricao.trim() || addM.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          Pendentes ({pendentes.length})
        </div>
        {pendentes.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma conta pendente.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pendentes.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    Vence em {formatDateBR(r.data_vencimento)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatBRL(Number(r.valor))}
                </span>
                <button
                  onClick={() => toggleM.mutate(r)}
                  className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-500/10"
                  title="Marcar como paga"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Remover esta conta?")) delM.mutate(r.id);
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pagas.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
            Pagas ({pagas.length})
          </div>
          <ul className="divide-y divide-border">
            {pagas.slice(0, 20).map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 opacity-70">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{r.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencia {formatDateBR(r.data_vencimento)}
                  </p>
                </div>
                <span className="text-sm tabular-nums">{formatBRL(Number(r.valor))}</span>
                <button
                  onClick={() => toggleM.mutate(r)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  title="Reabrir"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Remover esta conta?")) delM.mutate(r.id);
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}