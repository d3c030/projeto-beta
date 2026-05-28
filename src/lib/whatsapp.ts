import type { Appointment } from "@/lib/data";
import { formatDateBR } from "@/lib/format";

export const DEFAULT_WHATSAPP_TEMPLATE =
  "Olá {cliente}! Passando para confirmar o seu atendimento em {data} às {horario}. Qualquer dúvida estou à disposição. 💖";

/** Normaliza um número de telefone para o formato aceito pelo wa.me (apenas dígitos com DDI). */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Se vier sem DDI, assume Brasil (55)
  if (digits.length <= 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 15) return null;
  return digits;
}

export function renderWhatsAppMessage(
  template: string,
  appt: Pick<Appointment, "client_name" | "date" | "time" | "procedure">,
): string {
  const tpl = (template && template.trim()) || DEFAULT_WHATSAPP_TEMPLATE;
  return tpl
    .replaceAll("{cliente}", appt.client_name ?? "")
    .replaceAll("{data}", appt.date ? formatDateBR(appt.date) : "")
    .replaceAll("{horario}", appt.time?.slice(0, 5) ?? "")
    .replaceAll("{procedimento}", appt.procedure ?? "");
}

export function buildWhatsAppLink(
  phone: string,
  template: string,
  appt: Pick<Appointment, "client_name" | "date" | "time" | "procedure">,
): string | null {
  const num = normalizeWhatsAppNumber(phone);
  if (!num) return null;
  const text = encodeURIComponent(renderWhatsAppMessage(template, appt));
  return `https://wa.me/${num}?text=${text}`;
}