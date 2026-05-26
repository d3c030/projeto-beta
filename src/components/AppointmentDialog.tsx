import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/format";
import { fetchClients, type Appointment, type AppointmentInput } from "@/lib/data";
import { ClientCombobox } from "@/components/ClientCombobox";
import { fetchProcedures, joinProcedureNames, splitProcedureNames } from "@/lib/procedures";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Appointment | null;
  procedureSuggestions?: string[];
  onSubmit: (data: AppointmentInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

export function AppointmentDialog({
  open, onOpenChange, initial, onSubmit, onDelete,
}: Props) {
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedProcs, setSelectedProcs] = useState<string[]>([]);
  const [payment, setPayment] = useState<string>("Pix");
  const [amount, setAmount] = useState<string>("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const procsQ = useQuery({ queryKey: ["procedures"], queryFn: fetchProcedures });

  const priceByName = useMemo(() => {
    const map = new Map<string, number>();
    (procsQ.data ?? []).forEach((p) => map.set(p.name, Number(p.default_price || 0)));
    return map;
  }, [procsQ.data]);

  useEffect(() => {
    if (open) {
      setDate(initial?.date ?? today());
      setTime(initial?.time ?? "");
      setClientName(initial?.client_name ?? "");
      setClientId(initial?.client_id ?? null);
      setSelectedProcs(splitProcedureNames(initial?.procedure));
      setPayment(initial?.payment_method ?? "Pix");
      setAmount(initial ? String(initial.amount) : "");
      setAmountTouched(!!initial); // when editing, respect existing amount
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial]);

  // Auto-sum suggestion: only updates the amount while the user hasn't typed manually.
  useEffect(() => {
    if (!open || amountTouched) return;
    const sum = selectedProcs.reduce((acc, n) => acc + (priceByName.get(n) ?? 0), 0);
    setAmount(sum > 0 ? sum.toFixed(2) : "");
  }, [selectedProcs, priceByName, open, amountTouched]);

  const toggleProc = (name: string) => {
    setSelectedProcs((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSave = async () => {
    if (!clientName.trim() || !date) return;
    setSaving(true);
    try {
      await onSubmit({
        date,
        time: time || null,
        client_name: clientName.trim(),
        client_id: clientId,
        procedure: selectedProcs.length ? joinProcedureNames(selectedProcs) : null,
        payment_method: payment,
        amount: parseFloat(amount.replace(",", ".")) || 0,
        notes: notes.trim() || null,
        status: initial?.status ?? "a_fazer",
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const procedures = procsQ.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Editar atendimento" : "Novo atendimento"}
          </DialogTitle>
          <DialogDescription>Registe os dados do atendimento.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="time">Horário</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="client">Cliente</Label>
            <ClientCombobox
              clients={clientsQ.data ?? []}
              value={clientName}
              selectedId={clientId}
              onChange={(name, id) => {
                setClientName(name);
                setClientId(id);
              }}
              placeholder="Procurar ou criar novo cliente"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Procedimentos</Label>
              {selectedProcs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProcs([])}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>

            {procsQ.isLoading ? (
              <p className="text-xs text-muted-foreground">A carregar procedimentos…</p>
            ) : procedures.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum procedimento cadastrado. Adicione em <strong>Procedimentos</strong>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto rounded-lg border border-border/70 bg-secondary/30 p-2">
                {procedures.map((p) => {
                  const active = selectedProcs.includes(p.name);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProc(p.name)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/60"
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedProcs.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedProcs.length} selecionado{selectedProcs.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Pagamento</Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="amount">Valor total (R$)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountTouched(true);
                }}
                placeholder="0,00"
              />
              {!amountTouched && selectedProcs.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Soma sugerida automaticamente — pode editar livremente.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Joias, estado, lembretes..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 sticky bottom-0 -mx-6 -mb-6 px-6 py-3 bg-background border-t border-border">
          {initial && onDelete && (
            <Button
              variant="ghost"
              className="mr-auto text-destructive hover:text-destructive"
              onClick={async () => {
                if (confirm("Apagar este atendimento?")) {
                  await onDelete();
                  onOpenChange(false);
                }
              }}
            >
              Apagar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !clientName.trim()}>
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
