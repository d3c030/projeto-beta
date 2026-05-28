import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import type { Appointment } from "@/lib/data";
import { formatBRL } from "@/lib/format";
import { splitProcedureNames } from "@/lib/procedures";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ViewMode = "month" | "week" | "day";

type Props = {
  appointments: Appointment[];
  cursor: Date;
  onCursorChange: (d: Date) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onCardClick: (a: Appointment) => void;
  onMove: (a: Appointment, newDate: string) => Promise<void> | void;
  /** Map clientId -> telefone (para o atalho do WhatsApp nos cards "a fazer"). */
  phonesByClientId?: Map<string, string>;
  /** Template configurado em Configurações. */
  whatsappTemplate?: string;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const startOfWeek = (d: Date) => addDays(d, -d.getDay());

const statusClasses = (a: Appointment) => {
  if (a.status === "concluido")
    return "bg-success/15 border-success/40 hover:bg-success/25";
  if (a.status === "cancelado")
    return "bg-muted/70 border-border text-muted-foreground line-through hover:bg-muted";
  if ((a.payment_method ?? "").toLowerCase() === "a receber")
    return "bg-accent/70 border-accent hover:bg-accent";
  return "bg-card border-primary/30 hover:bg-secondary";
};

function AppointmentCard({
  a,
  compact,
  onClick,
  waHref,
}: {
  a: Appointment;
  compact?: boolean;
  onClick: () => void;
  waHref?: string | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: a.id,
    data: { appointment: a },
  });

  const procs = splitProcedureNames(a.procedure);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "group cursor-grab active:cursor-grabbing rounded-md border px-2 py-1.5 text-left transition-colors shadow-sm",
        statusClasses(a),
        isDragging && "opacity-30",
        compact ? "text-[11px]" : "text-xs",
      )}
      style={{ touchAction: "none" }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-medium tabular-nums text-primary">
          {a.time?.slice(0, 5) ?? "--:--"}
        </span>
        <div className="flex items-center gap-1">
          {waHref && a.status === "a_fazer" && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366] text-white hover:opacity-90"
              title="Enviar WhatsApp ao cliente"
              aria-label="Enviar WhatsApp ao cliente"
            >
              <MessageCircle className="h-3 w-3" />
            </a>
          )}
          <span className="font-semibold tabular-nums">
            {formatBRL(Number(a.amount))}
          </span>
        </div>
      </div>
      <div className="truncate font-medium">{a.client_name}</div>
      {procs.length > 0 && !compact && (
        <div className="mt-1 flex flex-wrap gap-1">
          {procs.slice(0, 3).map((p) => (
            <span
              key={p}
              className="inline-block rounded-full bg-background/70 border border-border/60 px-1.5 py-px text-[10px] leading-tight"
            >
              {p}
            </span>
          ))}
          {procs.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{procs.length - 3}
            </span>
          )}
        </div>
      )}
      {procs.length > 0 && compact && (
        <div className="truncate text-[10px] text-muted-foreground">
          {procs.join(" · ")}
        </div>
      )}
    </div>
  );
}

function DayCell({
  date,
  isCurrentMonth,
  isToday,
  appointments,
  onCardClick,
  onClickEmpty,
  variant,
  waHrefFor,
}: {
  date: Date;
  isCurrentMonth?: boolean;
  isToday: boolean;
  appointments: Appointment[];
  onCardClick: (a: Appointment) => void;
  onClickEmpty?: () => void;
  variant: "month" | "week" | "day";
  waHrefFor?: (a: Appointment) => string | null;
}) {
  const iso = toISO(date);
  const { setNodeRef, isOver } = useDroppable({ id: iso });
  const total = appointments.reduce((s, a) => s + Number(a.amount || 0), 0);

  return (
    <div
      ref={setNodeRef}
      onClick={onClickEmpty}
      className={cn(
        "flex flex-col gap-1 border border-border/60 bg-background/40 transition-colors",
        variant === "month" && "min-h-[7rem] p-1.5",
        variant === "week" && "min-h-[16rem] p-2",
        variant === "day" && "min-h-[20rem] p-3",
        !isCurrentMonth && variant === "month" && "bg-muted/30 text-muted-foreground",
        isToday && "ring-1 ring-primary/40",
        isOver && "bg-accent/40 ring-2 ring-primary",
      )}
    >
      <div className="flex items-baseline justify-between">
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            isToday && "text-primary font-semibold",
          )}
        >
          {date.getDate()}
          {variant !== "month" && (
            <span className="ml-1 text-muted-foreground capitalize">
              {WEEKDAYS[date.getDay()]}
            </span>
          )}
        </span>
        {total > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatBRL(total)}
          </span>
        )}
      </div>
      <div className={cn("flex flex-col gap-1", variant === "month" && "overflow-hidden")}>
        {appointments.map((a) => (
          <AppointmentCard
            key={a.id}
            a={a}
            compact={variant === "month"}
            onClick={() => onCardClick(a)}
            waHref={waHrefFor?.(a) ?? null}
          />
        ))}
      </div>
    </div>
  );
}

