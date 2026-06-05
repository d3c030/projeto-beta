import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  fetchExpenses, createExpense, updateExpense, deleteExpense, type Expense,
} from "@/lib/data";
import { formatBRL, formatDateBR } from "@/lib/format";
import { MonthPicker } from "@/components/MonthPicker";
import { ExpenseDialog } from "@/components/ExpenseDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DailyCostsManager } from "@/components/DailyCostsManager";
import { DailyCostsAlert } from "@/components/DailyCostsAlert";
import { CostsCharts } from "@/components/CostsCharts";

export const Route = createFileRoute("/custos")({
  head: () => ({ meta: [{ title: "Custos — Studio Taiane Oliveira" }] }),
  component: CustosPage,
});

function CustosPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const qc = useQueryClient();
  const expQ = useQuery({
    queryKey: ["expenses", year, monthIdx],
    queryFn: () => fetchExpenses(year, monthIdx),
  });

  const total = useMemo(
    () => (expQ.data ?? []).reduce((s, e) => s + Number(e.total || 0), 0),
    [expQ.data]
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["expenses"] });

  return (
    <div className="space-y-6">
      <DailyCostsAlert scope="tenant" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Custos</h2>
          <p className="text-sm text-muted-foreground">
            {expQ.data?.length ?? 0} despesa{(expQ.data?.length ?? 0) === 1 ? "" : "s"} · {formatBRL(total)}
          </p>
        </div>
        <MonthPicker
          year={year}
          monthIdx={monthIdx}
          onChange={(y, m) => { setYear(y); setMonthIdx(m); }}
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="hidden sm:inline-flex"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo custo
        </Button>
      </div>

      {expQ.isLoading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">A carregar...</p>
      ) : (expQ.data?.length ?? 0) === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Sem custos registados neste mês.
        </Card>
      ) : (
        <Card className="divide-y divide-border/70 overflow-hidden">
          {(expQ.data ?? []).map((e) => (
            <button
              key={e.id}
              onClick={() => { setEditing(e); setDialogOpen(true); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{e.description}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateBR(e.date)} · {Number(e.quantity)} × {formatBRL(Number(e.unit_price))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-sm font-semibold tabular-nums text-destructive">
                  −{formatBRL(Number(e.total))}
                </span>
                {e.payment_method && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {e.payment_method}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </Card>
      )}

      <Button
        onClick={() => { setEditing(null); setDialogOpen(true); }}
        className="sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg p-0"
        aria-label="Novo custo"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <section className="pt-4">
        <div className="mb-3">
          <h3 className="font-display text-2xl">Contas a pagar / vencimentos</h3>
          <p className="text-sm text-muted-foreground">
            Cadastre contas fixas (água, luz, internet) e compras com data de vencimento.
            Itens vencendo hoje aparecem como alerta na tela inicial.
          </p>
        </div>
        <DailyCostsManager scope="tenant" />
      </section>

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={async (data) => {
          try {
            if (editing) {
              await updateExpense(editing.id, data);
              toast.success("Custo atualizado");
            } else {
              await createExpense(data);
              toast.success("Custo adicionado");
            }
            invalidate();
          } catch (e) {
            toast.error("Erro ao guardar");
            throw e;
          }
        }}
        onDelete={
          editing
            ? async () => {
                try {
                  await deleteExpense(editing.id);
                  toast.success("Custo apagado");
                  invalidate();
                } catch {
                  toast.error("Erro ao apagar");
                }
              }
            : undefined
        }
      />
    </div>
  );
}
