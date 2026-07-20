# PLANO TÉCNICO — ETAPA 20A.1: QUERIES E ÍNDICES

## ÍNDICES EXISTENTES

| Tabela | Índice | Colunas | Migration |
|--------|--------|---------|-----------|
| audit_log | idx_audit_log_guild_created | (guild_id, created_at DESC) | 004 |
| audit_log | idx_audit_log_guild_module | (guild_id, module) | 004 |
| audit_log | idx_audit_log_guild_actor | (guild_id, actor_id) | 004 |
| web_sessions | idx_web_sessions_user | (user_id) | 005 |
| web_sessions | idx_web_sessions_expires | (expires_at) | 005 |
| tickets | idx_tickets_guild_status | (guild_id, status) | 006 |
| tickets | idx_tickets_guild_user | (guild_id, user_id) | 006 |
| tickets | idx_tickets_guild_created | (guild_id, created_at DESC) | 006 |
| orders | idx_orders_guild_status | (guild_id, status) | 006 |
| orders | idx_orders_guild_client | (guild_id, client_id) | 006 |
| orders | idx_orders_guild_created | (guild_id, created_at DESC) | 006 |
| clients | idx_clients_guild | (guild_id) | 006 |
| clients | idx_clients_guild_discord | (guild_id, discord_id) | 006 |
| connections | idx_connections_guild_enabled | (guild_id, enabled) | 006 |
| connections | idx_connections_guild_action | (guild_id, action) | 006/007 |

---

## PROBLEMAS IDENTIFICADOS

### GRUPO A: Paginação Ineficiente na API (Alta Prioridade)

#### A.1 — GET /api/guilds/:guildId/tickets
**Arquivo:** `src/web/routes/api.mjs` (linhas 183-207)

**Query Atual:**
```javascript
const tickets = listTickets(guildId, filters);  // carrega TODOS os tickets
const paginated = tickets.slice(start, start + lim);  // depois faz slice
```

**Problema:** Carrega todos os tickets do servidor para depois fazer slice. Ineficiente com muitos tickets.

**Recomendação:** Modificar `listTickets` para aceitar `LIMIT` e `OFFSET`, fazer a paginação no SQLite.

**Risco:** Baixo — só adicionar parâmetros opcionais

**Teste:** Criar teste de performance com 1000+ tickets

---

#### A.2 — GET /api/guilds/:guildId/orders
**Arquivo:** `src/web/routes/api.mjs` (linhas 209-235)

**Query Atual:**
```javascript
const orders = listOrders(guildId, filters);  // já tem LIMIT mas...
const paginated = orders.slice(start, start + lim);  // faz slice denovo
```

**Problema:** `listOrders` já tem LIMIT, mas a API faz slice novamente.

**Recomendação:** Remover o slice redundante na API.

**Risco:** Baixo — já funciona, é só remover código.

**Teste:** Verificar que a paginação continua funcionando corretamente

---

#### A.3 — GET /api/guilds/:guildId/clients
**Arquivo:** `src/web/routes/api.mjs` (linhas 237-262)

**Query Atual:**
```javascript
const clients = listClients(guildId);  // carrega TODOS
const paginated = clients.slice(start, start + lim);
```

**Problema:** Mesmo problema que tickets.

**Recomendação:** Adicionar LIMIT/OFFSET em `listClients`.

**Risco:** Baixo

**Teste:** Criar teste com 500+ clientes

---

#### A.4 — GET /api/guilds/:guildId/automations
**Arquivo:** `src/web/routes/api19c.mjs` (linhas 283-287)

**Query Atual:**
```javascript
const all = listAutomations(guildId, { trigger });
const p = paginate(all, page, limit);
```

**Problema:** Carrega todas as automações para paginar.

**Recomendação:** Modificar `listAutomations` para aceitar LIMIT/OFFSET.

**Risco:** Baixo

**Teste:** Teste com automações

---

#### A.5 — GET /api/guilds/:guildId/proofs
**Arquivo:** `src/web/routes/api19c.mjs` (linhas 781-788)

**Query Atual:**
```javascript
const proofs = listProofs(guildId, { limit: lim, vendorId: vendorId || undefined });
const p = paginate(proofs, page, lim);
```

**Problema:** `listProofs` já tem LIMIT, mas paginação faz slice novamente.

**Recomendação:** Remover slice redundante.

**Risco:** Baixo

---

#### A.6 — GET /api/guilds/:guildId/products
**Arquivo:** `src/web/routes/api19c.mjs` (linhas 555-562)

