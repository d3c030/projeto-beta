import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================
// Helpers
// ============================================================
function firstOfThisMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getTenantIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.tenant_id as string | null) ?? null;
}

async function isSuperadmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  return !!data;
}

// ============================================================
// Master QR config (uses contact_settings)
// ============================================================
export type MasterQr = {
  pix_qr_url: string;
  pix_key: string;
  pix_copia_cola: string;
};

export const getMasterQr = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<MasterQr> => {
    const { data } = await supabaseAdmin
      .from("contact_settings")
      .select("pix_qr_url, pix_key, pix_copia_cola")
      .limit(1)
      .maybeSingle();
    return {
      pix_qr_url: (data?.pix_qr_url as string) ?? "",
      pix_key: (data?.pix_key as string) ?? "",
      pix_copia_cola: (data?.pix_copia_cola as string) ?? "",
    };
  });

export const updateMasterQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        pix_qr_url: z.string().trim().max(1000).default(""),
        pix_key: z.string().trim().max(255).default(""),
        pix_copia_cola: z.string().trim().max(4000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!(await isSuperadmin(context.userId))) throw new Error("Acesso negado");
    // Upsert single row
    const { data: existing } = await supabaseAdmin
      .from("contact_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("contact_settings")
        .update(data)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("contact_settings").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============================================================
// Payment logs — tenant side
// ============================================================
export type PaymentLog = {
  id: string;
  tenant_id: string;
  mes_referencia: string;
  qr_visualizado_em: string | null;
  comprovante_url: string | null;
  comprovante_enviado_em: string | null;
  status: "pendente" | "aguardando_conferencia" | "pago" | "rejeitado";
  revisado_em: string | null;
  nota_revisao: string | null;
  created_at: string;
  updated_at: string;
};

async function ensureCurrentMonthLog(tenantId: string): Promise<PaymentLog> {
  const mes = firstOfThisMonthIso();
  const { data: existing } = await supabaseAdmin
    .from("payment_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("mes_referencia", mes)
    .maybeSingle();
  if (existing) return existing as PaymentLog;
  const { data, error } = await supabaseAdmin
    .from("payment_logs")
    .insert({ tenant_id: tenantId, mes_referencia: mes, status: "pendente" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PaymentLog;
}

export const getMyCurrentBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantIdForUser(context.userId);
    if (!tenantId) throw new Error("Sem tenant vinculado");
    const { data: t } = await supabaseAdmin
      .from("tenants")
      .select("monthly_price, due_day, business_name")
      .eq("id", tenantId)
      .maybeSingle();
    const log = await ensureCurrentMonthLog(tenantId);
    return {
      tenant_id: tenantId,
      monthly_price: Number(t?.monthly_price ?? 0),
      due_day: Number(t?.due_day ?? 10),
      business_name: (t?.business_name as string) ?? "",
      log,
    };
  });

export const registerQrViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantIdForUser(context.userId);
    if (!tenantId) throw new Error("Sem tenant vinculado");
    const log = await ensureCurrentMonthLog(tenantId);
    if (!log.qr_visualizado_em) {
      const { error } = await supabaseAdmin
        .from("payment_logs")
        .update({ qr_visualizado_em: new Date().toISOString() })
        .eq("id", log.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const submitComprovante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ comprovante_url: z.string().min(1).max(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantIdForUser(context.userId);
    if (!tenantId) throw new Error("Sem tenant vinculado");
    const log = await ensureCurrentMonthLog(tenantId);
    const { error } = await supabaseAdmin
      .from("payment_logs")
      .update({
        comprovante_url: data.comprovante_url,
        comprovante_enviado_em: new Date().toISOString(),
        status: "aguardando_conferencia",
        revisado_em: null,
        nota_revisao: null,
      })
      .eq("id", log.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyPaymentHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentLog[]> => {
    const tenantId = await getTenantIdForUser(context.userId);
    if (!tenantId) return [];
    const { data, error } = await supabaseAdmin
      .from("payment_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("mes_referencia", { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    return (data ?? []) as PaymentLog[];
  });

// ============================================================
// Master — billing overview & review
// ============================================================
export type BillingOverviewRow = {
  tenant_id: string;
  business_name: string;
  owner_name: string;
  due_day: number;
  monthly_price: number;
  log: PaymentLog | null;
};

export const listBillingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingOverviewRow[]> => {
    if (!(await isSuperadmin(context.userId))) throw new Error("Acesso negado");
    const mes = firstOfThisMonthIso();
    const [tenantsRes, logsRes] = await Promise.all([
      supabaseAdmin
        .from("tenants")
        .select("id, business_name, owner_name, due_day, monthly_price")
        .order("business_name", { ascending: true }),
      supabaseAdmin.from("payment_logs").select("*").eq("mes_referencia", mes),
    ]);
    if (tenantsRes.error) throw new Error(tenantsRes.error.message);
    if (logsRes.error) throw new Error(logsRes.error.message);
    const byTenant = new Map<string, PaymentLog>();
    for (const l of (logsRes.data ?? []) as PaymentLog[]) byTenant.set(l.tenant_id, l);
    return (tenantsRes.data ?? []).map((t) => ({
      tenant_id: t.id as string,
      business_name: (t.business_name as string) ?? "",
      owner_name: (t.owner_name as string) ?? "",
      due_day: Number(t.due_day ?? 10),
      monthly_price: Number(t.monthly_price ?? 0),
      log: byTenant.get(t.id as string) ?? null,
    }));
  });

export const reviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        log_id: z.string().uuid(),
        decision: z.enum(["pago", "rejeitado"]),
        nota: z.string().trim().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!(await isSuperadmin(context.userId))) throw new Error("Acesso negado");
    const { error } = await supabaseAdmin
      .from("payment_logs")
      .update({
        status: data.decision,
        revisado_em: new Date().toISOString(),
        revisado_por: context.userId,
        nota_revisao: data.nota || null,
      })
      .eq("id", data.log_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getComprovanteSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ path: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await isSuperadmin(context.userId);
    if (!admin) {
      // Tenants can only sign their own files
      const tenantId = await getTenantIdForUser(context.userId);
      if (!tenantId || !data.path.startsWith(`${tenantId}/`))
        throw new Error("Acesso negado");
    }
    const { data: signed, error } = await supabaseAdmin.storage
      .from("comprovantes")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

// ============================================================
// Daily costs (tenant or master via tenant_id IS NULL)
// ============================================================
export type DailyCost = {
  id: string;
  tenant_id: string | null;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: "pendente" | "pago";
  pago_em: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const DailyCostInput = z.object({
  descricao: z.string().trim().min(1).max(200),
  valor: z.number().min(0).max(10_000_000),
  data_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(500).optional().default(""),
});

export const listDailyCosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        scope: z.enum(["master", "tenant"]),
        only_today: z.boolean().optional().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<DailyCost[]> => {
    let q = supabaseAdmin.from("daily_costs").select("*");
    if (data.scope === "master") {
      if (!(await isSuperadmin(context.userId))) throw new Error("Acesso negado");
      q = q.is("tenant_id", null);
    } else {
      const tenantId = await getTenantIdForUser(context.userId);
      if (!tenantId) return [];
      q = q.eq("tenant_id", tenantId);
    }
    if (data.only_today) {
      // Mostra vencendo hoje E atrasadas (ainda pendentes)
      q = q.lte("data_vencimento", todayIso()).eq("status", "pendente");
    }
    q = q.order("data_vencimento", { ascending: true });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as DailyCost[];
  });

export const createDailyCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    DailyCostInput.extend({
      scope: z.enum(["master", "tenant"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let tenant_id: string | null = null;
    if (data.scope === "master") {
      if (!(await isSuperadmin(context.userId))) throw new Error("Acesso negado");
      tenant_id = null;
    } else {
      tenant_id = await getTenantIdForUser(context.userId);
      if (!tenant_id) throw new Error("Sem tenant vinculado");
    }
    const { error } = await supabaseAdmin.from("daily_costs").insert({
      tenant_id,
      descricao: data.descricao,
      valor: data.valor,
      data_vencimento: data.data_vencimento,
      notes: data.notes || null,
      status: "pendente",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateDailyCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    DailyCostInput.partial()
      .extend({ id: z.string().uuid(), status: z.enum(["pendente", "pago"]).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Authorization: superadmin OR tenant owns the row
    const admin = await isSuperadmin(context.userId);
    if (!admin) {
      const { data: row } = await supabaseAdmin
        .from("daily_costs")
        .select("tenant_id")
        .eq("id", data.id)
        .maybeSingle();
      const tenantId = await getTenantIdForUser(context.userId);
      if (!row || row.tenant_id !== tenantId) throw new Error("Acesso negado");
    }
    const patch: {
      descricao?: string;
      valor?: number;
      data_vencimento?: string;
      notes?: string | null;
      status?: "pendente" | "pago";
      pago_em?: string | null;
    } = {};
    if (data.descricao !== undefined) patch.descricao = data.descricao;
    if (data.valor !== undefined) patch.valor = data.valor;
    if (data.data_vencimento !== undefined) patch.data_vencimento = data.data_vencimento;
    if (data.notes !== undefined) patch.notes = data.notes || null;
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.pago_em = data.status === "pago" ? new Date().toISOString() : null;
    }
    const { error } = await supabaseAdmin.from("daily_costs").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDailyCost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await isSuperadmin(context.userId);
    if (!admin) {
      const { data: row } = await supabaseAdmin
        .from("daily_costs")
        .select("tenant_id")
        .eq("id", data.id)
        .maybeSingle();
      const tenantId = await getTenantIdForUser(context.userId);
      if (!row || row.tenant_id !== tenantId) throw new Error("Acesso negado");
    }
    const { error } = await supabaseAdmin.from("daily_costs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });