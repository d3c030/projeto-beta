import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ReferralStatus = "novo" | "contatado" | "em_negociacao" | "fechado" | "perdido";

export type Referral = {
  id: string;
  tenant_id: string;
  referrer_user_id: string | null;
  referrer_name: string;
  referred_name: string;
  referred_whatsapp: string;
  status: ReferralStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ReferralWithTenant = Referral & {
  tenant_business_name: string | null;
};

async function assertSuperadmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

export const createReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        referred_name: z.string().trim().min(2).max(120),
        referred_whatsapp: z
          .string()
          .trim()
          .min(10)
          .max(20)
          .regex(/^[0-9]+$/, "Apenas dígitos"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: prof, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id, display_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prof?.tenant_id) throw new Error("Você precisa estar vinculado a um cliente para indicar.");

    let referrerName = (prof.display_name as string) || "";
    if (!referrerName) {
      const { data: t } = await supabaseAdmin
        .from("tenants")
        .select("business_name, owner_name")
        .eq("id", prof.tenant_id)
        .maybeSingle();
      referrerName = (t?.owner_name as string) || (t?.business_name as string) || "";
    }

    const { error } = await supabaseAdmin.from("referrals").insert({
      tenant_id: prof.tenant_id,
      referrer_user_id: userId,
      referrer_name: referrerName,
      referred_name: data.referred_name,
      referred_whatsapp: data.referred_whatsapp,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Referral[]> => {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!prof?.tenant_id) return [];
    const { data, error } = await supabaseAdmin
      .from("referrals")
      .select("*")
      .eq("tenant_id", prof.tenant_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Referral[];
  });

export const listAllReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReferralWithTenant[]> => {
    await assertSuperadmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Referral[];
    const tenantIds = Array.from(new Set(list.map((r) => r.tenant_id)));
    const tenantMap = new Map<string, string>();
    if (tenantIds.length) {
      const { data: tenants } = await supabaseAdmin
        .from("tenants")
        .select("id, business_name")
        .in("id", tenantIds);
      for (const t of tenants ?? []) {
        tenantMap.set(t.id as string, (t.business_name as string) ?? "");
      }
    }
    return list.map((r) => ({
      ...r,
      tenant_business_name: tenantMap.get(r.tenant_id) ?? null,
    }));
  });

export const updateReferralStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["novo", "contatado", "em_negociacao", "fechado", "perdido"]),
        notes: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);
    const patch: Record<string, unknown> = { status: data.status };
    if (typeof data.notes === "string") patch.notes = data.notes;
    const { error } = await supabaseAdmin.from("referrals").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);
    const { error } = await supabaseAdmin.from("referrals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });