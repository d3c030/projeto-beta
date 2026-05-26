import { useEffect, useMemo, useState } from "react";
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
import { EXPENSE_PAYMENT_METHODS, formatBRL } from "@/lib/format";
import type { Expense, ExpenseInput } from "@/lib/data";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Expense | null;
  onSubmit: (data: ExpenseInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseDialog({ open, onOpenChange, initial, onSubmit, onDelete }: Props) {
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [payment, setPayment] = useState<string>("Pix");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(initial?.date ?? today());
      setDescription(initial?.description ?? "");
      setQuantity(initial ? String(initial.quantity) : "1");
      setUnitPrice(initial ? String(initial.unit_price) : "");
      setPayment(initial?.payment_method ?? "Pix");
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial]);

  const total = useMemo(() => {
    const q = parseFloat(quantity.replace(",", ".")) || 0;
    const u = parseFloat(unitPrice.replace(",", ".")) || 0;
    return q * u;
  }, [quantity, unitPrice]);

  const handleSave = async () => {
    if (!description.trim()) return;
    setSaving(true);
    try {
      const q = parseFloat(quantity.replace(",", ".")) || 0;
      const u = parseFloat(unitPrice.replace(",", ".")) || 0;
      await onSubmit({
        date,
        description: description.trim(),
        quantity: q,
        unit_price: u,
        total: q * u,
        payment_method: payment,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Editar custo" : "Novo custo"}
          </DialogTitle>
          <DialogDescription>Registe um produto ou despesa do estúdio.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="desc">Produto / Descrição</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pasta mágica, escovinha, luvas"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="qty">Quantidade</Label>
              <Input
                id="qty"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="unit">Preço unitário (R$)</Label>
              <Input
                id="unit"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="rounded-lg bg-secondary px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor final</span>
            <span className="font-display text-xl">{formatBRL(total)}</span>
          </div>

          <div className="grid gap-1.5">
            <Label>Forma de pagamento</Label>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_PAYMENT_METHODS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {initial && onDelete && (
            <Button
              variant="ghost"
              className="mr-auto text-destructive hover:text-destructive"
              onClick={async () => {
                if (confirm("Apagar este custo?")) {
                  await onDelete();
                  onOpenChange(false);
                }
              }}
            >
              Apagar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !description.trim()}>
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
