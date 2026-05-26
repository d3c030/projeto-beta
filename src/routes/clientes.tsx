import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronRight, Users, Phone } from "lucide-react";
import {
  fetchClientsWithStats,
  fetchClientHistory,
  updateClient,
  deleteClient,
  type Client,
} from "@/lib/data";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Studio Taiane Oliveira" }] }),
  component: ClientsPage,
});

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);

  const qc = useQueryClient();
  const listQ = useQuery({
    queryKey: ["clients-stats"],
    queryFn: fetchClientsWithStats,
  });

  const filtered = useMemo(() => {
    const list = listQ.data ?? [];
    if (!search.trim()) return list;
    const q = norm(search.trim());
    return list.filter(
      (s) =>
        norm(s.client.name).includes(q) ||
        norm(s.client.phone ?? "").includes(q)
    );
  }, [listQ.data, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {listQ.data?.length ?? 0} clientes registados
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Procurar cliente por nome ou telefone"
          className="pl-9 bg-card"
        />
      </div>

      {listQ.isLoading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">A carregar...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhum cliente encontrado.
        </Card>
      ) : (
        <Card className="divide-y divide-border/70 overflow-hidden">
          {filtered.map(({ client, visits, total, lastDate }) => (
            <button
              key={client.id}
              onClick={() => setSelected(client)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors"
            >
              <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium uppercase">
                {client.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{client.name}</div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                  {client.phone && (
                    <>
                      <Phone className="h-3 w-3" /> {client.phone}
                      <span>·</span>
                    </>
                  )}
                  <span>
                    {visits} visita{visits === 1 ? "" : "s"}
                  </span>
                  {lastDate && <span>· última {formatDateBR(lastDate)}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-sm font-semibold tabular-nums">{formatBRL(total)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </Card>
      )}

      <ClientDetailDialog
        client={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["clients-stats"] });
          qc.invalidateQueries({ queryKey: ["clients"] });
        }}
      />
    </div>
  );
}

function ClientDetailDialog({
  client,
  onOpenChange,
  onChanged,
}: {
  client: Client | null;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const open = !!client;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const historyQ = useQuery({
    queryKey: ["client-history", client?.id],
    queryFn: () => (client ? fetchClientHistory(client.id) : Promise.resolve([])),
    enabled: !!client,
  });

  // Reset fields when client changes
  useMemo(() => {
    setName(client?.name ?? "");
    setPhone(client?.phone ?? "");
    setNotes(client?.notes ?? "");
  }, [client]);

  if (!client) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const totalSpent = (historyQ.data ?? []).reduce(
    (s, a) => s + Number(a.amount || 0),
    0
  );

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateClient(client.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success("Cliente atualizado");
      onChanged();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Remover este cliente? O histórico será mantido sem ligação.")) return;
    try {
      await deleteClient(client.id);
      toast.success("Cliente removido");
      onChanged();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{client.name}</DialogTitle>
          <DialogDescription>
            {historyQ.data?.length ?? 0} atendimento{(historyQ.data?.length ?? 0) === 1 ? "" : "s"} ·{" "}
            {formatBRL(totalSpent)} no total
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="c-name">Nome</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-phone">Telefone</Label>
              <Input
                id="c-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-notes">Observações</Label>
            <Textarea
              id="c-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alergias, preferências, joias preferidas..."
              rows={3}
            />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Histórico de atendimentos</h4>
            {historyQ.isLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">A carregar...</p>
            ) : (historyQ.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sem atendimentos registados.
              </p>
            ) : (
              <Card className="divide-y divide-border/70 overflow-hidden max-h-72 overflow-y-auto">
                {historyQ.data!.map((a) => (
                  <div key={a.id} className="px-3 py-2 flex items-center gap-3">
                    <div className="text-xs text-muted-foreground w-24 shrink-0 tabular-nums">
                      {formatDateBR(a.date)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{a.procedure || "—"}</div>
                      {a.notes && (
                        <div className="text-xs text-muted-foreground truncate">{a.notes}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-medium tabular-nums">
                        {formatBRL(Number(a.amount))}
                      </span>
                      {a.payment_method && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {a.payment_method}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            className="mr-auto text-destructive hover:text-destructive"
            onClick={remove}
          >
            Remover
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
