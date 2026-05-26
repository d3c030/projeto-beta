import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Instagram, Sparkles } from "lucide-react";
import { getBookedSlots, getAgendaOverrides } from "@/lib/public-booking.functions";
import { getContactSettings } from "@/lib/settings.functions";
import {
  generateDailySlots,
  isClosedDay,
  isoFromDate,
  normalizeTime,
  parseISODate,
  INSTAGRAM_URL,
  BOOKING_PHONE,
} from "@/lib/booking-config";
import { MONTHS_PT } from "@/lib/format";
import { cn } from "@/lib/utils";
import defaultLogo from "@/assets/logo.png";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar — Studio Taiane Oliveira" },
      {
        name: "description",
        content:
          "Escolha o melhor dia e horário para o seu atendimento no Studio Taiane Oliveira.",
      },
    ],
  }),
  component: AgendarPage,
});

function AgendarPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11

  const bookedQ = useQuery({
    queryKey: ["public-booked", year, month],
    queryFn: () => getBookedSlots({ data: { year, month: month + 1 } }),
  });

  const overridesQ = useQuery({
    queryKey: ["public-agenda-overrides", year, month],
    queryFn: () => getAgendaOverrides({ data: { year, month: month + 1 } }),
  });

  const settingsQ = useQuery({
    queryKey: ["public-contact-settings"],
    queryFn: () => getContactSettings(),
  });
  const waPhone = settingsQ.data?.whatsapp_phone || BOOKING_PHONE;
  const igUrl = settingsQ.data?.instagram_url || INSTAGRAM_URL;


  const slotsPerDay = generateDailySlots().length;

  const bookedByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (bookedQ.data ?? []).forEach((b) => {
      const t = normalizeTime(b.time);
      if (!t) return;
      const set = map.get(b.date) ?? new Set<string>();
      set.add(t);
      map.set(b.date, set);
    });
    return map;
  }, [bookedQ.data]);

  const overridesByDate = useMemo(() => {
    const m = new Map<string, boolean>();
    (overridesQ.data ?? []).forEach((o) => m.set(o.date, o.is_open));
    return m;
  }, [overridesQ.data]);

  // Build calendar grid
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ day: number; date: Date } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(year, month, d) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  const isPast = (d: Date) => d < today;

  const getDayStatus = (d: Date) => {
    if (isPast(d)) return "past" as const;
    const iso = isoFromDate(d);
    const ov = overridesByDate.get(iso);
    const isOpen = ov !== undefined ? ov : !isClosedDay(d);
    if (!isOpen) return "closed" as const;
    const taken = bookedByDate.get(iso)?.size ?? 0;
    if (taken >= slotsPerDay) return "full" as const;
    return "open" as const;
  };

  const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="w-full flex justify-end px-4 pt-4">
        <Link
          to="/login"
          className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-full px-4 py-2 hover:bg-secondary"
        >
          Login
        </Link>
      </div>
      <header className="px-4 pt-2 pb-4 flex flex-col items-center">
        <img
          src={settingsQ.data?.logo_url || defaultLogo}
          alt="Studio Taiane Oliveira"
          className="h-24 sm:h-28 w-auto"
        />
        <h1 className="font-display text-2xl sm:text-3xl mt-3 text-center">
          Reserve o seu horário
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1 max-w-md">
          Escolha um dia disponível e finalizamos seu agendamento pelo WhatsApp.
        </p>
      </header>

      <main className="max-w-xl mx-auto px-4 pb-32">
        <div className="rounded-3xl bg-card border border-border shadow-sm p-4 sm:p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              aria-label="Mês anterior"
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="font-display text-lg sm:text-xl capitalize">
              {MONTHS_PT[month]} {year}
            </div>
            <button
              onClick={nextMonth}
              aria-label="Próximo mês"
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-muted-foreground">
            {weekdays.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((c, i) => {
              if (!c) return <div key={i} />;
              const status = getDayStatus(c.date);
              const iso = isoFromDate(c.date);
              const isToday = iso === isoFromDate(today);
              const disabled = status !== "open";

              const base =
                "aspect-square rounded-xl flex items-center justify-center text-sm font-medium relative transition-all touch-manipulation";
              if (disabled) {
                return (
                  <div
                    key={i}
                    aria-disabled
                    className={cn(
                      base,
                      "text-muted-foreground/50 bg-muted/40 cursor-not-allowed",
                      status === "full" && "line-through",
                    )}
                    title={
                      status === "full"
                        ? "Dia totalmente reservado"
                        : status === "closed"
                          ? "Fechado"
                          : ""
                    }
                  >
                    {c.day}
                  </div>
                );
              }

              const d = parseISODate(iso);
              const dateLabel = d.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              });
              const message = encodeURIComponent(
                `Olá! Gostaria de agendar um horário para o dia ${dateLabel}.`,
              );
              const waUrl = `https://wa.me/${waPhone}?text=${message}`;
              return (
                <a
                  key={i}
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    base,
                    "bg-accent/40 hover:bg-primary hover:text-primary-foreground active:scale-95 cursor-pointer",
                    isToday && "ring-2 ring-primary",
                  )}
                >
                  {c.day}
                </a>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-accent/60" /> Disponível
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-muted/60" /> Fechado / cheio
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded ring-2 ring-primary" /> Hoje
            </span>
          </div>
        </div>

        {/* Social */}
        <div className="mt-6 rounded-3xl bg-gradient-to-br from-accent/50 to-secondary/60 border border-border p-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            Acompanhe nosso trabalho
          </div>
          <p className="mt-2 font-display text-lg">
            Inspire-se em <span className="italic">@studiotaianeoliveira</span>
          </p>
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Instagram className="h-4 w-4" />
            Seguir no Instagram
          </a>
        </div>

      </main>
    </div>
  );
}
