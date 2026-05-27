import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Instagram, MessageCircle, Clock } from "lucide-react";
import { getBookedSlots, getAgendaOverrides } from "@/lib/public-booking.functions";
import {
  generateDailySlots,
  isClosedDay,
  parseISODate,
  normalizeTime,
  BOOKING_PHONE,
  INSTAGRAM_URL,
} from "@/lib/booking-config";
import { cn } from "@/lib/utils";
import defaultLogo from "@/assets/logo.png";

export const Route = createFileRoute("/agendar/$date")({
  head: () => ({
    meta: [{ title: "Escolher horário — Studio Taiane Oliveira" }],
  }),
  component: AgendarDatePage,
});

function AgendarDatePage() {
  const { date } = Route.useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const dateObj = useMemo(() => parseISODate(date), [date]);
  const dateValid = !isNaN(dateObj.getTime()) && dateObj >= todayMidnight();

  const overridesQ = useQuery({
    queryKey: ["public-agenda-overrides", dateObj.getFullYear(), dateObj.getMonth()],
    queryFn: () =>
      getAgendaOverrides({
        data: { year: dateObj.getFullYear(), month: dateObj.getMonth() + 1 },
      }),
    enabled: dateValid,
  });

  const waPhone = BOOKING_PHONE;
  const igUrl = INSTAGRAM_URL;

  const override = (overridesQ.data ?? []).find((o) => o.date === date);
  const isOpen = override ? override.is_open : !isClosedDay(dateObj);
  const valid = dateValid && isOpen;

  const bookedQ = useQuery({
    queryKey: ["public-booked", dateObj.getFullYear(), dateObj.getMonth()],
    queryFn: () =>
      getBookedSlots({
        data: { year: dateObj.getFullYear(), month: dateObj.getMonth() + 1 },
      }),
    enabled: valid,
  });

  const bookedSet = useMemo(() => {
    const s = new Set<string>();
    (bookedQ.data ?? [])
      .filter((b) => b.date === date)
      .forEach((b) => {
        const t = normalizeTime(b.time);
        if (t) s.add(t);
      });
    return s;
  }, [bookedQ.data, date]);

  if (!valid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-4">Data indisponível.</p>
        <Link
          to="/agendar"
          className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm"
        >
          Voltar ao calendário
        </Link>
      </div>
    );
  }

  const allSlots = generateDailySlots();
  const dayLabel = dateObj.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const dayShort = dateObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const buildWhatsAppUrl = (time: string) => {
    const msg = `Olá, gostaria de agendar um horário no dia ${dayShort} e horário ${time} definido lá no site.`;
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <header className="px-4 pt-6 pb-4 flex items-center justify-between max-w-xl mx-auto">
        <button
          onClick={() => navigate({ to: "/agendar" })}
          className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <img src={defaultLogo} alt="Logo" className="h-14 w-auto" />
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto px-4 pb-40">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-wider text-primary font-medium">
            Você escolheu
          </p>
          <h1 className="font-display text-2xl sm:text-3xl mt-1 capitalize">
            {dayLabel}
          </h1>
        </div>

        <div className="rounded-3xl bg-card border border-border shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            Horários disponíveis
          </div>

          {bookedQ.isLoading ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              A carregar horários...
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {allSlots.map((slot) => {
                const taken = bookedSet.has(slot);
                const isSel = selected === slot;
                return (
                  <button
                    key={slot}
                    disabled={taken}
                    onClick={() => setSelected(slot)}
                    className={cn(
                      "h-12 rounded-xl text-sm font-medium transition-all touch-manipulation",
                      taken &&
                        "bg-muted/40 text-muted-foreground/50 line-through cursor-not-allowed",
                      !taken &&
                        !isSel &&
                        "bg-accent/40 hover:bg-primary hover:text-primary-foreground active:scale-95",
                      isSel && "bg-primary text-primary-foreground shadow-md",
                    )}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Instagram block */}
        <div className="mt-6 rounded-3xl bg-gradient-to-br from-accent/50 to-secondary/60 border border-border p-5 text-center">
          <p className="text-sm text-muted-foreground">Conheça nosso trabalho</p>
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <Instagram className="h-4 w-4" />
            @studiotaianeoliveira
          </a>
        </div>
      </main>

      {/* Sticky WhatsApp CTA */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-gradient-to-t from-background via-background/95 to-background/0 transition-all",
          selected ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="max-w-xl mx-auto">
          {selected && (
            <a
              href={buildWhatsAppUrl(selected)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-[#25D366] text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform"
            >
              <MessageCircle className="h-5 w-5" />
              Agendar pelo WhatsApp · {selected}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
