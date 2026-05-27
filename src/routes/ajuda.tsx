import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LifeBuoy, Search, Home, CalendarDays, CalendarCheck, Users, Sparkles,
  Receipt, Shield, Settings, HandCoins, CheckCircle2, PlayCircle, BookOpen, Pencil, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getAccessState } from "@/lib/tenant.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: "Central de Ajuda — Tutoriais" },
      { name: "description", content: "Vídeos curtos e explicações claras sobre cada funcionalidade do sistema." },
    ],
  }),
  component: HelpCenter,
});

type Topic = {
  id: string;
  title: string;
  summary: string;
  videoUrl?: string;
  steps: string[];
  tips?: string[];
};

type Section = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  topics: Topic[];
};

const SECTIONS: Section[] = [
  {
    id: "inicio",
    title: "Painel inicial",
    description: "Visão geral do mês: faturamento, custos, agenda e gráficos.",
    icon: Home,
    topics: [
      {
        id: "inicio-resumo",
        title: "Entendendo os cartões de resumo",
        summary: "Faturamento Bruto, Custos, Líquido e A Receber — o que cada número significa.",
        steps: [
          "Bruto: soma de todos os atendimentos do mês selecionado.",
          "Custos: soma das despesas lançadas no mês selecionado.",
          "Líquido: Bruto − Custos (mostra em vermelho se ficar negativo).",
          "A Receber: total de atendimentos finalizados como pendentes de pagamento.",
        ],
        tips: ["Use o seletor de mês no topo para navegar entre períodos."],
      },
      {
        id: "inicio-grafico",
        title: "Gráfico Movimento por dia",
        summary: "Como ler entradas (barras) e custos (linha) ao longo do mês.",
        steps: [
          "Cada barra representa o total recebido no dia.",
          "A linha vermelha indica os custos lançados no dia.",
          "Passe o dedo / mouse sobre a barra para ver o detalhe do dia.",
        ],
      },
    ],
  },
  {
    id: "atendimentos",
    title: "Atendimentos",
    description: "Como cadastrar, editar, finalizar e cancelar atendimentos.",
    icon: CalendarDays,
    topics: [
      {
        id: "atend-novo",
        title: "Criar um novo atendimento",
        summary: "Cadastre data, cliente, procedimento e valor em poucos toques.",
        steps: [
          "Toque em 'Atendimento' no topo do painel ou abra a aba Atendimentos.",
          "Preencha cliente, data, hora, procedimento e valor.",
          "Escolha a forma de pagamento (Pix, dinheiro, cartão, A Receber...).",
          "Salve. O cliente é cadastrado automaticamente se ainda não existir.",
        ],
        tips: [
          "Use 'A Receber' quando o cliente ainda não pagou — vai aparecer no painel.",
        ],
      },
      {
        id: "atend-finalizar",
        title: "Finalizar um atendimento",
        summary: "Marque como concluído e registre o pagamento real.",
        steps: [
          "Na lista 'A fazer' do painel, toque em 'Finalizar' no atendimento.",
          "Confirme o valor recebido e a forma de pagamento.",
          "O atendimento passa para 'concluído' e entra no faturamento do mês.",
        ],
      },
      {
        id: "atend-editar",
        title: "Editar ou cancelar",
        summary: "Ajuste dados ou cancele sem perder o histórico.",
        steps: [
          "Toque no ícone de lápis ao lado do atendimento.",
          "Altere os dados necessários e salve.",
          "Para cancelar, mude o status para 'cancelado' — ele não entra mais nos cálculos.",
        ],
      },
    ],
  },
  {
    id: "agenda",
    title: "Agenda",
    description: "Visualize seus compromissos por dia e semana.",
    icon: CalendarCheck,
    topics: [
      {
        id: "agenda-ver",
        title: "Navegar pela agenda",
        summary: "Veja todos os atendimentos organizados por horário.",
        steps: [
          "Acesse a aba Agenda no menu.",
          "Use as setas para mudar de dia/semana.",
          "Toque em um item para abrir e editar.",
        ],
      },
    ],
  },
  {
    id: "clientes",
    title: "Clientes",
    description: "Cadastro e histórico dos seus clientes.",
    icon: Users,
    topics: [
      {
        id: "cli-novo",
        title: "Cadastrar cliente",
        summary: "Adicione manualmente ou deixe o sistema criar pelo atendimento.",
        steps: [
          "Abra a aba Clientes e toque em 'Novo'.",
          "Preencha nome, telefone e observações.",
          "Salve. Você pode buscar pelo nome a qualquer momento.",
        ],
        tips: ["Ao criar um atendimento com um nome novo, o cliente é cadastrado automaticamente."],
      },
      {
        id: "cli-historico",
        title: "Ver histórico de um cliente",
        summary: "Acompanhe todos os atendimentos e valores de cada pessoa.",
        steps: [
          "Toque no nome do cliente na lista.",
          "Veja últimos atendimentos, total gasto e pendências.",
        ],
      },
    ],
  },
  {
    id: "procedimentos",
    title: "Procedimentos",
    description: "Padronize os serviços que você oferece.",
    icon: Sparkles,
    topics: [
      {
        id: "proc-cadastro",
        title: "Cadastrar procedimentos",
        summary: "Crie uma lista de serviços com valores sugeridos.",
        steps: [
          "Acesse a aba Procedimentos.",
          "Toque em 'Novo' e informe nome e valor padrão.",
          "Ao criar atendimentos, o procedimento aparece para seleção rápida.",
        ],
      },
    ],
  },
  {
    id: "custos",
    title: "Custos / Despesas",
    description: "Registre saídas para acompanhar o lucro real.",
    icon: Receipt,
    topics: [
      {
        id: "custos-novo",
        title: "Lançar um custo",
        summary: "Insumos, materiais, contas — tudo o que sai do caixa.",
        steps: [
          "Toque em 'Custo' no painel ou abra a aba Custos.",
          "Preencha descrição, data e valor.",
          "Salve. O valor entra no cálculo de líquido do mês.",
        ],
      },
    ],
  },
  {
    id: "receber",
    title: "A Receber",
    description: "Controle de pagamentos pendentes.",
    icon: HandCoins,
    topics: [
      {
        id: "rec-quitar",
        title: "Quitar um pagamento pendente",
        summary: "Quando o cliente pagar, registre o recebimento.",
        steps: [
          "Localize o atendimento marcado como 'A Receber'.",
          "Toque em 'Finalizar' / 'Receber'.",
          "Escolha a forma de pagamento usada. Pronto — sai da lista de pendentes.",
        ],
      },
    ],
  },
  {
    id: "usuarios",
    title: "Usuários",
    description: "Gerencie quem tem acesso ao sistema.",
    icon: Shield,
    topics: [
      {
        id: "user-novo",
        title: "Convidar um usuário",
        summary: "Adicione colaboradores ao seu painel.",
        steps: [
          "Acesse a aba Usuários.",
          "Toque em 'Novo usuário' e informe nome, e-mail e senha inicial.",
          "Envie os dados de acesso para a pessoa.",
        ],
        tips: ["Cada novo usuário só vê os dados do seu próprio tenant."],
      },
    ],
  },
  {
    id: "configuracoes",
    title: "Configurações",
    description: "Personalize logo, dados de contato e preferências.",
    icon: Settings,
    topics: [
      {
        id: "cfg-logo",
        title: "Trocar logo e marca",
        summary: "Suba sua logo para aparecer no topo do sistema.",
        steps: [
          "Abra Configurações.",
          "Na seção 'Marca', envie sua imagem (PNG ou JPG).",
          "Salve. A logo aparece imediatamente no cabeçalho.",
        ],
      },
      {
        id: "cfg-contato",
        title: "Dados de contato públicos",
        summary: "Informações que aparecem na página de agendamento público.",
        steps: [
          "Em Configurações, preencha WhatsApp, endereço e horários.",
          "Esses dados aparecem para o cliente na hora de agendar online.",
        ],
      },
    ],
  },
];

