import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2, Pencil, ExternalLink, DollarSign, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import {
  listTenants,
  updateTenantStatus,
  createTenant,
  deleteTenant,
  updateTenant,
  registerPayment,
  listTenantPayments,
  type TenantStatus,
  type Tenant,
} from "@/lib/tenant.functions";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/master/clientes")({
  component: ClientesMaster,
});

const STATUS_OPTIONS: { value: TenantStatus; label: string; cls: string }[] = [
  { value: "ativo", label: "Ativo", cls: "bg-emerald-900/40 text-emerald-300 border-emerald-800" },
  { value: "inadimplente", label: "Inadimplente", cls: "bg-amber-900/40 text-amber-300 border-amber-800" },
  { value: "suspenso", label: "Suspenso", cls: "bg-red-900/40 text-red-300 border-red-800" },
];

function ClientesMaster() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listTenants);
  const setStatus = useServerFn(updateTenantStatus);
  const remove = useServerFn(deleteTenant);
  const q = useQuery({ queryKey: ["master-tenants"], queryFn: () => fetchList() });
  const [openNew, setOpenNew] = useState(false);

  const statusM = useMutation({
    mutationFn: (v: { id: string; status: TenantStatus }) => setStatus({ data: v }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["master-tenants"] });
      qc.invalidateQueries({ queryKey: ["saas-metrics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["master-tenants"] });
      qc.invalidateQueries({ queryKey: ["saas-metrics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editing, setEditing] = useState<Tenant | null>(null);
  const [payingTenant, setPayingTenant] = useState<Tenant | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-zinc-50">Clientes</h1>
          <p className="text-sm text-zinc-400">Gerencie os tenants do SaaS.</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="bg-zinc-100 text-zinc-900 hover:bg-white">
          <Plus className="h-4 w-4 mr-1.5" /> Novo cliente
        </Button>
      </header>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">Negócio</th>
              <th className="text-left px-4 py-3">Responsável</th>
              <th className="text-left px-4 py-3">WhatsApp</th>
              <th className="text-left px-4 py-3">Plano</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="text-center px-4 py-3">Venc.</th>
              <th className="text-center px-4 py-3">Licença</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {q.isLoading && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">Carregando…</td></tr>
            )}
            {q.data?.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">Nenhum cliente ainda.</td></tr>
            )}
            {q.data?.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-800/40">
                <td className="px-4 py-3 font-medium text-zinc-100">{t.business_name}</td>
                <td className="px-4 py-3 text-zinc-300">{t.owner_name || "—"}</td>
                <td className="px-4 py-3 text-zinc-300">
                  <div className="flex flex-col gap-1">
                    <span>{t.whatsapp || "—"}</span>
                    <a
                      href={`/t/${t.slug}/agendar`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200"
                    >
                      <ExternalLink className="h-3 w-3" />
                      /t/{t.slug}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-300">{t.plan_name}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatBRL(Number(t.monthly_price || 0))}</td>
                <td className="px-4 py-3 text-center text-zinc-300">dia {t.due_day}</td>
                <td className="px-4 py-3 text-center"><LicenseCell expiresAt={t.license_expires_at} /></td>
                <td className="px-4 py-3">
                  <div className="inline-flex rounded-md border border-zinc-800 overflow-hidden">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => statusM.mutate({ id: t.id, status: opt.value })}
                        disabled={statusM.isPending}
                        className={
                          "px-2 py-1 text-[11px] transition-colors " +
                          (t.status === opt.value
                            ? opt.cls + " border-r last:border-r-0"
                            : "text-zinc-500 hover:bg-zinc-800 border-r last:border-r-0 border-zinc-800")
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setPayingTenant(t)}
                    className="text-emerald-500 hover:text-emerald-300 mr-3"
                    title="Registrar pagamento"
                  >
                    <DollarSign className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditing(t)}
                    className="text-zinc-500 hover:text-zinc-100 mr-3"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir ${t.business_name}? Todos os dados deste tenant serão removidos.`))
                        delM.mutate(t.id);
                    }}
                    className="text-zinc-500 hover:text-red-400"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewTenantDialog open={openNew} onClose={() => setOpenNew(false)} />
      <EditTenantDialog tenant={editing} onClose={() => setEditing(null)} />
      <PaymentDialog tenant={payingTenant} onClose={() => setPayingTenant(null)} />
    </div>
  );
}

function LicenseCell({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-[11px] text-zinc-500">—</span>;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m, d] = expiresAt.split("-").map(Number);
  const exp = new Date(y, m - 1, d);
  const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  const fmt = exp.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const cls = days < 0 ? "text-red-400" : days <= 5 ? "text-amber-400" : "text-emerald-400";
  const lbl = days < 0 ? `vencida há ${Math.abs(days)}d` : days === 0 ? "vence hoje" : `${days}d`;
  return (
    <div className="flex flex-col items-center text-[11px]">
      <span className={cls + " font-medium"}>{lbl}</span>
      <span className="text-zinc-500">{fmt}</span>
    </div>
  );
}

function PaymentDialog({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  const qc = useQueryClient();
  const register = useServerFn(registerPayment);
  const fetchPayments = useServerFn(listTenantPayments);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ paid_at: today, amount: 0, payment_method: "PIX", notes: "" });

  // Reset when tenant changes
  const tid = tenant?.id ?? "";
  const [lastTid, setLastTid] = useState("");
  if (tenant && tid !== lastTid) {
    setLastTid(tid);
    setForm({ paid_at: today, amount: Number(tenant.monthly_price || 0), payment_method: "PIX", notes: "" });
  }

  const historyQ = useQuery({
    queryKey: ["tenant-payments", tid],
    queryFn: () => fetchPayments({ data: { tenant_id: tid } }),
    enabled: !!tenant,
  });

  const m = useMutation({
    mutationFn: () =>
      register({
        data: {
          tenant_id: tenant!.id,
          amount: Number(form.amount) || 0,
          paid_at: form.paid_at,
          payment_method: form.payment_method.trim(),
          notes: form.notes.trim(),
        },
      }),
    onSuccess: (r) => {
      toast.success(`Licença estendida até ${new Date(r.new_expires_at + "T00:00:00").toLocaleDateString("pt-BR")}`);
      qc.invalidateQueries({ queryKey: ["master-tenants"] });
      qc.invalidateQueries({ queryKey: ["saas-metrics"] });
      qc.invalidateQueries({ queryKey: ["tenant-payments", tid] });
      qc.invalidateQueries({ queryKey: ["access-state"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!tenant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Registrar pagamento — {tenant?.business_name}
          </DialogTitle>
        </DialogHeader>
        {tenant && (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
              <p>Vencimento atual: <strong>{tenant.license_expires_at ? new Date(tenant.license_expires_at + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</strong></p>
              <p className="text-muted-foreground mt-0.5">A licença será estendida em 1 mês a partir da data do pagamento (ou do vencimento atual, se ainda futuro).</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data do pagamento">
                <Input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} />
              </Field>
              <Field label="Valor (R$)">
                <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Método">
              <Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="PIX, Cartão, Dinheiro…" />
            </Field>
            <Field label="Observações">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Histórico</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {historyQ.isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
                {historyQ.data?.length === 0 && <p className="text-xs text-muted-foreground">Nenhum pagamento registrado.</p>}
                {historyQ.data?.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs border border-border rounded px-2 py-1.5">
                    <span>{new Date(p.paid_at + "T00:00:00").toLocaleDateString("pt-BR")} · {p.payment_method || "—"}</span>
                    <span className="font-medium">{formatBRL(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Registrando…" : "Registrar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewTenantDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createTenant);
  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    whatsapp: "",
    slug: "",
    plan_name: "Básico",
    monthly_price: 0,
    due_day: 10,
    primary_color: "",
    owner_email: "",
    owner_password: "",
  });

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          tenant: {
            business_name: form.business_name.trim(),
            owner_name: form.owner_name.trim(),
            whatsapp: form.whatsapp.replace(/\D/g, ""),
            slug: form.slug.trim().toLowerCase(),
            plan_name: form.plan_name.trim() || "Básico",
            monthly_price: Number(form.monthly_price) || 0,
            due_day: Math.max(1, Math.min(31, Number(form.due_day) || 10)),
            status: "ativo",
            primary_color: form.primary_color.trim(),
            logo_url: "",
            theme: "rosa",
            instagram_url: "",
            pix_key: "",
            pix_copia_cola: "",
            pix_qr_url: "",
          },
          owner_email: form.owner_email.trim(),
          owner_password: form.owner_password,
        },
      }),
    onSuccess: () => {
      toast.success("Cliente criado com sucesso");
      qc.invalidateQueries({ queryKey: ["master-tenants"] });
      qc.invalidateQueries({ queryKey: ["saas-metrics"] });
      onClose();
      setForm({ ...form, business_name: "", owner_name: "", whatsapp: "", slug: "", owner_email: "", owner_password: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Nome do negócio">
            <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsável">
              <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
            </Field>
            <Field label="WhatsApp (DDI+DDD)">
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "") })} />
            </Field>
          </div>
          <Field label="Slug (URL personalizada)" hint="ex.: studio-maria — use letras minúsculas, números e hifens">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Plano">
              <Input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
            </Field>
            <Field label="Mensalidade (R$)">
              <Input type="number" min={0} step="0.01" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })} />
            </Field>
            <Field label="Dia venc.">
              <Input type="number" min={1} max={31} value={form.due_day} onChange={(e) => setForm({ ...form, due_day: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Cor principal (hex)" hint="opcional — ex.: #e85d3a">
            <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} placeholder="#000000" />
          </Field>
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Usuário de acesso do cliente</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="E-mail">
                <Input type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
              </Field>
              <Field label="Senha provisória (mín. 8 caracteres)">
                <Input type="text" minLength={8} value={form.owner_password} onChange={(e) => setForm({ ...form, owner_password: e.target.value })} />
              </Field>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              if (form.owner_password.length < 8) {
                toast.error("A senha provisória deve ter pelo menos 8 caracteres");
                return;
              }
              m.mutate();
            }}
            disabled={m.isPending}
          >
            {m.isPending ? "Criando…" : "Criar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EditTenantDialog({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  const qc = useQueryClient();
  const update = useServerFn(updateTenant);
  const [form, setForm] = useState(() => toForm(tenant));

  // Reset form when tenant changes
  if (tenant && form._id !== tenant.id) {
    setForm(toForm(tenant));
  }

  const m = useMutation({
    mutationFn: () =>
      update({
        data: {
          id: tenant!.id,
          patch: {
            business_name: form.business_name.trim(),
            owner_name: form.owner_name.trim(),
            whatsapp: form.whatsapp.replace(/\D/g, ""),
            slug: form.slug.trim().toLowerCase(),
            plan_name: form.plan_name.trim() || "Básico",
            monthly_price: Number(form.monthly_price) || 0,
            due_day: Math.max(1, Math.min(31, Number(form.due_day) || 10)),
            primary_color: form.primary_color.trim(),
            logo_url: form.logo_url.trim(),
            instagram_url: form.instagram_url.trim(),
            pix_key: form.pix_key.trim(),
            pix_copia_cola: form.pix_copia_cola.trim(),
            pix_qr_url: form.pix_qr_url.trim(),
          },
        },
      }),
    onSuccess: () => {
      toast.success("Cliente atualizado");
      qc.invalidateQueries({ queryKey: ["master-tenants"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!tenant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        {tenant && (
          <div className="space-y-3">
            <Field label="Nome do negócio">
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Responsável">
                <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "") })} />
              </Field>
            </div>
            <Field label="Slug">
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Plano">
                <Input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
              </Field>
              <Field label="Mensalidade (R$)">
                <Input type="number" min={0} step="0.01" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })} />
              </Field>
              <Field label="Dia venc.">
                <Input type="number" min={1} max={31} value={form.due_day} onChange={(e) => setForm({ ...form, due_day: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="pt-3 border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground">White-label</p>
              <Field label="URL do logo">
                <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cor principal (hex)">
                  <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} placeholder="#000000" />
                </Field>
                <Field label="Instagram">
                  <Input value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/..." />
                </Field>
              </div>
            </div>
            <div className="pt-3 border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground">PIX</p>
              <Field label="Chave PIX">
                <Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} />
              </Field>
              <Field label="PIX Copia & Cola">
                <Input value={form.pix_copia_cola} onChange={(e) => setForm({ ...form, pix_copia_cola: e.target.value })} />
              </Field>
              <Field label="URL do QR Code">
                <Input value={form.pix_qr_url} onChange={(e) => setForm({ ...form, pix_qr_url: e.target.value })} />
              </Field>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toForm(t: Tenant | null) {
  return {
    _id: t?.id ?? "",
    business_name: t?.business_name ?? "",
    owner_name: t?.owner_name ?? "",
    whatsapp: t?.whatsapp ?? "",
    slug: t?.slug ?? "",
    plan_name: t?.plan_name ?? "Básico",
    monthly_price: Number(t?.monthly_price ?? 0),
    due_day: Number(t?.due_day ?? 10),
    primary_color: t?.primary_color ?? "",
    logo_url: t?.logo_url ?? "",
    instagram_url: t?.instagram_url ?? "",
    pix_key: t?.pix_key ?? "",
    pix_copia_cola: t?.pix_copia_cola ?? "",
    pix_qr_url: t?.pix_qr_url ?? "",
  };
}