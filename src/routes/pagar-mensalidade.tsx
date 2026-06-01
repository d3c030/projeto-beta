import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { CreditCard, QrCode, Upload, CheckCircle2, Clock, XCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  getMyCurrentBilling,
  getMasterQr,
  registerQrViewed,
  submitComprovante,
  listMyPaymentHistory,
  getComprovanteSignedUrl,
} from "@/lib/billing.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/pagar-mensalidade")({
  head: () => ({ meta: [{ title: "Pagar mensalidade" }] }),
  component: PagarMensalidade,
});

const MES_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function mesReferenciaLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MES_LABELS[m - 1]} de ${y}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pendente: {
      label: "Pendente",
      cls: "bg-muted text-muted-foreground",
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    aguardando_conferencia: {
      label: "Aguardando conferência",
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    pago: {
      label: "Pago",
      cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    rejeitado: {
      label: "Rejeitado",
      cls: "bg-destructive/15 text-destructive",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  };
  const x = map[status] ?? map.pendente;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${x.cls}`}>
      {x.icon} {x.label}
    </span>
  );
}

function PagarMensalidade() {
  const qc = useQueryClient();
  const fetchBilling = useServerFn(getMyCurrentBilling);
  const fetchQr = useServerFn(getMasterQr);
  const fetchHistory = useServerFn(listMyPaymentHistory);
  const registerView = useServerFn(registerQrViewed);
  const submitFn = useServerFn(submitComprovante);

  const billingQ = useQuery({ queryKey: ["my-billing"], queryFn: () => fetchBilling() });
  const qrQ = useQuery({ queryKey: ["master-qr"], queryFn: () => fetchQr() });
  const histQ = useQuery({ queryKey: ["my-payment-history"], queryFn: () => fetchHistory() });

  const [qrRevealed, setQrRevealed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const revealM = useMutation({
    mutationFn: () => registerView(),
    onSuccess: () => {
      setQrRevealed(true);
      qc.invalidateQueries({ queryKey: ["my-billing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const billing = billingQ.data;
  const log = billing?.log;

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!billing) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 10MB");
      return;
    }
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${billing.tenant_id}/${billing.log.mes_referencia}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("comprovantes").upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      await submitFn({ data: { comprovante_url: path } });
      toast.success("Comprovante enviado! Aguarde a conferência.");
      qc.invalidateQueries({ queryKey: ["my-billing"] });
      qc.invalidateQueries({ queryKey: ["my-payment-history"] });
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const viewMyComprovanteFn = useServerFn(getComprovanteSignedUrl);
  const openComprovante = async (path: string) => {
    try {
      const r = await viewMyComprovanteFn({ data: { path } });
      window.open(r.url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">Pagar mensalidade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Veja o valor do mês e envie seu comprovante de pagamento.
        </p>
      </div>

      {billingQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : billing ? (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
          {/* Resumo */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Mês de referência
              </p>
              <p className="text-lg font-semibold capitalize">
                {mesReferenciaLabel(log!.mes_referencia)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Vencimento: dia {billing.due_day}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Valor</p>
              <p className="font-display text-3xl">{formatBRL(billing.monthly_price)}</p>
              <div className="mt-1.5">
                <StatusBadge status={log!.status} />
              </div>
            </div>
          </div>

          {/* Notas de revisão */}
          {log!.nota_revisao && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Nota do administrador:</p>
              <p>{log!.nota_revisao}</p>
            </div>
          )}

          {/* QR + comprovante */}
          {log!.status !== "pago" && (
            <>
              {!qrRevealed && !log!.qr_visualizado_em ? (
                <Button
                  onClick={() => revealM.mutate()}
                  disabled={revealM.isPending}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Gerar QR Code para pagamento
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 flex flex-col sm:flex-row gap-4 items-center">
                    {qrQ.data?.pix_qr_url ? (
                      <img
                        src={qrQ.data.pix_qr_url}
                        alt="QR Code Pix"
                        className="w-48 h-48 object-contain bg-white rounded-lg p-2"
                      />
                    ) : (
                      <div className="w-48 h-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                        QR Code ainda não configurado pelo administrador
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-2 w-full">
                      {qrQ.data?.pix_key && (
                        <div>
                          <p className="text-xs text-muted-foreground">Chave Pix</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{qrQ.data.pix_key}</p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(qrQ.data!.pix_key);
                                toast.success("Chave copiada");
                              }}
                              className="rounded-md p-1 hover:bg-muted"
                              title="Copiar chave"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                      {qrQ.data?.pix_copia_cola && (
                        <div>
                          <p className="text-xs text-muted-foreground">Pix copia e cola</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono truncate">
                              {qrQ.data.pix_copia_cola}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(qrQ.data!.pix_copia_cola);
                                toast.success("Copiado");
                              }}
                              className="rounded-md p-1 hover:bg-muted shrink-0"
                              title="Copiar"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-medium mb-2">Enviar comprovante</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Após o pagamento, anexe o comprovante (imagem ou PDF até 10MB).
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={onFileChange}
                      className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-primary/90"
                    />
                    {log!.comprovante_url && (
                      <button
                        onClick={() => openComprovante(log!.comprovante_url!)}
                        className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Ver comprovante enviado
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* Histórico */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-medium">Histórico</h2>
        </div>
        {(histQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem registros ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(histQ.data ?? []).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm capitalize">{mesReferenciaLabel(h.mes_referencia)}</span>
                <StatusBadge status={h.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}