**Query Atual:**
```javascript
const products = listProducts(guildId, { status, limit: lim, offset });
const pg = Math.max(1, parseInt(String(page), 10));
const paginated = products.slice(start, start + lim);
```

**Problema:** Já usa offset, mas faz slice também.

**Recomendação:** Remover slice redundante.

**Risco:** Baixo

---

#### A.7 — GET /api/guilds/:guildId/panels
**Arquivo:** `src/web/routes/api19c.mjs` (linhas 407-414)

**Query Atual:**
```javascript
const panels = listPanels(guildId, { status, limit: lim, offset });
const pg = Math.max(1, parseInt(String(page), 10));
const paginated = panels.slice(start, start + lim);
```

**Problema:** Mesmo problema.

**Recomendação:** Remover slice redundante.

**Risco:** Baixo

---

### GRUPO B: Queries com SELECT * Desnecessário (Média Prioridade)

#### B.1 — getTicket (Tickets.mjs)
**Arquivo:** `src/database/repositories/Tickets.mjs` (linha 108)

**Query Atual:**
```javascript
db.prepare('SELECT * FROM tickets WHERE id = ? AND guild_id = ?').get(id, guildId);
```

**Problema:** Traz todas as colunas, mas só usa algumas no normalize.

**Recomendação:** Selecionar apenas as colunas necessárias:
```javascript
db.prepare('SELECT id, guild_id, channel_id, user_id, status, created_at, closed_at, closed_by, reopen_count FROM tickets WHERE id = ? AND guild_id = ?').get(id, guildId);
```

**Risco:** Baixo — columns are well defined

**Teste:** Verificar que todos os campos são retornados corretamente

---

#### B.2 — getOrder (Orders.mjs)
**Arquivo:** `src/database/repositories/Orders.mjs` (linha 80)

**Problema:** Mesmo caso.

**Recomendação:** Listar colunas explicitamente.

**Risco:** Baixo

---

#### B.3 — getClient (Clients.mjs)
**Arquivo:** `src/database/repositories/Clients.mjs` (linha 73)

**Problema:** Mesmo caso.

**Recomendação:** Listar colunas explicitamente.

**Risco:** Baixo

---

#### B.4 — getProof (Proofs.mjs)
**Arquivo:** `src/database/repositories/Proofs.mjs` (linha 75)

**Problema:** Mesmo caso.

**Recomendação:** Listar colunas explicitamente.

**Risco:** Baixo

---

#### B.5 — getProduct (Products.mjs)
**Arquivo:** `src/database/repositories/Products.mjs` (linha 66)

**Problema:** Mesmo caso.

**Recomendação:** Listar colunas explicitamente.

**Risco:** Baixo

---

#### B.6 — getPanel (CustomPanels.mjs)
**Arquivo:** `src/database/repositories/CustomPanels.mjs` (linha 65)

**Problema:** Mesmo caso.

**Recomendação:** Listar colunas explicitamente.

**Risco:** Baixo

---

#### B.7 — getTemplate (Templates.mjs)
**Arquivo:** `src/database/repositories/Templates.mjs` (linha 51)

**Problema:** Mesmo caso.

**Recomendação:** Listar colunas explicitamente.

**Risco:** Baixo

---

### GRUPO C: Índices Potencialmente Úteis (Média Prioridade)

#### C.1 — Índice em automation_logs
**Tabela:** automation_logs
**Uso:** `listAutomationLogs` filtra por guild_id, automation_id, result

**Índice Recomendado:**
```sql
CREATE INDEX idx_automation_logs_guild_automation ON automation_logs (guild_id, automation_id);
CREATE INDEX idx_automation_logs_guild_result ON automation_logs (guild_id, result);
```

**Risco:** Baixo — índices adicionais não afetam writes significativamente

---

#### C.2 — Índice em purchase_log
**Tabela:** purchase_log
**Uso:** `listPurchaseLogs` filtra por guild_id, product_id

**Índice Recomendado:**
```sql
CREATE INDEX idx_purchase_log_guild_product ON purchase_log (guild_id, product_id);
```

**Risco:** Baixo

---

#### C.3 — Índice em panel_buttons
**Tabela:** panel_buttons
**Uso:** `listButtons` filtra por panel_id, guild_id

**Índice Recomendado:**
```sql
CREATE INDEX idx_panel_buttons_panel ON panel_buttons (panel_id, guild_id);
```

