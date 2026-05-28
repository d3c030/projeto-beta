import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2, Pencil, ExternalLink, DollarSign, CalendarClock, Phone, Users2, KeyRound, Database } from "lucide-react";
import { toast } from "sonner";
import {
  listTenants,
  updateTenantStatus,
  createTenant,
  deleteTenant,
  updateTenant,
  registerPayment,
  listTenantPayments,
  resetTenantOwnerPassword,
  getTenantsUsage,
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
  { value: "ativo", label: "Ativo", cls: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30" },
  { value: "inadimplente", label: "Inadimplente", cls: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30" },
  { value: "suspenso", label: "Suspenso", cls: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30" },
];

function ClientesMaster() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listTenants);
  const setStatus = useServerFn(updateTenantStatus);
  const remove = useServerFn(deleteTenant);
  const fetchUsage = useServerFn(getTenantsUsage);
  const q = useQuery({ queryKey: ["master-tenants"], queryFn: () => fetchList() });
  const usageQ = useQuery({ queryKey: ["master-tenants-usage"], queryFn: () => fetchUsage() });
  const usageMap = new Map((usageQ.data ?? []).map((u) => [u.tenant_id, u]));
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
  const [resetTenant, setResetTenant] = useState<Tenant | null>(null);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80 mb-1.5">Clientes</p>
          <h1 className="font-display text-3xl md:text-4xl text-zinc-50">Gestão de tenants</h1>
          <p className="text-sm text-zinc-400 mt-1">Cadastre, edite, suspenda e registre pagamentos.</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="bg-amber-400 text-zinc-950 hover:bg-amber-300 font-medium shadow-lg shadow-amber-500/20">
          <Plus className="h-4 w-4 mr-1.5" /> Novo cliente
        </Button>
      </header>

      {q.isLoading && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-10 text-center text-sm text-zinc-500">Carregando…</div>
      )}
      {q.data?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center">
          <Users2 className="h-8 w-8 mx-auto text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">Nenhum cliente cadastrado ainda.</p>
          <Button onClick={() => setOpenNew(true)} className="mt-4 bg-amber-400 text-zinc-950 hover:bg-amber-300">
            <Plus className="h-4 w-4 mr-1.5" /> Cadastrar primeiro cliente
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {q.data?.map((t) => (
          <div
            key={t.id}
            className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur p-5 hover:border-zinc-700 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg text-zinc-50 truncate">{t.business_name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{t.owner_name || "Sem responsável"}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Plano" value={t.plan_name} />
              <Stat label="Mensalidade" value={formatBRL(Number(t.monthly_price || 0))} />
              <Stat label="Vencimento" value={`dia ${t.due_day}`} />
            </div>

            {/* Storage usage */}
            <UsageRow usage={usageMap.get(t.id)} loading={usageQ.isLoading} />

            {/* License + contact */}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60 px-3 py-2.5">
              <LicenseInline expiresAt={t.license_expires_at} />
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{t.whatsapp || "—"}</span>
              </div>
            </div>

            {/* Footer actions */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <a
                href={`/t/${t.slug}/agendar`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-amber-400 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                /t/{t.slug}
              </a>
              <div className="flex items-center gap-1">
                <StatusPicker
                  current={t.status}
                  onSelect={(s) => statusM.mutate({ id: t.id, status: s })}
                  disabled={statusM.isPending}
                />
                <button
                  onClick={() => setPayingTenant(t)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  title="Registrar pagamento"
                >
                  <DollarSign className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setResetTenant(t)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-amber-400 hover:bg-amber-500/10 transition-colors"
                  title="Resetar senha do responsável"
                >
                  <KeyRound className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditing(t)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir ${t.business_name}? Todos os dados deste tenant serão removidos.`))
                      delM.mutate(t.id);
                  }}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <NewTenantDialog open={openNew} onClose={() => setOpenNew(false)} />
      <EditTenantDialog tenant={editing} onClose={() => setEditing(null)} />
      <PaymentDialog tenant={payingTenant} onClose={() => setPayingTenant(null)} />
      <ResetPasswordDialog tenant={resetTenant} onClose={() => setResetTenant(null)} />
    </div>
  );
}

function ResetPasswordDialog({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  const reset = useServerFn(resetTenantOwnerPassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Reset state when tenant changes
  const tid = tenant?.id ?? "";
  const [lastTid, setLastTid] = useState("");
  if (tenant && tid !== lastTid) {
    setLastTid(tid);
    setPassword("");
    setConfirm("");
  }

  const m = useMutation({
    mutationFn: () =>
      reset({ data: { tenant_id: tenant!.id, new_password: password } }),
    onSuccess: (r) => {
      toast.success(
        r.email
          ? `Senha redefinida para ${r.email}`
          : "Senha redefinida com sucesso",
      );
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    password.length >= 8 && password === confirm && !m.isPending;

  return (
    <Dialog open={!!tenant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Resetar senha — {tenant?.business_name}
          </DialogTitle>
        </DialogHeader>
        {tenant && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Defina uma nova senha para o responsável deste cliente. Ele poderá
              entrar imediatamente com a nova senha — informe-o pelo seu canal
              habitual.
            </p>
            <Field label="Nova senha (mín. 8 caracteres)">
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirmar nova senha">
              <Input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
            {password && confirm && password !== confirm && (
              <p className="text-xs text-red-400">As senhas não coincidem.</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => m.mutate()}
            disabled={!canSubmit}
            className="bg-amber-400 text-zinc-950 hover:bg-amber-300"
          >
            {m.isPending ? "Redefinindo…" : "Redefinir senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/60 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-sm text-zinc-100 truncate mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function UsageRow({
  usage,
  loading,
}: {
  usage: { rows: number; bytes: number; perTable: Array<{ table: string; rows: number; bytes: number }> } | undefined;
  loading: boolean;
}) {
  const rows = usage?.rows ?? 0;
  const bytes = usage?.bytes ?? 0;
  const detail = (usage?.perTable ?? [])
    .sort((a, b) => b.rows - a.rows)
    .map((p) => `${p.table}: ${p.rows}`)
    .join("  ·  ");
  return (
    <div
      className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60 px-3 py-2.5"
      title={detail || undefined}
    >
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Database className="h-3 w-3 text-zinc-500" />
        <span className="text-zinc-500">Uso de dados</span>
      </div>
      <div className="text-xs text-zinc-200 font-medium">
        {loading ? "…" : `${rows.toLocaleString("pt-BR")} reg · ${formatBytes(bytes)}`}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status)!;
  return (
    <span className={"inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0 " + opt.cls}>
      <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {opt.label}
    </span>
  );
}

function StatusPicker({
  current,
  onSelect,
  disabled,
}: {
  current: TenantStatus;
  onSelect: (s: TenantStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={current}
      disabled={disabled}
      onChange={(e) => onSelect(e.target.value as TenantStatus)}
      className="h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-200 px-2 hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400/50 cursor-pointer"
      title="Alterar status"
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function LicenseInline({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <CalendarClock className="h-3 w-3" />
        Sem pagamento
      </div>
    );
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m, d] = expiresAt.split("-").map(Number);
  const exp = new Date(y, m - 1, d);
  const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  const fmt = exp.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const cls = days < 0 ? "text-red-400" : days <= 5 ? "text-amber-400" : "text-emerald-400";
  const lbl = days < 0 ? `vencida há ${Math.abs(days)}d` : days === 0 ? "vence hoje" : `${days}d restantes`;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <CalendarClock className={"h-3 w-3 " + cls} />
      <span className={cls + " font-medium"}>{lbl}</span>
      <span className="text-zinc-600">·</span>
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
              <Input
                list="plan-presets"
                value={form.plan_name}
                onChange={(e) => {
                  const v = e.target.value;
                  // Auto-zera mensalidade ao escolher Indique e Ganhe
                  if (v.toLowerCase().includes("indique")) {
                    setForm({ ...form, plan_name: v, monthly_price: 0 });
                  } else {
                    setForm({ ...form, plan_name: v });
                  }
                }}
              />
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
                <Input
                  list="plan-presets"
                  value={form.plan_name}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.toLowerCase().includes("indique")) {
                      setForm({ ...form, plan_name: v, monthly_price: 0 });
                    } else {
                      setForm({ ...form, plan_name: v });
                    }
                  }}
                />
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