import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, UserPlus } from "lucide-react";
import { listUsers, createUser, deleteUser } from "@/lib/users.functions";
import { formatDateBR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Studio Taiane Oliveira" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const remove = useServerFn(deleteUser);

  const usersQ = useQuery({
    queryKey: ["panel-users"],
    queryFn: () => list(),
  });

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toDelete, setToDelete] = useState<{ id: string; email: string } | null>(null);

  const createMut = useMutation({
    mutationFn: () => create({ data: { email, password } }),
    onSuccess: () => {
      toast.success("Usuário criado");
      setOpen(false);
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["panel-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["panel-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Quem tem acesso ao painel
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo usuário
        </Button>
      </header>

      <Card className="divide-y divide-border">
        {usersQ.isLoading && (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        )}
        {usersQ.isError && (
          <div className="p-6 text-sm text-destructive">
            Erro ao carregar usuários.
          </div>
        )}
        {usersQ.data?.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">
            Nenhum usuário ainda.
          </div>
        )}
        {usersQ.data?.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{u.email}</div>
              <div className="text-xs text-muted-foreground">
                Criado em {formatDateBR(u.created_at)}
                {u.last_sign_in_at
                  ? ` · Último acesso ${formatDateBR(u.last_sign_in_at)}`
                  : " · Nunca acessou"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setToDelete({ id: u.id, email: u.email })}
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              O usuário poderá entrar imediatamente com e-mail e senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !email || password.length < 8}
            >
              {createMut.isPending ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.email} perderá o acesso ao painel imediatamente. Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && delMut.mutate(toDelete.id)}
              disabled={delMut.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
