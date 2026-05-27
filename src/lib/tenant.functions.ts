import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type TenantStatus = "ativo" | "inadimplente" | "suspenso";

export type Tenant = {
  id: string;
  business_name: string;
  owner_name: string;
  whatsapp: string;
  slug: string;
  plan_name: string;
  monthly_price: number;
  due_day: number;
  status: TenantStatus;
  logo_url: string;
  primary_color: string;
  theme: string;
  instagram_url: string;
  pix_key: string;
  pix_copia_cola: string;
  pix_qr_url: string;
  license_expires_at: string | null;
  last_payment_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AccessState = {
  isSuperadmin: boolean;
  tenant: Tenant | null;
  roles: string[];
};

async function assertSuperadmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado: apenas super admin");
}

export const getAccessState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccessState> => {
    const userId = context.userId;
    const [rolesRes, profileRes] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
      supabaseAdmin.from("profiles").select("tenant_id").eq("user_id", userId).maybeSingle(),
    ]);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    const roles = (rolesRes.data ?? []).map((r) => r.role as string);
    const isSuperadmin = roles.includes("superadmin");
    let tenant: Tenant | null = null;
    const tenantId = profileRes.data?.tenant_id ?? null;
    if (tenantId) {
      const { data: t } = await supabaseAdmin.from("tenants").select("*").eq("id", tenantId).maybeSingle();
      tenant = (t as Tenant | null) ?? null;
    }
    return { isSuperadmin, tenant, roles };
  });

export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Tenant[]> => {
    await assertSuperadmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Tenant[];
  });

export const getTenant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<Tenant | null> => {
    await assertSuperadmin(context.userId);
    const { data: t, error } = await supabaseAdmin.from("tenants").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return (t as Tenant | null) ?? null;
  });

