import { supabase } from "@/integrations/supabase/client";

export type Procedure = {
  id: string;
  name: string;
  default_price: number;
  estimated_minutes: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProcedureInput = {
  name: string;
  default_price: number;
  estimated_minutes: number;
  sort_order?: number;
};

export async function fetchProcedures(): Promise<Procedure[]> {
  const { data, error } = await supabase
    .from("procedures")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Procedure[];
}

export async function createProcedure(input: ProcedureInput) {
  const { error } = await supabase.from("procedures").insert(input);
  if (error) throw error;
}

export async function updateProcedure(id: string, input: ProcedureInput) {
  const { error } = await supabase.from("procedures").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteProcedure(id: string) {
  const { error } = await supabase.from("procedures").delete().eq("id", id);
  if (error) throw error;
}

export const PROCEDURE_SEPARATOR = " + ";

export function splitProcedureNames(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(PROCEDURE_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinProcedureNames(names: string[]): string {
  return names.map((n) => n.trim()).filter(Boolean).join(PROCEDURE_SEPARATOR);
}