function HelpCenter() {
  const [query, setQuery] = useState("");
  const qc = useQueryClient();
  const accessQ = useQuery({ queryKey: ["access-state"], queryFn: () => getAccessState() });
  const isMaster = !!accessQ.data?.isSuperadmin;

  const videosQ = useQuery({
    queryKey: ["help-videos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("help_videos").select("topic_id, video_url");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => { map[r.topic_id] = r.video_url; });
      return map;
    },
  });
  const videos = videosQ.data ?? {};

  const [editing, setEditing] = useState<{ topicId: string; title: string } | null>(null);
  const refreshVideos = () => qc.invalidateQueries({ queryKey: ["help-videos"] });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => ({
        ...s,
        topics: s.topics.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.summary.toLowerCase().includes(q) ||
            t.steps.some((st) => st.toLowerCase().includes(q))
        ),
      }))
      .filter(
        (s) =>
          s.topics.length > 0 ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl flex items-center gap-2">
            <LifeBuoy className="h-7 w-7 text-primary" />
            Central de Ajuda
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vídeos curtos e explicações claras para cada parte do sistema.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tutorial..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4 flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-foreground/90">
            <p className="font-medium">Como usar esta central</p>
            <p className="text-muted-foreground mt-0.5">
              Cada tópico tem um vídeo curto e um passo a passo. Em caso de dúvida,
              basta abrir o assunto desejado abaixo.
            </p>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          Nenhum tutorial encontrado para "{query}".
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} className="border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </span>
                    {section.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground pl-11">
                    {section.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {section.topics.map((topic) => (
                      <AccordionItem key={topic.id} value={topic.id}>
                        <AccordionTrigger className="text-left">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                            {topic.title}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <p className="text-sm text-muted-foreground">
                              {topic.summary}
                            </p>

                            <VideoBlock
                              url={videos[topic.id]}
                              isMaster={isMaster}
                              onEdit={() => setEditing({ topicId: topic.id, title: topic.title })}
                            />

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                Passo a passo
                              </p>
                              <ol className="space-y-2">
                                {topic.steps.map((step, i) => (
                                  <li key={i} className="flex gap-3 text-sm">
                                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                                      {i + 1}
                                    </span>
                                    <span className="pt-0.5">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {topic.tips && topic.tips.length > 0 && (
                              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Dicas
                                </p>
                                <ul className="space-y-1">
                                  {topic.tips.map((tip, i) => (
                                    <li key={i} className="text-sm text-foreground/90">
                                      • {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <VideoEditDialog
        open={!!editing}
        topic={editing}
        currentUrl={editing ? videos[editing.topicId] : undefined}
        onClose={() => setEditing(null)}
        onSaved={refreshVideos}
      />
    </div>
  );
}

function VideoBlock({
  url, isMaster, onEdit,
}: { url?: string; isMaster: boolean; onEdit: () => void }) {
  const embed = url ? toEmbedUrl(url) : null;
  return (
    <div className="space-y-2">
      {url && embed ? (
        embed.type === "iframe" ? (
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-border bg-black">
            <iframe
              src={embed.src}
              title="Vídeo tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          <video
            src={embed.src}
            controls
            className="w-full rounded-xl border border-border bg-black aspect-video"
          />
        )
      ) : (
        <div className="aspect-video w-full rounded-xl border border-dashed border-border bg-muted/40 flex flex-col items-center justify-center text-center px-4">
          <PlayCircle className="h-10 w-10 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">
            Vídeo tutorial em breve
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Enquanto isso, siga o passo a passo abaixo.
          </p>
        </div>
      )}
      {isMaster && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {url ? "Editar vídeo" : "Adicionar vídeo"}
          </Button>
        </div>
      )}
    </div>
  );
}

function toEmbedUrl(url: string): { type: "iframe" | "video"; src: string } | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
      if (u.pathname.startsWith("/embed/")) return { type: "iframe", src: u.toString() };
      if (u.pathname.startsWith("/shorts/")) {
        const sid = u.pathname.split("/")[2];
        if (sid) return { type: "iframe", src: `https://www.youtube.com/embed/${sid}` };
      }
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    // Vimeo
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return { type: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }
    if (host === "player.vimeo.com") return { type: "iframe", src: u.toString() };
    // Loom
    if (host === "loom.com" || host.endsWith(".loom.com")) {
      const m = u.pathname.match(/\/share\/([a-f0-9]+)/i);
      if (m) return { type: "iframe", src: `https://www.loom.com/embed/${m[1]}` };
      if (u.pathname.startsWith("/embed/")) return { type: "iframe", src: u.toString() };
    }
    // Direct video file
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(u.pathname)) {
      return { type: "video", src: u.toString() };
    }
    // Fallback: try iframe
    return { type: "iframe", src: u.toString() };
  } catch {
    return null;
  }
}

function VideoEditDialog({
  open, topic, currentUrl, onClose, onSaved,
}: {
  open: boolean;
  topic: { topicId: string; title: string } | null;
  currentUrl?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValue(currentUrl ?? ""); }, [currentUrl, topic?.topicId]);

  if (!topic) return null;

  const save = async () => {
    const trimmed = value.trim();
    setSaving(true);
    try {
      if (!trimmed) {
        const { error } = await supabase.from("help_videos").delete().eq("topic_id", topic.topicId);
        if (error) throw error;
        toast.success("Vídeo removido");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("help_videos").upsert({
          topic_id: topic.topicId,
          video_url: trimmed,
          updated_by: user?.id ?? null,
        });
        if (error) throw error;
        toast.success("Vídeo salvo");
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vídeo do tutorial</DialogTitle>
          <DialogDescription>{topic.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">URL do vídeo</label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">
            Aceita YouTube, Vimeo, Loom ou link direto de arquivo (.mp4, .webm).
          </p>
        </div>
        <DialogFooter className="gap-2">
          {currentUrl && (
            <Button
              variant="outline"
              onClick={() => { setValue(""); }}
              disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Limpar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}