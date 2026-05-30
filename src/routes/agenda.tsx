import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Check, X, RotateCcw, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isClosedDay, isoFromDate } from "@/lib/booking-config";
import { MONTHS_PT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — gestão de dias" }] }),
  component: AgendaPage,
});

type Override = { id: string; date: string; is_open: boolean; note: string | null };

function AgendaPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const qc = useQueryClient();

  const startISO = isoFromDate(new Date(year, month, 1));
  const endISO = isoFromDate(new Date(year, month + 1, 1));

  const q = useQuery({
    queryKey: ["agenda-days", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_days")
        .select("id, date, is_open, note")
        .gte("date", startISO)
        .lt("date", endISO);
      if (error) throw error;
      return (data ?? []) as Override[];
    },
  });

  const overridesMap = useMemo(() => {
    const m = new Map<string, Override>();
    (q.data ?? []).forEach((o) => m.set(o.date, o));
    return m;
  }, [q.data]);

  const upsert = useMutation({
    mutationFn: async ({ date, is_open }: { date: string; is_open: boolean }) => {
      const { error } = await supabase
        .from("agenda_days")
        .upsert({ date, is_open }, { onConflict: "tenant_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-days"] });
      qc.invalidateQueries({ queryKey: ["public-agenda-overrides"] });
      toast.success("Agenda atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase.from("agenda_days").delete().eq("date", date);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-days"] });
      qc.invalidateQueries({ queryKey: ["public-agenda-overrides"] });
      toast.success("Voltou ao padrão");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => (month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1));
  const nextMonth = () => (month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1));

  const effectiveOpen = (d: Date) => {
    const iso = isoFromDate(d);
    const ov = overridesMap.get(iso);
    if (ov) return ov.is_open;
    return !isClosedDay(d);
  };

  const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-display">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Clique em um dia para alternar entre aberto e fechado. O padrão é aberto de terça a sábado.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-card border border-border shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary" aria-label="Mês anterior">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="font-display text-lg capitalize">{MONTHS_PT[month]} {year}</div>
          <button onClick={nextMonth} className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary" aria-label="Próximo mês">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-muted-foreground">
          {weekdays.map((w, i) => <div key={i}>{w}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const iso = isoFromDate(d);
            const ov = overridesMap.get(iso);
            const open = effectiveOpen(d);
            const isToday = iso === isoFromDate(today);
            const defaultClosed = isClosedDay(d);

            return (
              <button
                key={i}
                onClick={() => upsert.mutate({ date: iso, is_open: !open })}
                disabled={upsert.isPending}
                title={ov ? `Manual: ${open ? "aberto" : "fechado"}` : `Padrão: ${open ? "aberto" : "fechado"}`}
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium relative transition-all touch-manipulation",
                  open
                    ? "bg-primary/15 hover:bg-primary/25 text-foreground"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground line-through",
                  isToday && "ring-2 ring-primary",
                )}
              >
                <span>{d.getDate()}</span>
                {ov && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" aria-label="Personalizado" />
                )}
                {defaultClosed && !ov && (
                  <span className="text-[9px] uppercase opacity-60">fechado</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary/30" /> Aberto</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted" /> Fechado</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Marcado manualmente</span>
        </div>
      </div>

      {/* Lista de marcações manuais */}
      <div className="rounded-3xl bg-card border border-border shadow-sm p-4 sm:p-6">
        <h2 className="font-display text-lg mb-3">Marcações manuais no mês</h2>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (q.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma marcação manual — todos os dias seguem o padrão.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(q.data ?? [])
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((o) => {
                const d = new Date(o.date + "T00:00:00");
                const label = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                return (
                  <li key={o.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {o.is_open ? (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm capitalize truncate">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {o.is_open ? "aberto" : "fechado"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove.mutate(o.date)}
                      disabled={remove.isPending}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Padrão
                    </Button>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}
