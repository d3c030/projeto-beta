import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const THEMES = ["rosa", "azul", "preto", "branco"] as const;
export type ThemeName = (typeof THEMES)[number];

export type ContactSettings = {
  id: string | null;
  instagram_url: string;
  whatsapp_phone: string;
  logo_url: string;
  theme: ThemeName;
  pix_key: string;
  pix_copia_cola: string;
  pix_qr_url: string;
};

const isTheme = (v: unknown): v is ThemeName =>
  typeof v === "string" && (THEMES as readonly string[]).includes(v);

// Tenant-scoped: reads from the current user's tenant row only.
// Never returns data from another tenant.
export const getContactSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContactSettings> => {
    const userId = context.userId;
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const tenantId = (profile?.tenant_id as string | undefined) ?? null;
    if (!tenantId) {
      return {
        id: null,
        instagram_url: "",
        whatsapp_phone: "",
        logo_url: "",
        theme: "rosa",
        pix_key: "",
        pix_copia_cola: "",
        pix_qr_url: "",
      };
    }
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, instagram_url, whatsapp, logo_url, theme, pix_key, pix_copia_cola, pix_qr_url")
      .eq("id", tenantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: (data?.id as string | undefined) ?? null,
      instagram_url: (data?.instagram_url as string | undefined) ?? "",
      whatsapp_phone: (data?.whatsapp as string | undefined) ?? "",
      logo_url: (data?.logo_url as string | undefined) ?? "",
      theme: isTheme(data?.theme) ? (data!.theme as ThemeName) : "rosa",
      pix_key: (data?.pix_key as string | undefined) ?? "",
      pix_copia_cola: (data?.pix_copia_cola as string | undefined) ?? "",
      pix_qr_url: (data?.pix_qr_url as string | undefined) ?? "",
    };
  });

export const updateContactSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        instagram_url: z
          .string()
          .trim()
          .max(255)
          .url({ message: "URL inválida" })
          .or(z.literal("")),
        whatsapp_phone: z
          .string()
          .trim()
          .max(20)
          .regex(/^[0-9]*$/, "Apenas dígitos (com DDI e DDD)"),
        logo_url: z.string().trim().max(500).url().or(z.literal("")).optional(),
        theme: z.enum(THEMES).optional(),
        pix_key: z.string().trim().max(255).optional(),
        pix_copia_cola: z.string().trim().max(2000).optional(),
        pix_qr_url: z.string().trim().max(500).url().or(z.literal("")).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    // Resolve the user's tenant — write is allowed ONLY to that row.
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const tenantId = (profile?.tenant_id as string | undefined) ?? null;
    if (!tenantId) throw new Error("Usuário sem tenant associado.");

    const patch: {
      instagram_url: string;
      whatsapp: string;
      logo_url?: string;
      theme?: string;
      pix_key?: string;
      pix_copia_cola?: string;
      pix_qr_url?: string;
    } = {
      instagram_url: data.instagram_url,
      whatsapp: data.whatsapp_phone,
    };
    if (data.logo_url !== undefined) patch.logo_url = data.logo_url;
    if (data.theme !== undefined) patch.theme = data.theme;
    if (data.pix_key !== undefined) patch.pix_key = data.pix_key;
    if (data.pix_copia_cola !== undefined) patch.pix_copia_cola = data.pix_copia_cola;
    if (data.pix_qr_url !== undefined) patch.pix_qr_url = data.pix_qr_url;

    const { error } = await supabaseAdmin
      .from("tenants")
      .update(patch)
      .eq("id", tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
