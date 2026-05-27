# Painel Master + Arquitetura Multi-Tenant

Hoje o app é mono-tenant: todas as tabelas (`appointments`, `clients`, `expenses`, `procedures`, `contact_settings`, `agenda_days`, `appointment_payments`) são compartilhadas e qualquer usuário autenticado vê tudo. Vamos transformar em SaaS com você (super admin) gerindo N clientes isolados.

## 1. Modelo de dados (migração)

Novas tabelas:

- **`tenants`** — um por cliente do SaaS
  - `id`, `business_name`, `owner_name`, `whatsapp`, `slug` (URL: `/t/{slug}`)
  - `plan_name`, `monthly_price` (numeric), `due_day` (1–31)
  - `status` enum: `ativo` | `inadimplente` | `suspenso`
  - `logo_url`, `primary_color` (hex/oklch), `theme`
  - `pix_key`, `pix_copia_cola`, `pix_qr_url`, `instagram_url` (movido de contact_settings)
  - `created_at`, `updated_at`

- **`app_role`** enum: `superadmin` | `tenant_owner` | `tenant_member`
- **`user_roles`** — `user_id`, `role`, `tenant_id` (null para superadmin)
- **`profiles`** — `user_id`, `display_name`, `tenant_id`

Adicionar `tenant_id uuid NOT NULL` em:
`appointments`, `clients`, `expenses`, `procedures`, `agenda_days`, `appointment_payments`.

Dados existentes: criar um tenant "default" e atribuir todas as linhas atuais a ele (você ganha um tenant inicial pronto, e o usuário admin atual vira `tenant_owner` desse tenant — não superadmin, para evitar perder acesso aos dados existentes). Em seguida criamos o seu usuário superadmin separado.

`contact_settings` é descontinuado em favor de campos no `tenants` (mantemos a tabela por compatibilidade, mas ler/escrever passa pelo tenant).

## 2. Segurança (RLS)

Funções `SECURITY DEFINER`:
- `has_role(uid, role)` — checa role
- `is_superadmin(uid)` — atalho
- `current_tenant_id(uid)` — retorna o `tenant_id` do user

Política padrão em toda tabela com `tenant_id`:
```
USING (is_superadmin(auth.uid()) OR tenant_id = current_tenant_id(auth.uid()))
WITH CHECK (tenant_id = current_tenant_id(auth.uid()))
```
Superadmin lê tudo, mas escrita continua escopada para evitar contaminação acidental (exceto via server functions admin).

`tenants`: leitura/escrita só para superadmin via server functions com `supabaseAdmin`. Tenant owner pode ler/atualizar **apenas** sua linha (logo/cor/pix).

## 3. Painel Master (`/master/*`)

Rotas protegidas por `_superadmin` layout que valida `is_superadmin` no `beforeLoad`:

- `/master` — Dashboard BI (dark/corporativo):
  - Cards: Clientes Ativos, Inativos (suspenso+inadimplente), MRR (soma de `monthly_price` dos ativos), Novos no mês
  - Gráfico de crescimento mensal (novos tenants por mês, últimos 6 meses)
- `/master/clientes` — tabela de tenants com colunas pedidas, toggle de status inline (Ativo/Inadimplente/Suspenso), busca, botão "Novo cliente"
- `/master/clientes/novo` e `/master/clientes/$id` — formulário (white-label: upload de logo no bucket `branding`, color picker para `primary_color`, plano, vencimento, criar usuário owner com senha provisória)

Visual: tema próprio (zinc/slate dark, mono accents) — diferente dos temas coloridos dos tenants.

## 4. Painel do Tenant (existente, adaptado)

- Todas as queries existentes em `src/routes/index.tsx`, `clientes.tsx`, `agenda.tsx`, etc. continuam funcionando porque RLS já filtra por `tenant_id` automaticamente — **nenhuma mudança de código de leitura necessária**, só os inserts ganham `tenant_id` (via trigger `BEFORE INSERT` que preenche automaticamente com `current_tenant_id(auth.uid())`, então o frontend nem precisa enviar).
- `ThemeApplier` e logo no header passam a ler de `tenants` (sua linha) em vez de `contact_settings`.
- Configurações → edita apenas campos white-label do próprio tenant.

## 5. Bloqueio por status

Server function `getMyAccessState` retorna `{ status, tenant }`. Um guard global no `_authenticated` layout (ou no root para autenticados não-superadmin):

- `status = 'suspenso'` → renderiza tela cheia "Acesso bloqueado. Por favor, entre em contato com o suporte." com WhatsApp do suporte, e bloqueia toda navegação.
- `status = 'inadimplente'` → banner amarelo no topo avisando, mas permite uso (regra comum em SaaS; posso mudar para bloquear também se preferir).
- `status = 'ativo'` → uso normal.

## 6. Roteamento por tenant

Para a URL personalizada (`app.com/studio-maria`): vamos com **path-based** (`/t/{slug}`) em vez de subdomínio, porque subdomínio exige config DNS/wildcard fora do Lovable. O slug é usado apenas como vanity URL no login compartilhável; o isolamento real é por `tenant_id` do usuário autenticado, não pela URL.

## Detalhes técnicos

- Migração roda em transação: cria tenants/roles, cria tenant default, popula `tenant_id` nas tabelas existentes, **depois** aplica `NOT NULL` e RLS nova.
- Triggers `BEFORE INSERT` em cada tabela preenchem `tenant_id` automaticamente — frontend atual não precisa ser alterado.
- Criação de usuário owner: server function com `supabaseAdmin.auth.admin.createUser`, insere em `profiles` + `user_roles` com `role='tenant_owner'` e o `tenant_id`.
- Seu superadmin (`d3c030@gmail.com`) ganha role `superadmin` e perde o vínculo com o tenant default (que fica com o usuário owner que você designar — posso deixar você como ambos se preferir, mas separar é mais limpo).

## Pontos para você decidir antes de eu implementar

1. **Seu usuário atual (`d3c030@gmail.com`):** vira só superadmin (não vê dados operacionais do tenant default) ou acumula superadmin + owner do tenant default?
2. **Inadimplente:** bloqueia acesso igual suspenso, ou só mostra banner de aviso?
3. **Vanity URL `/t/{slug}`:** implemento agora (rota pública de login bonita por cliente) ou deixo para depois e mantenho login único em `/login`?
4. **Migração dos dados atuais:** confirmo que todas as linhas existentes vão para um tenant chamado "Estúdio Principal" (você pode renomear depois em `/master/clientes`)?

Assim que você responder essas 4, executo migração + código.
