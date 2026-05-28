import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import defaultLogo from "@/assets/logo.png";
import { getTenantBySlug } from "@/lib/tenant-public.functions";
import { checkLoginAccess } from "@/lib/tenant.functions";
import { Instagram, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar " }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const masterTenantQ = useQuery({
    queryKey: ["public-tenant", "principal"],
    queryFn: () => getTenantBySlug({ data: { slug: "principal" } }),
  });
  const wpp = masterTenantQ.data?.whatsapp || "";
  const insta = masterTenantQ.data?.instagram_url || "";

  useEffect(() => {
    supabase.auth.getSession().then((result) => {
      if (result.data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const signInResult = await supabase.auth.signInWithPassword({ email, password });
    if (signInResult.error) {
      setLoading(false);
      toast.error("Credenciais inválidas");
      return;
    }
    try {
      const access = await checkLoginAccess();
      if (!access.allowed) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error(access.reason);
        return;
      }
    } catch {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Não foi possível validar seu acesso. Tente novamente.");
      return;
    }
    setLoading(false);
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="theme-preto min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
      <Card className="w-full max-w-sm border-border/70 shadow-md bg-card">
        <CardHeader className="items-center text-center">
          {/* Aplica a logo dinâmica vinda do settings ou a default do projeto caso falhe */}
          <img src={defaultLogo} alt="DFL" className="h-24 w-auto mb-2 object-contain" />
          <CardTitle className="font-display text-2xl">Entrar no painel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "A entrar..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {(wpp || insta) && (
        <div className="mt-6 flex items-center gap-3 text-sm">
          {wpp && (
            <a
              href={`https://wa.me/${wpp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-foreground/90 hover:bg-accent transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          {insta && (
            <a
              href={insta}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-foreground/90 hover:bg-accent transition-colors"
            >
              <Instagram className="h-4 w-4" />
              Instagram
            </a>
          )}
        </div>
      )}
    </div>
  );
}