export function AppointmentsCalendar({
  appointments,
  cursor,
  onCursorChange,
  view,
  onViewChange,
  onCardClick,
  onMove,
  phonesByClientId,
  whatsappTemplate,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const waHrefFor = useMemo(() => {
    return (a: Appointment) => {
      if (a.status !== "a_fazer") return null;
      const phone = a.client_id ? phonesByClientId?.get(a.client_id) ?? "" : "";
      if (!phone) return null;
      // import dinâmico evitado — usamos util importado abaixo
      return buildWhatsAppLink(phone, whatsappTemplate ?? "", a);
    };
  }, [phonesByClientId, whatsappTemplate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const byDate = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    appointments.forEach((a) => {
      const arr = m.get(a.date) ?? [];
      arr.push(a);
      m.set(a.date, arr);
    });
    return m;
  }, [appointments]);

  const today = new Date();
  const todayISO = toISO(today);

  const days = useMemo(() => {
    if (view === "day") return [new Date(cursor)];
    if (view === "week") {
      const s = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    // month: from sunday before 1st through saturday after last
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const gridStart = startOfWeek(first);
    const gridEnd = addDays(startOfWeek(last), 6);
    const total = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
    return Array.from({ length: total }, (_, i) => addDays(gridStart, i));
  }, [cursor, view]);

  const label = useMemo(() => {
    if (view === "day")
      return cursor.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      return `${s.getDate()}/${s.getMonth() + 1} – ${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}`;
    }
    return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }, [cursor, view]);

  const shift = (dir: 1 | -1) => {
    const n = new Date(cursor);
    if (view === "day") n.setDate(n.getDate() + dir);
    else if (view === "week") n.setDate(n.getDate() + 7 * dir);
    else n.setMonth(n.getMonth() + dir);
    onCursorChange(n);
  };

  const activeAppt = activeId
    ? appointments.find((a) => a.id === activeId) ?? null
    : null;

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const a = e.active.data.current?.appointment as Appointment | undefined;
    const overId = e.over?.id as string | undefined;
    if (!a || !overId || overId === a.date) return;
    await onMove(a, overId);
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => shift(-1)}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCursorChange(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => shift(1)}
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-sm font-medium capitalize">{label}</span>
          </div>
          <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className={cn(
                  "px-3 py-1.5 rounded-sm transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
        </div>

        {view === "month" && (
          <div className="hidden sm:grid grid-cols-7 gap-px text-xs text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-1 text-center font-medium">
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Mobile agenda view for month — avoids cramped 7-col grid */}
        {view === "month" && (
          <div className="sm:hidden flex flex-col gap-2">
            {days
              .filter((d) => d.getMonth() === cursor.getMonth())
              .map((d) => {
                const iso = toISO(d);
                const items = byDate.get(iso) ?? [];
                if (items.length === 0) return null;
                const total = items.reduce((s, a) => s + Number(a.amount || 0), 0);
                return (
                  <div
                    key={iso}
                    className={cn(
                      "rounded-lg border bg-card/60 p-2",
                      iso === todayISO && "ring-1 ring-primary/40",
                    )}
                  >
                    <div className="flex items-baseline justify-between mb-1.5 px-1">
                      <span className="text-sm font-semibold capitalize">
                        {d.toLocaleDateString("pt-BR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatBRL(total)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {items.map((a) => (
                        <AppointmentCard
                          key={a.id}
                          a={a}
                          onClick={() => onCardClick(a)}
                          waHref={waHrefFor(a)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            {days.filter(
              (d) => d.getMonth() === cursor.getMonth() && (byDate.get(toISO(d)) ?? []).length > 0,
            ).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum atendimento neste mês.
              </p>
            )}
          </div>
        )}

        <div
          className={cn(
            "gap-px rounded-lg overflow-hidden bg-border/60",
            view === "month" && "hidden sm:grid grid-cols-7",
            view === "week" && "grid grid-cols-1 sm:grid-cols-7",
            view === "day" && "grid grid-cols-1",
          )}
        >
          {days.map((d) => {
            const iso = toISO(d);
            const items = byDate.get(iso) ?? [];
            return (
              <DayCell
                key={iso}
                date={d}
                isCurrentMonth={view !== "month" || d.getMonth() === cursor.getMonth()}
                isToday={iso === todayISO}
                appointments={items}
                onCardClick={onCardClick}
                variant={view}
                waHrefFor={waHrefFor}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeAppt ? (
          <div className="pointer-events-none">
            <AppointmentCard a={activeAppt} compact={view === "month"} onClick={() => {}} waHref={null} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
