import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Clock, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  fetchProcedures,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  type Procedure,
} from "@/lib/procedures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/procedimentos")({
  head: () => ({ meta: [{ title: "Procedimentos — Studio Taiane Oliveira" }] }),
  component: ProcedimentosPage,
});

function ProcedimentosPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["procedures"], queryFn: fetchProcedures });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["procedures"] });
  };

  const del = useMutation({
    mutationFn: (id: string) => deleteProcedure(id),
    onSuccess: () => {
      toast.success("Procedimento removido");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Procedimentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre os serviços do estúdio com preço sugerido e tempo estimado.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Novo
        </Button>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum procedimento cadastrado.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {(q.data ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {formatBRL(p.default_price)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {p.estimated_minutes} min
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(p);
                    setOpen(true);
                  }}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Remover "${p.name}"?`)) del.mutate(p.id);
                  }}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProcedureDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSaved={invalidate}
      />
    </div>
  );
}

function ProcedureDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Procedure | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setPrice(initial ? String(initial.default_price) : "");
      setMinutes(initial ? String(initial.estimated_minutes) : "30");
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        default_price: parseFloat(price.replace(",", ".")) || 0,
        estimated_minutes: parseInt(minutes, 10) || 0,
      };
      if (initial) await updateProcedure(initial.id, payload);
      else await createProcedure(payload);
      toast.success(initial ? "Procedimento atualizado" : "Procedimento criado");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Editar procedimento" : "Novo procedimento"}
          </DialogTitle>
          <DialogDescription>
            Os valores e tempos podem ser ajustados a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="pname">Nome</Label>
            <Input
              id="pname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Ex: Design de Sobrancelha"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pprice">Preço padrão (R$)</Label>
              <Input
                id="pprice"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pmin">Tempo estimado (min)</Label>
              <Input
                id="pmin"
                type="number"
                inputMode="numeric"
                step="5"
                min="0"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
