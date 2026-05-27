import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  listTenants,
  updateTenantStatus,
  createTenant,
  deleteTenant,
  updateTenant,
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
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {q.isLoading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-500">Carregando…</td></tr>
            )}
            {q.data?.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-zinc-500">Nenhum cliente ainda.</td></tr>
            )}
            {q.data?.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-800/40">
                <td className="px-4 py-3 font-medium text-zinc-100">{t.business_name}</td>
                <td className="px-4 py-3 text-zinc-300">{t.owner_name || "—"}</td>
                <td className="px-4 py-3 text-zinc-300">{t.whatsapp || "—"}</td>
                <td className="px-4 py-3 text-zinc-300">{t.plan_name}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatBRL(Number(t.monthly_price || 0))}</td>
                <td className="px-4 py-3 text-center text-zinc-300">dia {t.due_day}</td>
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
    </div>
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
              <Field label="Senha provisória">
                <Input type="text" value={form.owner_password} onChange={(e) => setForm({ ...form, owner_password: e.target.value })} />
              </Field>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
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