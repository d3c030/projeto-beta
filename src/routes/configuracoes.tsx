import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Instagram, MessageCircle, Save, Image as ImageIcon, Upload, Palette, Check, QrCode, KeyRound, MessageSquareText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getContactSettings, updateContactSettings, THEMES, type ThemeName } from "@/lib/settings.functions";
import { DEFAULT_WHATSAPP_TEMPLATE } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import defaultLogo from "@/assets/logo.png";

const THEME_OPTIONS: { value: ThemeName; label: string; swatch: string; ring: string }[] = [
  {
    value: "rosa",
    label: "Rosa",
    swatch: "linear-gradient(135deg, oklch(0.88 0.04 30), oklch(0.62 0.08 20))",
    ring: "oklch(0.62 0.08 20)",
  },
  {
    value: "azul",
    label: "Azul",
    swatch: "linear-gradient(135deg, oklch(0.88 0.06 240), oklch(0.55 0.16 250))",
    ring: "oklch(0.55 0.16 250)",
  },
  { value: "preto", label: "Preto", swatch: "linear-gradient(135deg, #2a2a2a, #0a0a0a)", ring: "#111" },
  { value: "branco", label: "Branco", swatch: "linear-gradient(135deg, #ffffff, #ececec)", ring: "#111" },
];

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getContactSettings);
  const saveSettings = useServerFn(updateContactSettings);
  const fileRef = useRef<HTMLInputElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ["contact-settings"],
    queryFn: () => fetchSettings(),
  });

  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [theme, setTheme] = useState<ThemeName>("rosa");
  const [pixKey, setPixKey] = useState("");
  const [pixCopiaCola, setPixCopiaCola] = useState("");
  const [pixQrUrl, setPixQrUrl] = useState("");
  const [waTemplate, setWaTemplate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    if (q.data) {
      setInstagram(q.data.instagram_url ?? "");
      setWhatsapp(q.data.whatsapp_phone ?? "");
      setLogoUrl(q.data.logo_url ?? "");
      setTheme(q.data.theme ?? "rosa");
      setPixKey(q.data.pix_key ?? "");
      setPixCopiaCola(q.data.pix_copia_cola ?? "");
      setPixQrUrl(q.data.pix_qr_url ?? "");
      setWaTemplate(q.data.whatsapp_message_template ?? "");
    }
  }, [q.data]);

  type SaveOverrides = { logo?: string; theme?: ThemeName; pixQr?: string };
  const m = useMutation({
    mutationFn: (over: SaveOverrides = {}) =>
      saveSettings({
        data: {
          instagram_url: instagram.trim(),
          whatsapp_phone: whatsapp.trim(),
          logo_url: (over.logo ?? logoUrl).trim(),
          theme: over.theme ?? theme,
          pix_key: pixKey.trim(),
          pix_copia_cola: pixCopiaCola.trim(),
          pix_qr_url: (over.pixQr ?? pixQrUrl).trim(),
          whatsapp_message_template: waTemplate.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Configurações atualizadas");
      qc.invalidateQueries({ queryKey: ["contact-settings"] });
      qc.invalidateQueries({ queryKey: ["public-contact-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("branding")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      setLogoUrl(publicUrl);
      await m.mutateAsync({ logo: publicUrl });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUploadQr = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB)");
      return;
    }
    setUploadingQr(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `pix-qr-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("branding")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      setPixQrUrl(publicUrl);
      await m.mutateAsync({ pixQr: publicUrl });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingQr(false);
      if (qrFileRef.current) qrFileRef.current.value = "";
    }
  };

  const previewSrc = logoUrl || defaultLogo;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie a logo, o WhatsApp e a rede social usados na página pública de agendamento.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 max-w-xl">
        {/* Logo */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Logo
          </Label>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-xl bg-secondary/40 border border-border flex items-center justify-center overflow-hidden">
              <img src={previewSrc} alt="Logo atual" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Enviando…" : "Enviar nova logo"}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLogoUrl("");
                    m.mutate({ logo: "" });
                  }}
                  className="text-muted-foreground"
                >
                  Restaurar logo padrão
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG ou JPG, até 5 MB. Recomendado fundo transparente.</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            WhatsApp (somente números, com DDI + DDD)
          </Label>
          <Input
            id="whatsapp"
            inputMode="numeric"
            placeholder="5511999999999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">
            Exemplo: <code>5511964040524</code> (55 = Brasil, 11 = DDD).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram" className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-primary" />
            URL do Instagram
          </Label>
          <Input
            id="instagram"
            type="url"
            placeholder="https://www.instagram.com/seu_perfil/"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            maxLength={255}
          />
        </div>

        {/* Tema */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Tema visual
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTheme(opt.value);
                    m.mutate({ theme: opt.value });
                  }}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all hover:shadow-sm",
                    active ? "border-primary" : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <div className="h-14 w-full rounded-lg border border-border/60" style={{ background: opt.swatch }} />
                  <span className="text-xs font-medium flex items-center gap-1">
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            O tema é aplicado em todo o painel e na página pública de agendamento.
          </p>
        </div>

        {/* Pix */}
        <div className="space-y-3 pt-2 border-t border-border">
          <Label className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            Pix (usado no checkout)
          </Label>
          <div className="space-y-2">
            <Label htmlFor="pixkey" className="text-xs text-muted-foreground">
              Chave Pix
            </Label>
            <Input
              id="pixkey"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="email, CPF, telefone ou chave aleatória"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pixcc" className="text-xs text-muted-foreground">
              Pix Copia e Cola (BR Code) — gera o QR Code automaticamente
            </Label>
            <Textarea
              id="pixcc"
              value={pixCopiaCola}
              onChange={(e) => setPixCopiaCola(e.target.value)}
              placeholder="00020126...6304ABCD"
              rows={3}
              maxLength={2000}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Cole aqui o código gerado pelo seu app do banco. Se vazio, o QR Code usará a chave acima.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-dashed border-border">
            <Label className="text-xs text-muted-foreground">
              QR Code Pix (imagem) — opcional, tem prioridade sobre o gerado automaticamente
            </Label>
            <div className="flex items-center gap-4">
              <div className="h-28 w-28 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden">
                {pixQrUrl ? (
                  <img src={pixQrUrl} alt="QR Code Pix" className="max-h-full max-w-full object-contain" />
                ) : (
                  <QrCode className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={qrFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadQr(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => qrFileRef.current?.click()}
                  disabled={uploadingQr}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingQr ? "Enviando…" : "Enviar imagem do QR"}
                </Button>
                {pixQrUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPixQrUrl("");
                      m.mutate({ pixQr: "" });
                    }}
                    className="text-muted-foreground"
                  >
                    Remover QR Code
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mensagem WhatsApp personalizada */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Label htmlFor="wa-template" className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            Mensagem padrão para o WhatsApp do cliente
          </Label>
          <Textarea
            id="wa-template"
            value={waTemplate}
            onChange={(e) => setWaTemplate(e.target.value)}
            placeholder={DEFAULT_WHATSAPP_TEMPLATE}
            rows={4}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">
            Use as variáveis <code>{"{cliente}"}</code>, <code>{"{data}"}</code>,
            {" "}<code>{"{horario}"}</code> e <code>{"{procedimento}"}</code>. Elas serão substituídas
            automaticamente ao clicar no ícone do WhatsApp no atendimento.
          </p>
        </div>

        <Button onClick={() => m.mutate({})} disabled={m.isPending || q.isLoading} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {m.isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres");
      return;
    }
    if (pw !== pw2) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada com sucesso");
    setPw("");
    setPw2("");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg">Alterar senha</h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="new-pw">Nova senha</Label>
          <Input
            id="new-pw"
            type="password"
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-pw2">Confirmar nova senha</Label>
          <Input
            id="new-pw2"
            type="password"
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando…" : "Atualizar senha"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Mínimo de 8 caracteres. Você continuará logado após a alteração.
        </p>
      </form>
    </div>
  );
}
