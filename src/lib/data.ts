import { supabase } from "@/integrations/supabase/client";

export type AppointmentStatus = "a_fazer" | "concluido" | "cancelado";

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  a_fazer: "A fazer",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  client_name: string;
  client_id: string | null;
  procedure: string | null;
  payment_method: string | null;
  amount: number;
  subtotal: number;
  discount: number;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
};

export type Expense = {
  id: string;
  date: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  normalized_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentInput = Omit<
  Appointment,
  "id" | "created_at" | "client_id" | "status" | "subtotal" | "discount"
> & {
  client_id?: string | null;
  status?: AppointmentStatus;
  subtotal?: number;
  discount?: number;
};
export type ExpenseInput = Omit<Expense, "id" | "created_at">;
export type ClientInput = Pick<Client, "name" | "phone" | "email" | "notes">;

const monthRange = (year: number, monthIdx: number) => {
  const start = new Date(year, monthIdx, 1);
  const end = new Date(year, monthIdx + 1, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
};

export async function fetchAppointments(year: number, monthIdx: number): Promise<Appointment[]> {
  const { start, end } = monthRange(year, monthIdx);
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function fetchUpcomingAppointments(): Promise<Appointment[]> {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .gte("date", iso)
    .eq("status", "a_fazer")
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function fetchAppointmentsRange(startISO: string, endISO: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .gte("date", startISO)
    .lte("date", endISO)
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function completeAppointment(
  id: string,
  data: {
    subtotal: number;
    discount: number;
    amount: number;
    payment_method: string;
  },
) {
  const { error } = await supabase
    .from("appointments")
    .update({
      subtotal: data.subtotal,
      discount: data.discount,
      amount: data.amount,
      payment_method: data.payment_method,
      status: "concluido",
    })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchExpenses(year: number, monthIdx: number): Promise<Expense[]> {
  const { start, end } = monthRange(year, monthIdx);
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function createAppointment(input: AppointmentInput) {
  const { error } = await supabase.from("appointments").insert(input);
  if (error) throw error;
}

export async function updateAppointment(id: string, input: AppointmentInput) {
  const { error } = await supabase.from("appointments").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

export async function createExpense(input: ExpenseInput) {
  const { error } = await supabase.from("expenses").insert(input);
  if (error) throw error;
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const { error } = await supabase.from("expenses").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchReceivables(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .ilike("payment_method", "a receber")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function fetchDistinctProcedures(): Promise<string[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("procedure")
    .not("procedure", "is", null)
    .limit(2000);
  if (error) return [];
  const set = new Set<string>();
  (data ?? []).forEach((r: { procedure: string | null }) => {
    if (r.procedure) set.add(r.procedure.trim());
  });
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ===== Clients =====

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function fetchClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Client) ?? null;
}

export async function fetchClientHistory(clientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .order("time", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function updateClient(id: string, input: ClientInput) {
  const { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export type ClientStats = {
  client: Client;
  visits: number;
  total: number;
  lastDate: string | null;
};

export async function fetchClientsWithStats(): Promise<ClientStats[]> {
  const [clientsRes, apptsRes] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase
      .from("appointments")
      .select("client_id, amount, date")
      .not("client_id", "is", null),
  ]);
  if (clientsRes.error) throw clientsRes.error;
  if (apptsRes.error) throw apptsRes.error;

  const stats = new Map<string, { visits: number; total: number; lastDate: string | null }>();
  (apptsRes.data ?? []).forEach((a: { client_id: string | null; amount: number; date: string }) => {
    if (!a.client_id) return;
    const s = stats.get(a.client_id) ?? { visits: 0, total: 0, lastDate: null };
    s.visits += 1;
    s.total += Number(a.amount || 0);
    if (!s.lastDate || a.date > s.lastDate) s.lastDate = a.date;
    stats.set(a.client_id, s);
  });

  return (clientsRes.data as Client[])
    .map((c) => {
      const s = stats.get(c.id) ?? { visits: 0, total: 0, lastDate: null };
      return { client: c, ...s };
    })
    .sort((a, b) => {
      if (a.lastDate && b.lastDate) return b.lastDate.localeCompare(a.lastDate);
      if (a.lastDate) return -1;
      if (b.lastDate) return 1;
      return a.client.name.localeCompare(b.client.name, "pt-BR");
    });
}