**Risco:** Baixo

---

### GRUPO D: Queries com LIKE que Podem Ser Lentas (Média Prioridade)

#### D.1 — listClients com search
**Arquivo:** `src/database/repositories/Clients.mjs` (linhas 103-114)

**Query Atual:**
```javascript
"SELECT * FROM clients WHERE guild_id = ? AND (display_name LIKE ? OR email LIKE ? OR discord_id LIKE ?)"
```

**Problema:** LIKE com wildcard no início (`%query%`) não usa índice.

**Recomendação:** Considerar FULLTEXT search ou manter LIKE simples (não crítico para poucos registros).

**Risco:** Nenhum — funciona corretamente

**Nota:** Para poucos clientes ( <1000 ), LIKE é aceitável.

---

#### D.2 — findProductByName com LIKE
**Arquivo:** `src/database/repositories/Products.mjs` (linha 101)

**Problema:** LIKE com wildcards não usa índice eficientemente.

**Recomendação:** Manter LIKE simples (caso de uso não crítico).

**Risco:** Nenhum

---

### GRUPO E: getAuditStats — Múltiplas Queries COUNT (Baixa Prioridade)

**Arquivo:** `src/database/repositories/AuditLog.mjs` (linhas 219-259)

**Problema:** Executa 7 queries separadas para estatísticas.

**Recomendação:** Consolidar em uma query única com agregação:
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN module = 'tickets' THEN 1 ELSE 0 END) as tickets,
  SUM(CASE WHEN module = 'orders' THEN 1 ELSE 0 END) as orders,
  ...
  SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as last24h
FROM audit_log WHERE guild_id = ?
```

**Risco:** Médio — mudança de estrutura de retorno pode quebrar código

**Teste:** Verificar que todas as estatísticas são retornadas

---

## PLANO DE IMPLEMENTAÇÃO PRIORIZADO

### Fase 1: Remover Slices Redundantes (Mais Seguro)
1. A.5 — proofs (remover slice)
2. A.6 — products (remover slice)
3. A.7 — panels (remover slice)

**Teste:** Executar 939 testes após cada mudança

### Fase 2: Paginação Correta com LIMIT/OFFSET
1. A.2 — orders (remover slice duplo)
2. A.1 — tickets (adicionar LIMIT/OFFSET em listTickets)
3. A.3 — clients (adicionar LIMIT/OFFSET em listClients)
4. A.4 — automations (adicionar LIMIT/OFFSET em listAutomations)

**Teste:** Executar 939 testes + verificar paginação

### Fase 3: SELECT * Explícito (Reforço de Tipo)
1. B.1 a B.7 — todas as funções get* com SELECT *

**Teste:** Executar 939 testes

### Fase 4: Índices Adicionais (Se Necessário)
1. C.1 — automation_logs
2. C.2 — purchase_log
3. C.3 — panel_buttons

**Teste:** Executar 939 testes + verificar EXPLAIN QUERY PLAN

### Fase 5: Consolidar getAuditStats (Se Viável)
1. E.1 — consolidar queries de estatísticas

**Teste:** Executar 939 testes + verificar estrutura de retorno

---

## IMPACTO ESTIMADO

| Otimização | Impacto | Risco |
|------------|---------|-------|
| Remover slices | Reduz memória em ~10-50% para grandes datasets | Baixo |
| LIMIT/OFFSET | Reduz I/O e memória significativamente | Baixo |
| SELECT * explícito | Marginal — melhor para type safety | Baixo |
| Novos índices | Melhoria em queries específicas | Baixo |
| Consolidar COUNT | Reduz queries de 7 para 1 | Médio |

---

## TESTES NECESSÁRIOS

1. **Teste de paginação**: Criar 100+ registros, verificar primeira página, última página, páginas intermediárias
2. **Teste de performance**: Comparar tempo antes/depois com dataset grande
3. **Teste de regressão**: Garantir que 939 testes continuam passando

---

## BENCHMARK BASELINE (Antes)

```
npm test
# tests 939
# pass 939
# fail 0
# cancelled 0
# duration_ms ~8000
```

---

## NÃO RECOMENDADO NESTA FASE

- Cache (reservado para 20A.2)
- Rate limiting (reservado para 20A.3)
- Redis ou outro banco
- Alteração de arquitetura
- Processamento assíncrono

---

## PRÓXIMO PASSO

Após aprovação deste plano, implementar **Fase 1** (remover slices redundantes) e executar testes.
