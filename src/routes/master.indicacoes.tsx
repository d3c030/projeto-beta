import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Gift,
  MessageCircle,
  Search,
  Trash2,
  User2,
  Building2,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listAllReferrals,
  updateReferralStatus,
  deleteReferral,
  type ReferralStatus,
  type ReferralWithTenant,
} from "@/lib/referrals.functions";

export const Route = createFileRoute("/master/indicacoes")({
  head: () => ({ meta: [{ title: "Indicações — Painel Master" }] }),
  component: MasterIndicacoes,
});

const STATUS_OPTIONS: { value: ReferralStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
];

const STATUS_TONE: Record<ReferralStatus, string> = {
  novo: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  contatado: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  em_negociacao: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  fechado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  perdido: "bg-zinc-700/50 text-zinc-400 border-zinc-700",
};

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function formatPhoneBr(raw: string): string {
  const d = onlyDigits(raw);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function buildWhatsAppUrl(referredName: string, referrerName: string, phone: string) {
  const digits = onlyDigits(phone);
  const intl = digits.startsWith("55") ? digits : `55${digits}`;
  const firstName = (referredName || "").trim().split(/\s+/)[0] || referredName;
  const referrer = referrerName?.trim() || "um cliente nosso";
  const message = `Olá, ${firstName}! Tudo bem? Estou entrando em contato porque o(a) ${referrer} me passou seu contato. Ele(a) utiliza nosso sistema de gestão no negócio dele(a) e me disse que a ferramenta seria perfeita para facilitar a sua rotina também. Posso te enviar um vídeo rápido de 1 minuto mostrando como funciona?`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

function MasterIndicacoes() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllReferrals);
  const updateFn = useServerFn(updateReferralStatus);
  const deleteFn = useServerFn(deleteReferral);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ReferralStatus | "all">("all");

  const list = useQuery({ queryKey: ["master-referrals"], queryFn: () => listFn() });

  const updateStatus = useMutation({
    mutationFn: (vars: { id: string; status: ReferralStatus }) =>
      updateFn({ data: { id: vars.id, status: vars.status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master-referrals"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar"),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Indicação removida");
      qc.invalidateQueries({ queryKey: ["master-referrals"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao remover"),
  });

  const filtered = useMemo(() => {
    const all = list.data ?? [];
    const term = q.trim().toLowerCase();
    return all.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!term) return true;
      return (
        r.referred_name.toLowerCase().includes(term) ||
        r.referrer_name.toLowerCase().includes(term) ||
        (r.tenant_business_name ?? "").toLowerCase().includes(term) ||
        r.referred_whatsapp.includes(term)
      );
    });
  }, [list.data, q, filter]);

  const counts = useMemo(() => {
    const all = list.data ?? [];
    const c: Record<ReferralStatus | "all", number> = {
      all: all.length,
      novo: 0,
      contatado: 0,
      em_negociacao: 0,
      fechado: 0,
      perdido: 0,
    };
    for (const r of all) c[r.status]++;
    return c;
  }, [list.data]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl md:text-2xl text-zinc-50 flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-400" />
            Indicações Recebidas
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Funil de leads enviados pelos clientes do programa Indique e Ganhe.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "novo", "contatado", "em_negociacao", "fechado", "perdido"] as const).map((k) => {
          const active = filter === k;
          const label =
            k === "all" ? "Todos" : STATUS_OPTIONS.find((o) => o.value === k)?.label ?? k;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {label}
              <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                {counts[k]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por indicado, cliente ou telefone…"
          className="pl-9 bg-zinc-900/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>

      {list.isLoading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando indicações…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-500 text-sm">
          Nenhuma indicação encontrada.
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((r) => (
            <ReferralCard
              key={r.id}
              r={r}
              onStatus={(status) => updateStatus.mutate({ id: r.id, status })}
              onDelete={() => {
                if (confirm(`Remover indicação de ${r.referred_name}?`)) del.mutate(r.id);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReferralCard({
  r,
  onStatus,
  onDelete,
}: {
  r: ReferralWithTenant;
  onStatus: (s: ReferralStatus) => void;
  onDelete: () => void;
}) {
  const url = buildWhatsAppUrl(r.referred_name, r.referrer_name, r.referred_whatsapp);
  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-zinc-50 text-base truncate">{r.referred_name}</h3>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[r.status]}`}
            >
              {STATUS_OPTIONS.find((o) => o.value === r.status)?.label}
            </span>
          </div>
          <div className="mt-1.5 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              {formatPhoneBr(r.referred_whatsapp)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(r.created_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User2 className="h-3.5 w-3.5" />
              Indicado por: <span className="text-zinc-200">{r.referrer_name || "—"}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {r.tenant_business_name || "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch gap-2 md:min-w-[320px]">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (r.status === "novo") onStatus("contatado");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-colors flex-1"
          >
            <MessageCircle className="h-4 w-4" />
            Contatar via WhatsApp
          </a>
          <Select value={r.status} onValueChange={(v) => onStatus(v as ReferralStatus)}>
            <SelectTrigger className="bg-zinc-950/60 border-zinc-800 text-zinc-100 w-full sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
            aria-label="Remover indicação"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}