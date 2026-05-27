import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function resolveTenantId(slug?: string | null): Promise<string | null> {
  if (!slug) return null;
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.id as string | undefined) ?? null;
}

// Public endpoint: returns only date + time of booked slots within a month.
// No PII (no client name, procedure, amount, etc.).
export const getBookedSlots = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        year: z.number().int().min(2024).max(2100),
        month: z.number().int().min(1).max(12), // 1-12
        tenant_slug: z.string().trim().min(1).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const start = new Date(Date.UTC(data.year, data.month - 1, 1));
    const end = new Date(Date.UTC(data.year, data.month, 1));
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    let query = supabaseAdmin
      .from("appointments")
      .select("date, time")
      .gte("date", fmt(start))
      .lt("date", fmt(end));
    const tenantId = await resolveTenantId(data.tenant_slug);
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data: rows, error } = await query;

    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      date: r.date as string,
      time: (r.time as string | null) ?? null,
    }));
  });

// Public endpoint: returns manual open/closed overrides for the month.
export const getAgendaOverrides = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        year: z.number().int().min(2024).max(2100),
        month: z.number().int().min(1).max(12),
        tenant_slug: z.string().trim().min(1).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const start = new Date(Date.UTC(data.year, data.month - 1, 1));
    const end = new Date(Date.UTC(data.year, data.month, 1));
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    let query = supabaseAdmin
      .from("agenda_days")
      .select("date, is_open")
      .gte("date", fmt(start))
      .lt("date", fmt(end));
    const tenantId = await resolveTenantId(data.tenant_slug);
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data: rows, error } = await query;

    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      date: r.date as string,
      is_open: r.is_open as boolean,
    }));
  });
