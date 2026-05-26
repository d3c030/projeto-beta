import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Receipt, CreditCard, Wallet, Banknote, HandCoins, Handshake,
  Smartphone, Copy, Check, QrCode, CheckCircle2, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBRL, formatDateBR } from "@/lib/format";
import { completeAppointment, type Appointment } from "@/lib/data";
import { fetchProcedures, splitProcedureNames } from "@/lib/procedures";
import { getContactSettings } from "@/lib/settings.functions";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  appointment: Appointment | null;
  onCompleted?: () => void;
};

type PaymentMethod =
  | "Pix" | "Crédito" | "Débito" | "Dinheiro" | "A Receber" | "Parceria";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "Pix", label: "Pix", icon: Smartphone },
  { value: "Crédito", label: "Crédito", icon: CreditCard },
  { value: "Débito", label: "Débito", icon: CreditCard },
  { value: "Dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "A Receber", label: "A Receber", icon: HandCoins },
  { value: "Parceria", label: "Parceria", icon: Handshake },
];

export function CheckoutSheet({ open, onOpenChange, appointment, onCompleted }: Props) {
  const procsQ = useQuery({ queryKey: ["procedures"], queryFn: fetchProcedures, enabled: open });
  const settingsQ = useQuery({ queryKey: ["public-contact-settings"], queryFn: () => getContactSettings(), enabled: open });

  const [payOpen, setPayOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PaymentMethod | null>(null);
  const [pendingFinal, setPendingFinal] = useState(0);
  const [pendingSubtotal, setPendingSubtotal] = useState(0);
  const [pendingDiscount, setPendingDiscount] = useState(0);
  const [saving, setSaving] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPayOpen(false);
      setPixOpen(false);
      setPendingPayment(null);
    }
  }, [open]);

  const procPriceMap = useMemo(() => {
    const m = new Map<string, number>();
    (procsQ.data ?? []).forEach((p) => m.set(p.name, Number(p.default_price || 0)));
    return m;
  }, [procsQ.data]);

  const items = useMemo(() => {
    if (!appointment) return [];
    const names = splitProcedureNames(appointment.procedure);
    if (names.length === 0 && Number(appointment.amount) > 0) {
      return [{ name: "Atendimento", price: Number(appointment.amount) }];
    }
    // Distribute amount across items: prefer per-procedure default price; if total mismatches and there is just one item, use amount.
    return names.map((n) => ({ name: n, price: procPriceMap.get(n) ?? 0 }));
  }, [appointment, procPriceMap]);

  const itemsSubtotal = useMemo(
    () => items.reduce((s, it) => s + it.price, 0),
    [items],
  );

  // Subtotal: use stored subtotal if present; otherwise sum items; otherwise saved amount.
  const subtotal = useMemo(() => {
    if (!appointment) return 0;
    if (Number(appointment.subtotal) > 0) return Number(appointment.subtotal);
    if (itemsSubtotal > 0) return itemsSubtotal;
    return Number(appointment.amount) || 0;
  }, [appointment, itemsSubtotal]);

  const handleStartPayment = () => {
    setPayOpen(true);
  };

  const handleConfirmPayment = async (
    method: PaymentMethod,
    subtotalVal: number,
    discountVal: number,
    finalVal: number,
  ) => {
    if (!appointment) return;
    setPendingPayment(method);
    setPendingSubtotal(subtotalVal);
    setPendingDiscount(discountVal);
    setPendingFinal(finalVal);

    if (method === "Pix") {
      // Move from payment modal to QR Code modal
      setPayOpen(false);
      // small delay so close animation runs before opening next
      setTimeout(() => setPixOpen(true), 150);
      return;
    }

    // Direct completion for card/cash/etc.
    await persistCompletion(method, subtotalVal, discountVal, finalVal);
  };

  const persistCompletion = async (
    method: PaymentMethod,
    subtotalVal: number,
    discountVal: number,
    finalVal: number,
  ) => {
    if (!appointment) return;
    setSaving(true);
    try {
      await completeAppointment(appointment.id, {
        subtotal: subtotalVal,
        discount: discountVal,
        amount: finalVal,
        payment_method: method,
      });
      toast.success("Atendimento finalizado");
      setPayOpen(false);
      setPixOpen(false);
      onOpenChange(false);
      onCompleted?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) return null;

  const time = appointment.time ? String(appointment.time).slice(0, 5) : null;
  const isConcluded = appointment.status === "concluido";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="font-display text-2xl leading-tight">
              {appointment.client_name}
            </SheetTitle>
            <SheetDescription className="text-sm">
              {formatDateBR(appointment.date)}
              {time && <> · <span className="tabular-nums">{time}</span></>}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 animate-fade-in">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">Extrato</h3>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum procedimento registrado neste atendimento.
                </p>
              ) : (
                <ul className="rounded-xl border border-border bg-card divide-y divide-border/70">
                  {items.map((it, idx) => (
                    <li key={idx} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm">{it.name}</span>
                      <span className="text-sm font-medium tabular-nums">
                        {formatBRL(it.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {isConcluded && (
              <div className="rounded-xl border border-[color:var(--success,#16a34a)]/30 bg-[color:var(--success,#16a34a)]/10 text-[color:var(--success,#16a34a)] px-4 py-3 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Atendimento já concluído ({appointment.payment_method ?? "—"}).
              </div>
            )}
          </div>

          <div className="border-t border-border bg-card/50 px-6 py-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Valor Total</span>
              <span className="font-display text-3xl tabular-nums">
                {formatBRL(subtotal)}
              </span>
            </div>
            <Button
              size="lg"
              className="w-full text-base h-12"
              onClick={handleStartPayment}
              disabled={subtotal <= 0}
            >
              {isConcluded ? "Refazer pagamento" : "Finalizar Atendimento"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        subtotal={subtotal}
        saving={saving}
        onConfirm={handleConfirmPayment}
      />

      <PixDialog
        open={pixOpen}
        onOpenChange={(o) => {
          setPixOpen(o);
          if (!o && !saving) {
            // user cancelled — return to payment modal
          }
        }}
        amount={pendingFinal}
        pixKey={settingsQ.data?.pix_key ?? ""}
        pixCopiaCola={settingsQ.data?.pix_copia_cola ?? ""}
        pixQrUrl={settingsQ.data?.pix_qr_url ?? ""}
        saving={saving}
        onReceived={async () => {
          if (pendingPayment) {
            await persistCompletion(pendingPayment, pendingSubtotal, pendingDiscount, pendingFinal);
          }
        }}
      />
    </>
  );
}

/* ============= Payment modal ============= */

function PaymentDialog({
  open, onOpenChange, subtotal, saving, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subtotal: number;
  saving: boolean;
  onConfirm: (method: PaymentMethod, subtotal: number, discount: number, final: number) => void | Promise<void>;
}) {
  const [discountMode, setDiscountMode] = useState<"BRL" | "PCT">("BRL");
  const [discountStr, setDiscountStr] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Pix");

  useEffect(() => {
    if (open) {
      setDiscountStr("");
      setDiscountMode("BRL");
      setMethod("Pix");
    }
  }, [open]);

  const discountValue = parseFloat(discountStr.replace(",", ".")) || 0;
  const discountBRL =
    discountMode === "PCT"
      ? Math.max(0, Math.min(100, discountValue)) * subtotal / 100
      : Math.max(0, discountValue);
  const final = Math.max(0, subtotal - discountBRL);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Pagamento</DialogTitle>
          <DialogDescription>
            Aplique desconto e escolha a forma de pagamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Subtotal */}
          <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-base font-medium tabular-nums">{formatBRL(subtotal)}</span>
          </div>

          {/* Desconto */}
          <div className="space-y-2">
            <Label className="text-sm">Desconto</Label>
            <div className="flex items-stretch gap-2">
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDiscountMode("BRL")}
                  className={cn(
                    "px-3 text-sm font-medium transition-colors",
                    discountMode === "BRL"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-secondary"
                  )}
                >
                  R$
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode("PCT")}
                  className={cn(
                    "px-3 text-sm font-medium transition-colors border-l border-border",
                    discountMode === "PCT"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-secondary"
                  )}
                >
                  %
                </button>
              </div>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                placeholder={discountMode === "PCT" ? "0" : "0,00"}
                className="flex-1"
              />
            </div>
            {discountBRL > 0 && (
              <p className="text-xs text-muted-foreground">
                −{formatBRL(discountBRL)} aplicados
                {discountMode === "PCT" ? ` (${discountValue}%)` : ""}
              </p>
            )}
          </div>

          {/* Total */}
          <div className="flex items-baseline justify-between rounded-lg bg-primary/10 px-4 py-3 border border-primary/20">
            <span className="text-sm font-medium text-primary">Valor Final</span>
            <span className="font-display text-2xl tabular-nums text-primary">
              {formatBRL(final)}
            </span>
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-2">
            <Label className="text-sm">Forma de pagamento</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = method === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMethod(opt.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-sm scale-[1.02]"
                        : "border-border bg-card hover:border-primary/40 text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(method, subtotal, discountBRL, final)}
            disabled={saving || final <= 0}
          >
            {saving ? "A guardar..." : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============= Pix QR modal ============= */

function PixDialog({
  open, onOpenChange, amount, pixKey, pixCopiaCola, pixQrUrl, saving, onReceived,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  amount: number;
  pixKey: string;
  pixCopiaCola: string;
  pixQrUrl: string;
  saving: boolean;
  onReceived: () => void | Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const payload = pixCopiaCola || pixKey;
  const qrSrc = pixQrUrl
    ? pixQrUrl
    : payload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(payload)}`
    : "";
  const hasQr = Boolean(qrSrc);

  const handleCopy = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success("Chave Pix copiada");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Pagamento via Pix
          </DialogTitle>
          <DialogDescription>
            Peça ao cliente para escanear o QR Code ou colar a chave.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 animate-scale-in">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Valor a receber</div>
            <div className="font-display text-3xl tabular-nums text-primary">
              {formatBRL(amount)}
            </div>
          </div>

          {hasQr ? (
            <div className="rounded-2xl border border-border bg-white p-3 flex items-center justify-center">
              <img
                src={qrSrc}
                alt="QR Code Pix"
                className="w-full h-auto max-w-[280px]"
                loading="eager"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Configure a chave Pix ou envie a imagem do QR Code em <strong>Configurações</strong>.
            </div>
          )}

          {payload && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar Chave Pix"}
            </Button>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button
            onClick={() => onReceived()}
            disabled={saving}
            className="bg-[color:var(--success,#16a34a)] hover:bg-[color:var(--success,#16a34a)]/90 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {saving ? "A guardar..." : "Pagamento Recebido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// avoid unused import warning
void Wallet;
