## Visão Geral

Implementação completa do fluxo de cobrança mensal entre Master ↔ Tenant, com upload de comprovante, log de visualização do QR e alertas diários de contas a vencer em ambos os painéis.

## 1. Banco de Dados (uma migration)

### Tabelas novas

**`payment_logs`** — log mensal por tenant
- `id`, `tenant_id` (FK), `mes_referencia` (date, primeiro dia do mês, único por tenant)
- `qr_visualizado_em` (timestamptz, nullable)
- `comprovante_url` (text, nullable)
- `comprovante_enviado_em` (timestamptz, nullable)
- `status` (enum: `pendente` | `aguardando_conferencia` | `pago` | `rejeitado`)
- `revisado_em`, `revisado_por`, `nota_revisao`
- RLS: tenant lê/escreve só o próprio; superadmin gerencia tudo

**`daily_costs`** — contas a pagar (Master tem `tenant_id = NULL`; tenants têm o próprio)
- `id`, `tenant_id` (nullable), `descricao`, `valor` (numeric), `data_vencimento` (date), `status` (enum: `pendente` | `pago`), `pago_em`
- RLS: tenant vê/edita só com seu `tenant_id`; superadmin gerencia `tenant_id IS NULL` (custos master) e tudo

### Storage
- Bucket `comprovantes` (privado), com policies de upload/leitura por tenant + superadmin
- Configuração do QR Master: vamos reutilizar `contact_settings.pix_qr_url` + `pix_copia_cola` + `pix_key` (já existe e só superadmin gerencia)

## 2. Painel Master

### `/master/index.tsx` (Dashboard)
- Novo card no topo: **"Contas vencendo hoje"** — lista `daily_costs` onde `tenant_id IS NULL AND data_vencimento = today AND status='pendente'`, com botão de marcar como paga.

### `/master/clientes.tsx`
- Tabela existente ganha colunas:
  - **Vencimento** (dia + valor)
  - **Status do mês** (badge: Pendente / Aguardando Conferência / Pago / Rejeitado)
  - **QR visualizado** ("👁️ DD/MM HH:MM" ou "❌ Não visualizado")
  - **Comprovante** (botão "Ver" se enviado; "Aprovar" / "Rejeitar")
- Quando há comprovantes aguardando, destaque visual (linha em amber).

### `/master/cobranca.tsx` (nova rota, ou seção no dashboard)
- Card **QR Code Master**: upload de imagem para `contact_settings.pix_qr_url` (bucket `branding`) + campos pix_key e pix_copia_cola.
- Card **Meus custos do dia** (mesma fonte do card do topo, mas com gestão completa: adicionar / editar / remover).

## 3. Painel Tenant

### `/index.tsx` (Dashboard)
- Nova seção no topo: **"Contas vencendo hoje"** — `daily_costs` do tenant com `data_vencimento = today AND status='pendente'`.

### `/pagar-mensalidade.tsx` (nova rota)
- Mostra: valor do mês (do tenant), status atual (do `payment_logs` do mês corrente, criado on-demand).
- Botão **"Gerar QR Code para pagamento"** → chama server fn que faz upsert no `payment_logs` setando `qr_visualizado_em = now()` se ainda nulo, e retorna o QR Master.
- Após clicar, exibe a imagem do QR + chave Pix copia-e-cola.
- Campo de upload de comprovante → envia ao bucket `comprovantes`, atualiza `payment_logs` (url + status `aguardando_conferencia`).
- Histórico simples dos últimos 6 meses.

### `/custos.tsx` (existente)
- Adicionar gestão de **contas a vencer** (daily_costs) ao lado das despesas já existentes — campos data_vencimento + status, para alimentar o alerta do dashboard.

## 4. Server functions (novas, em `src/lib/billing.functions.ts`)

- `getCurrentMonthPaymentLog()` — tenant: lê/cria log do mês corrente
- `registerQrViewed()` — tenant: marca qr_visualizado_em
- `submitComprovante({ url })` — tenant: salva url + muda status
- `listTenantBillingOverview()` — master: junta tenants + payment_log do mês + dias de vencimento
- `reviewPayment({ logId, decision, nota })` — master: aprovar/rejeitar
- `listDailyCosts({ scope: 'master'|'tenant' })`, `upsertDailyCost`, `deleteDailyCost`, `markDailyCostPaid`
- `getMasterQr()` — público para tenants autenticados: retorna pix_qr_url + pix_key + pix_copia_cola
- `updateMasterQr({ pix_key, pix_copia_cola, pix_qr_url })` — superadmin

## 5. Navegação
- Tenant `AppShell`: adicionar item **"Mensalidade"** (CreditCard icon) → `/pagar-mensalidade`
- Master: adicionar tab **"Cobrança"** → `/master/cobranca` (ou anexar ao dashboard se preferir manter as tabs atuais — proposta: nova tab)

## Riscos / decisões
- Storage: bucket privado novo `comprovantes` com policies por caminho `{tenant_id}/...`
- O campo `monthly_price` e `due_day` já existem em `tenants` — vou usá-los direto, sem duplicar.
- Status do mês é derivado: se não há `payment_logs` para `mes_referencia` corrente → "Pendente"; caso contrário, usa o `status` do log.

Confirma para eu aplicar?