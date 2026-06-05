import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search } from "lucide-react";
import {
  fetchAppointmentsRange, fetchDistinctProcedures, fetchClients, createAppointment,
  updateAppointment, deleteAppointment, type Appointment,
} from "@/lib/data";
import { getContactSettings } from "@/lib/settings.functions";
import { formatBRL } from "@/lib/format";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { AppointmentsCalendar } from "@/components/AppointmentsCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/atendimentos")({
  head: () => ({ meta: [{ title: "Atendimentos — Studio Taiane Oliveira" }] }),
  component: AtendimentosPage,
});

type ViewMode = "month" | "week" | "day";

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d: Date) => addDays(d, -d.getDay());

function rangeFor(view: ViewMode, cursor: Date): { start: string; end: string } {
  if (view === "day") {
    const iso = toISO(cursor);
    return { start: iso, end: iso };
  }
  if (view === "week") {
    const s = startOfWeek(cursor);
    return { start: toISO(s), end: toISO(addDays(s, 6)) };
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  return { start: toISO(startOfWeek(first)), end: toISO(addDays(startOfWeek(last), 6)) };
}

function AtendimentosPage() {
  const [cursor, setCursor] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const qc = useQueryClient();
  const { start, end } = rangeFor(view, cursor);

  const apptsQ = useQuery({
    queryKey: ["appts-range", start, end],
    queryFn: () => fetchAppointmentsRange(start, end),
  });
  const procsQ = useQuery({
    queryKey: ["procedures"],
    queryFn: fetchDistinctProcedures,
  });
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const fetchSettings = useServerFn(getContactSettings);
  const { isAuthed } = useAuthReady();
  const settingsQ = useQuery({
    queryKey: ["contact-settings"],
    queryFn: () => fetchSettings(),
    retry: false,
    enabled: isAuthed,
  });

  const phonesByClientId = useMemo(() => {
    const m = new Map<string, string>();
    (clientsQ.data ?? []).forEach((c) => {
      if (c.phone) m.set(c.id, c.phone);
    });
    return m;
  }, [clientsQ.data]);

  const filtered = useMemo(() => {
    const list = apptsQ.data ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (a) =>
        a.client_name.toLowerCase().includes(q) ||
        (a.procedure ?? "").toLowerCase().includes(q),
    );
  }, [apptsQ.data, search]);

  const total = useMemo(
    () => (apptsQ.data ?? []).reduce((s, a) => s + Number(a.amount || 0), 0),
    [apptsQ.data],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["appts-range"] });
    qc.invalidateQueries({ queryKey: ["appts"] });
    qc.invalidateQueries({ queryKey: ["procedures"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["clients-stats"] });
  };

  const handleMove = async (a: Appointment, newDate: string) => {
    try {
      await updateAppointment(a.id, {
        date: newDate,
        time: a.time,
        client_name: a.client_name,
        client_id: a.client_id,
        procedure: a.procedure,
        payment_method: a.payment_method,
        amount: Number(a.amount),
        subtotal: Number(a.subtotal),
        discount: Number(a.discount),
        notes: a.notes,
        status: a.status,
      });
      toast.success("Atendimento remanejado");
      invalidate();
    } catch {
      toast.error("Erro ao mover");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Atendimentos</h2>
          <p className="text-sm text-muted-foreground">
            {apptsQ.data?.length ?? 0} no período · {formatBRL(total)}
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="hidden sm:inline-flex"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo atendimento
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Procurar por cliente ou procedimento"
          className="pl-9 bg-card"
        />
      </div>

      <AppointmentsCalendar
        appointments={filtered}
        cursor={cursor}
        onCursorChange={setCursor}
        view={view}
        onViewChange={setView}
        onCardClick={(a) => { setEditing(a); setDialogOpen(true); }}
        onMove={handleMove}
        phonesByClientId={phonesByClientId}
        whatsappTemplate={settingsQ.data?.whatsapp_message_template ?? ""}
      />

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <LegendDot className="bg-card border-primary/40" /> Agendado
        <LegendDot className="bg-accent/70 border-accent" /> A Receber
        <LegendDot className="bg-success/20 border-success/50" /> Concluído
        <LegendDot className="bg-muted/70 border-border" /> Cancelado
      </div>

      {/* Floating add button (mobile) */}
      <Button
        onClick={() => { setEditing(null); setDialogOpen(true); }}
        className="sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg p-0"
        aria-label="Novo atendimento"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        procedureSuggestions={procsQ.data}
        onSubmit={async (data) => {
          try {
            if (editing) {
              await updateAppointment(editing.id, data);
              toast.success("Atendimento atualizado");
            } else {
              await createAppointment(data);
              toast.success("Atendimento adicionado");
            }
            invalidate();
          } catch (e: any) {
            const msg = e?.message || e?.error_description || "Erro desconhecido";
            toast.error(`Erro ao guardar: ${msg}`);
            console.error("[atendimento save]", e);
            throw e;
          }
        }}
        onDelete={
          editing
            ? async () => {
                try {
                  await deleteAppointment(editing.id);
                  toast.success("Atendimento apagado");
                  invalidate();
                } catch {
                  toast.error("Erro ao apagar");
                }
              }
            : undefined
        }
      />
    </div>
  );
}

function LegendDot({ className }: { className: string }) {
  return <span className={`inline-block h-3 w-3 rounded-sm border ${className}`} />;
}
