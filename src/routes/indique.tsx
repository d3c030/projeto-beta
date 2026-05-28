import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Send, Sparkles, CheckCircle2, Clock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReferral, listMyReferrals, type ReferralStatus } from "@/lib/referrals.functions";

export const Route = createFileRoute("/indique")({
  head: () => ({ meta: [{ title: "Indique e Ganhe" }] }),
  component: IndiquePage,
});

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const STATUS_LABEL: Record<ReferralStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  em_negociacao: "Em negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

const STATUS_TONE: Record<ReferralStatus, string> = {
  novo: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  contatado: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  em_negociacao: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  fechado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  perdido: "bg-muted text-muted-foreground border-border",
};

function IndiquePage() {
  const qc = useQueryClient();
  const create = useServerFn(createReferral);
  const listFn = useServerFn(listMyReferrals);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const myList = useQuery({ queryKey: ["my-referrals"], queryFn: () => listFn() });

  const mut = useMutation({
    mutationFn: async () => {
      const digits = phone.replace(/\D/g, "");
      return create({ data: { referred_name: name.trim(), referred_whatsapp: digits } });
    },
    onSuccess: () => {
      toast.success("Indicação enviada! Obrigado 💖");
      setName("");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["my-referrals"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar"),
  });

  const canSubmit = useMemo(() => {
    const digits = phone.replace(/\D/g, "");
    return name.trim().length >= 2 && digits.length >= 10 && !mut.isPending;
  }, [name, phone, mut.isPending]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Indique e Ganhe
          </div>
          <h1 className="mt-3 font-display text-2xl md:text-3xl">
            Conhece alguém que também merece organizar a agenda com elegância?
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Indique outro profissional e ajude a comunidade a crescer. A cada indicação que vira cliente,
            você ganha benefícios exclusivos no seu plano. É rapidinho 👇
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) mut.mutate();
        }}
        className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="ref-name">Nome do indicado</Label>
          <Input
            id="ref-name"
            placeholder="Ex.: Camila Souza"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="off"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ref-phone">WhatsApp do indicado</Label>
          <Input
            id="ref-phone"
            placeholder="(11) 91234-5678"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            inputMode="tel"
            autoComplete="tel"
            required
          />
          <p className="text-xs text-muted-foreground">Inclua o DDD. Só envie se a pessoa souber que vai receber nosso contato 💌</p>
        </div>
        <Button type="submit" disabled={!canSubmit} className="w-full h-11 text-sm md:text-base">
          <Send className="h-4 w-4" />
          {mut.isPending ? "Enviando…" : "Enviar indicação"}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg">Minhas indicações</h2>
        </div>
        {myList.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (myList.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não fez nenhuma indicação. Que tal começar agora? ✨
          </p>
        ) : (
          <ul className="space-y-2">
            {(myList.data ?? []).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.referred_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MessageCircle className="h-3 w-3" />
                    {formatPhone(r.referred_whatsapp)}
                    <span className="opacity-50">·</span>
                    <Clock className="h-3 w-3" />
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[r.status]}`}
                >
                  {r.status === "fechado" && <CheckCircle2 className="h-3 w-3" />}
                  {STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}