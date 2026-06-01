import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Upload, Eye, CheckCircle2, XCircle, QrCode, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  getMasterQr,
  updateMasterQr,
  listBillingOverview,
  reviewPayment,
  getComprovanteSignedUrl,
} from "@/lib/billing.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/format";
import { DailyCostsManager } from "@/components/DailyCostsManager";

export const Route = createFileRoute("/master/cobranca")({
  component: MasterCobranca,
});

function MasterCobranca() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80 mb-1.5">Cobrança</p>
        <h1 className="font-display text-3xl md:text-4xl text-zinc-50">Pagamentos & contas</h1>
        <p className="text-sm text-zinc-400 mt-1">
          QR Code Master, acompanhamento de mensalidades e suas contas a pagar.
        </p>
      </header>

      <QrConfigCard />
      <BillingOverviewCard />
      <section>
        <h2 className="font-display text-xl text-zinc-50 mb-3">Minhas contas a pagar</h2>
        <DailyCostsManager scope="master" />
      </section>
    </div>
  );
}

function QrConfigCard() {
  const qc = useQueryClient();
  const fetchQr = useServerFn(getMasterQr);
  const saveFn = useServerFn(updateMasterQr);
  const q = useQuery({ queryKey: ["master-qr"], queryFn: () => fetchQr() });
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ pix_qr_url: "", pix_key: "", pix_copia_cola: "" });
  const [loaded, setLoaded] = useState(false);
  if (q.data && !loaded) {
    setLoaded(true);
    setForm({
      pix_qr_url: q.data.pix_qr_url,
      pix_key: q.data.pix_key,
      pix_copia_cola: q.data.pix_copia_cola,
    });
  }

  const saveM = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      toast.success("QR Code atualizado");
      qc.invalidateQueries({ queryKey: ["master-qr"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `qr-master-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      setForm((f) => ({ ...f, pix_qr_url: data.publicUrl }));
      toast.success("Imagem carregada. Clique em Salvar.");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur p-5 md:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-lg bg-zinc-800/80 flex items-center justify-center">
          <QrCode className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-zinc-100">QR Code Master</h2>
          <p className="text-xs text-zinc-500">Imagem e chave Pix exibidas para todos os clientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
        <div>
          {form.pix_qr_url ? (
            <img
              src={form.pix_qr_url}
              alt="QR Code"
              className="w-48 h-48 object-contain bg-white rounded-lg p-2"
            />
          ) : (
            <div className="w-48 h-48 rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center text-xs text-zinc-500 gap-2">
              <ImageIcon className="h-6 w-6" />
              Nenhuma imagem
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="mt-3 block w-full text-xs text-zinc-400 file:mr-2 file:rounded-md file:border-0 file:bg-amber-400 file:text-zinc-950 file:px-2.5 file:py-1.5 file:text-xs file:font-medium hover:file:bg-amber-300"
          />
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-zinc-400">URL da imagem do QR</Label>
            <Input
              value={form.pix_qr_url}
              onChange={(e) => setForm({ ...form, pix_qr_url: e.target.value })}
              placeholder="https://..."
              className="bg-zinc-900/60 border-zinc-700 text-zinc-100"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Chave Pix</Label>
            <Input
              value={form.pix_key}
              onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
              placeholder="email@dominio.com / CPF / CNPJ"
              className="bg-zinc-900/60 border-zinc-700 text-zinc-100"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Pix copia e cola</Label>
            <textarea
              value={form.pix_copia_cola}
              onChange={(e) => setForm({ ...form, pix_copia_cola: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/60 text-zinc-100 text-xs font-mono px-3 py-2"
              placeholder="00020126..."
            />
          </div>
          <Button
            onClick={() => saveM.mutate()}
            disabled={saveM.isPending}
            className="bg-amber-400 text-zinc-950 hover:bg-amber-300"
          >
            {saveM.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function BillingOverviewCard() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listBillingOverview);
  const reviewFn = useServerFn(reviewPayment);
  const viewFn = useServerFn(getComprovanteSignedUrl);
  const q = useQuery({ queryKey: ["billing-overview"], queryFn: () => fetchList() });

  const reviewM = useMutation({
    mutationFn: (v: { log_id: string; decision: "pago" | "rejeitado"; nota?: string }) =>
      reviewFn({ data: { log_id: v.log_id, decision: v.decision, nota: v.nota } }),
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["billing-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openComprovante = async (path: string) => {
    try {
      const r = await viewFn({ data: { path } });
      window.open(r.url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const rows = q.data ?? [];
  const aguardando = rows.filter((r) => r.log?.status === "aguardando_conferencia").length;

  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-100">Mensalidades do mês</h2>
          <p className="text-xs text-zinc-500">
            {rows.length} cliente(s)
            {aguardando > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300 ring-1 ring-amber-500/30">
                {aguardando} aguardando conferência
              </span>
            )}
          </p>
        </div>
      </div>
      {q.isLoading ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Vencimento</th>
                <th className="py-2 pr-3">Valor</th>
                <th className="py-2 pr-3">QR</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Comprovante</th>
                <th className="py-2 pr-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map((r) => {
                const status = r.log?.status ?? "pendente";
                const isAguardando = status === "aguardando_conferencia";
                return (
                  <tr
                    key={r.tenant_id}
                    className={isAguardando ? "bg-amber-500/5" : ""}
                  >
                    <td className="py-3 pr-3">
                      <p className="text-zinc-100 font-medium">{r.business_name}</p>
                      <p className="text-xs text-zinc-500">{r.owner_name || "—"}</p>
                    </td>
                    <td className="py-3 pr-3 text-zinc-300">dia {r.due_day}</td>
                    <td className="py-3 pr-3 text-zinc-100">{formatBRL(r.monthly_price)}</td>
                    <td className="py-3 pr-3 text-xs">
                      {r.log?.qr_visualizado_em ? (
                        <span className="text-emerald-400">
                          👁️ {new Date(r.log.qr_visualizado_em).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-zinc-500">❌ Não visualizado</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <BillingStatusBadge status={status} />
                    </td>
                    <td className="py-3 pr-3">
                      {r.log?.comprovante_url ? (
                        <button
                          onClick={() => openComprovante(r.log!.comprovante_url!)}
                          className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ver
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {r.log && r.log.comprovante_url && status !== "pago" && (
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() =>
                              reviewM.mutate({ log_id: r.log!.id, decision: "pago" })
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 px-2 py-1 text-xs text-emerald-300"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                          </button>
                          <button
                            onClick={() => {
                              const nota = prompt("Motivo da rejeição (opcional):") ?? "";
                              reviewM.mutate({
                                log_id: r.log!.id,
                                decision: "rejeitado",
                                nota,
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-destructive/15 hover:bg-destructive/25 px-2 py-1 text-xs text-red-300"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Rejeitar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BillingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Pendente", cls: "bg-zinc-700/60 text-zinc-300" },
    aguardando_conferencia: {
      label: "Aguardando",
      cls: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    },
    pago: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" },
    rejeitado: { label: "Rejeitado", cls: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30" },
  };
  const x = map[status] ?? map.pendente;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${x.cls}`}>
      {x.label}
    </span>
  );
}