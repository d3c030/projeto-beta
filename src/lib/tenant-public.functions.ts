import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PublicTenant = {
  id: string;
  slug: string;
  business_name: string;
  logo_url: string;
  theme: string;
  primary_color: string;
  instagram_url: string;
  whatsapp: string;
  pix_key: string;
  pix_copia_cola: string;
  pix_qr_url: string;
  status: "ativo" | "inadimplente" | "suspenso";
};

// Public endpoint: white-label fields only. No PII.
export const getTenantBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data }): Promise<PublicTenant | null> => {
    const { data: t, error } = await supabaseAdmin
      .from("tenants")
      .select(
        "id, slug, business_name, logo_url, theme, primary_color, instagram_url, whatsapp, pix_key, pix_copia_cola, pix_qr_url, status",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) return null;
    return t as PublicTenant;
  });