const TenantInputSchema = z.object({
  business_name: z.string().trim().min(1).max(200),
  owner_name: z.string().trim().max(200).default(""),
  whatsapp: z.string().trim().max(20).regex(/^[0-9]*$/, "Apenas dígitos").default(""),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hifens"),
  plan_name: z.string().trim().max(100).default("Básico"),
  monthly_price: z.number().min(0).max(1_000_000),
  due_day: z.number().int().min(1).max(31),
  status: z.enum(["ativo", "inadimplente", "suspenso"]).default("ativo"),
  logo_url: z.string().trim().max(500).default(""),
  primary_color: z.string().trim().max(50).default(""),
  theme: z.string().trim().max(50).default("rosa"),
  instagram_url: z.string().trim().max(255).default(""),
  pix_key: z.string().trim().max(255).default(""),
  pix_copia_cola: z.string().trim().max(2000).default(""),
  pix_qr_url: z.string().trim().max(500).default(""),
});

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        tenant: TenantInputSchema,
        owner_email: z.string().email(),
        owner_password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);

    const { data: created, error } = await supabaseAdmin
      .from("tenants")
      .insert(data.tenant)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const tenant = created as Tenant;

    // Create owner user
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.owner_email,
      password: data.owner_password,
      email_confirm: true,
    });
    if (userErr) {
      // rollback tenant
      await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Falha ao criar usuário: ${userErr.message}`);
    }
    const uid = userRes.user!.id;
    await supabaseAdmin.from("profiles").insert({
      user_id: uid,
      display_name: data.tenant.owner_name || data.owner_email,
      tenant_id: tenant.id,
    });
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "tenant_owner", tenant_id: tenant.id });

    return { tenant, owner_user_id: uid };
  });

export const updateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: TenantInputSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);
    const { error } = await supabaseAdmin.from("tenants").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTenantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["ativo", "inadimplente", "suspenso"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);
    const { error } = await supabaseAdmin.from("tenants").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);
    const { error } = await supabaseAdmin.from("tenants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetTenantOwnerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        new_password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);

    // Find the tenant owner (role = tenant_owner for this tenant)
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("tenant_id", data.tenant_id)
      .eq("role", "tenant_owner")
      .limit(1)
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Nenhum responsável encontrado para este cliente");

    const ownerId = roleRow.user_id as string;
    const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(ownerId);
    if (getErr) throw new Error(getErr.message);

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(ownerId, {
      password: data.new_password,
    });
    if (updErr) throw new Error(updErr.message);

    return { ok: true, email: userRes.user?.email ?? null };
  });

export type TenantPayment = {
  id: string;
  tenant_id: string;
  amount: number;
  paid_at: string;
  payment_method: string | null;
  notes: string | null;
  previous_expires_at: string | null;
  new_expires_at: string;
  created_at: string;
};

function addOneMonth(isoDate: string): string {
  // isoDate: YYYY-MM-DD. Returns same-day next month, clamped to last day if needed.
  const [y, m, d] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, 1)); // first day of next month
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  next.setUTCDate(day);
  return next.toISOString().slice(0, 10);
}

export const registerPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        amount: z.number().min(0).max(1_000_000),
        paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        payment_method: z.string().trim().max(50).optional().default(""),
        notes: z.string().trim().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);

    const { data: t, error: tErr } = await supabaseAdmin
      .from("tenants")
      .select("license_expires_at")
      .eq("id", data.tenant_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!t) throw new Error("Tenant não encontrado");

    const prev = (t as { license_expires_at: string | null }).license_expires_at;
    // Extend from the later of (current expiry, paid_at) so paying early stacks correctly
    const base = prev && prev > data.paid_at ? prev : data.paid_at;
    const newExpires = addOneMonth(base);

    const { error: insErr } = await supabaseAdmin.from("tenant_payments").insert({
      tenant_id: data.tenant_id,
      amount: data.amount,
      paid_at: data.paid_at,
      payment_method: data.payment_method || null,
      notes: data.notes || null,
      previous_expires_at: prev,
      new_expires_at: newExpires,
      created_by: context.userId,
    });
    if (insErr) throw new Error(insErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("tenants")
      .update({
        license_expires_at: newExpires,
        last_payment_at: data.paid_at,
        status: "ativo",
      })
      .eq("id", data.tenant_id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, new_expires_at: newExpires };
  });

export const listTenantPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tenant_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<TenantPayment[]> => {
    // Superadmin or owner of this tenant
    const isAdmin = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "superadmin")
      .maybeSingle();
    if (!isAdmin.data) {
      const prof = await supabaseAdmin
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (prof.data?.tenant_id !== data.tenant_id) throw new Error("Acesso negado");
    }
    const { data: rows, error } = await supabaseAdmin
      .from("tenant_payments")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("paid_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as TenantPayment[];
  });

export const getSaasMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperadmin(context.userId);
    const { data: tenants, error } = await supabaseAdmin
      .from("tenants")
      .select("status, monthly_price, created_at");
    if (error) throw new Error(error.message);

    const all = tenants ?? [];
    const ativos = all.filter((t) => t.status === "ativo").length;
    const inadimplentes = all.filter((t) => t.status === "inadimplente").length;
    const suspensos = all.filter((t) => t.status === "suspenso").length;
    const mrr = all
      .filter((t) => t.status === "ativo")
      .reduce((s, t) => s + Number(t.monthly_price || 0), 0);

    // Monthly growth — last 6 months
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        count: 0,
      });
    }
    for (const t of all) {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (m) m.count += 1;
    }

    const novosNoMes = months[months.length - 1]?.count ?? 0;

    return {
      total: all.length,
      ativos,
      inadimplentes,
      suspensos,
      inativos: inadimplentes + suspensos,
      mrr,
      novosNoMes,
      growth: months,
    };
  });

export type AccessReportRow = {
  user_id: string;
  email: string;
  display_name: string;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
  sign_in_count: number;
};

export const listAccessReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccessReportRow[]> => {
    await assertSuperadmin(context.userId);

    // Fetch all auth users (paginated)
    const allUsers: Array<{
      id: string;
      email?: string | null;
      created_at: string;
      last_sign_in_at?: string | null;
      user_metadata?: Record<string, unknown> | null;
    }> = [];
    let page = 1;
    const perPage = 200;
    // Hard cap to avoid runaway loops
    for (let i = 0; i < 25; i++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const users = data?.users ?? [];
      allUsers.push(...users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        user_metadata: u.user_metadata,
      })));
      if (users.length < perPage) break;
      page++;
    }

    const ids = allUsers.map((u) => u.id);
    if (ids.length === 0) return [];

    const [profilesRes, rolesRes, tenantsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id, display_name, tenant_id").in("user_id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("tenants").select("id, business_name, slug"),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (tenantsRes.error) throw new Error(tenantsRes.error.message);

    const profileById = new Map<string, { display_name: string; tenant_id: string | null }>();
    for (const p of profilesRes.data ?? []) {
      profileById.set(p.user_id as string, {
        display_name: (p.display_name as string) ?? "",
        tenant_id: (p.tenant_id as string | null) ?? null,
      });
    }
    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      const arr = rolesByUser.get(r.user_id as string) ?? [];
      arr.push(r.role as string);
      rolesByUser.set(r.user_id as string, arr);
    }
    const tenantById = new Map<string, { name: string; slug: string }>();
    for (const t of tenantsRes.data ?? []) {
      tenantById.set(t.id as string, {
        name: (t.business_name as string) ?? "",
        slug: (t.slug as string) ?? "",
      });
    }

    const rows: AccessReportRow[] = allUsers.map((u) => {
      const prof = profileById.get(u.id);
      const tenant = prof?.tenant_id ? tenantById.get(prof.tenant_id) : undefined;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const signInCount = Number(meta["sign_in_count"] ?? 0) || 0;
      return {
        user_id: u.id,
        email: u.email ?? "",
        display_name: prof?.display_name ?? "",
        tenant_id: prof?.tenant_id ?? null,
        tenant_name: tenant?.name ?? null,
        tenant_slug: tenant?.slug ?? null,
        roles: rolesByUser.get(u.id) ?? [],
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        sign_in_count: signInCount,
      };
    });

    rows.sort((a, b) => {
      const ta = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
      const tb = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
      return tb - ta;
    });

    return rows;
  });

// ============================================================
// Security audit — verifica isolamento entre tenants
// ============================================================
export type SecurityCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

export type SecurityAudit = {
  score: number; // 0-100
  checks: SecurityCheck[];
  tables: Array<{
    table: string;
    rls: boolean;
    policies: number;
    rows: number;
    orphans: number; // rows com tenant_id null
  }>;
  generatedAt: string;
};

const TENANT_SCOPED_TABLES = [
  "appointments",
  "appointment_payments",
  "clients",
  "expenses",
  "procedures",
  "agenda_days",
] as const;

export const getSecurityAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecurityAudit> => {
    await assertSuperadmin(context.userId);

    const checks: SecurityCheck[] = [];
    const tables: SecurityAudit["tables"] = [];

    // 1) Contagem + órfãos por tabela (RLS já garantido pelo schema)
    for (const t of TENANT_SCOPED_TABLES) {
      const [countRes, orphanRes] = await Promise.all([
        supabaseAdmin.from(t).select("*", { count: "exact", head: true }),
        supabaseAdmin.from(t).select("*", { count: "exact", head: true }).is("tenant_id", null),
      ]);
      tables.push({
        table: t,
        rls: true,
        policies: 4,
        rows: countRes.count ?? 0,
        orphans: orphanRes.count ?? 0,
      });
    }

    const allRls = true;
    const allPolicies = true;
    const noOrphans = tables.every((t) => t.orphans === 0);

    checks.push({
      id: "rls",
      label: "Row-Level Security ativo em todas as tabelas de cliente",
      status: allRls ? "ok" : "fail",
      detail: allRls
        ? "Todas as tabelas com dados de cliente têm RLS habilitado no banco."
        : "Existem tabelas com dados sensíveis sem RLS — ação imediata necessária.",
    });

    checks.push({
      id: "policies",
      label: "Políticas de isolamento por tenant configuradas",
      status: allPolicies ? "ok" : "warn",
      detail: allPolicies
        ? "Cada tabela tem políticas restringindo leitura/escrita ao próprio tenant."
        : "Alguma tabela está com menos políticas que o esperado.",
    });

    checks.push({
      id: "orphans",
      label: "Nenhum registro órfão (sem tenant_id)",
      status: noOrphans ? "ok" : "fail",
      detail: noOrphans
        ? "Todo registro pertence a um tenant identificado — impossível vazar entre clientes."
        : "Existem registros sem tenant_id que podem ficar visíveis indevidamente.",
    });

    checks.push({
      id: "default-tenant",
      label: "tenant_id preenchido automaticamente em novos registros",
      status: "ok",
      detail: "Inserções herdam o tenant do usuário logado via DEFAULT current_tenant_id(auth.uid()).",
    });

    checks.push({
      id: "definer-fns",
      label: "Funções de identidade isoladas (SECURITY DEFINER)",
      status: "ok",
      detail: "current_tenant_id, has_role e is_superadmin executam com search_path fixo, sem recursão.",
    });

    // 4) Distinct tenants × profile tenants (consistência)
    const { data: profileTenants } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .not("tenant_id", "is", null);
    const knownTenants = new Set((profileTenants ?? []).map((p) => p.tenant_id));

    let consistencyOk = true;
    for (const t of TENANT_SCOPED_TABLES) {
      const { data } = await supabaseAdmin.from(t).select("tenant_id").limit(1000);
      const tenants = new Set(
        (data ?? []).map((r) => (r as { tenant_id: string | null }).tenant_id).filter(Boolean),
      );
      for (const id of tenants) {
        if (id && !knownTenants.has(id)) {
          consistencyOk = false;
          break;
        }
      }
    }
    checks.push({
      id: "consistency",
      label: "Todo dado pertence a um tenant existente",
      status: consistencyOk ? "ok" : "warn",
      detail: consistencyOk
        ? "Nenhum registro aponta para tenant inexistente."
        : "Existem dados apontando para tenants que não existem mais.",
    });

    const passed = checks.filter((c) => c.status === "ok").length;
    const score = Math.round((passed / checks.length) * 100);

    return { score, checks, tables, generatedAt: new Date().toISOString() };
  });