/**
 * API REST — Etapa 19C: Gerenciamento avançado do Dashboard.
 *
 * Este router é montado em api.mjs via router.use(api19c).
 * Herda sessionMiddleware + requireAuth do router pai.
 *
 * Entidades cobertas:
 *   Templates   — CRUD completo
 *   Connections — CRUD completo + toggle + clear-error
 *   Automations — CRUD completo + toggle + logs + meta
 *   Panels      — CRUD completo + buttons
 *   Products    — CRUD completo + stock
 *   Orders      — get-one + status update (VALID_TRANSITIONS)
 *   Clients     — get-one + update + delete
 *   Proofs      — listagem com filtros
 *   Settings    — configurações de tickets (read + write)
 *
 * Segurança:
 *   - requireGuildAccess verifica acesso ao servidor antes de cada rota
 *   - guildId sempre vem de req.params (nunca do body)
 *   - Nenhuma transição de status inválida é permitida
 */

import { Router } from 'express';
import { requireGuildAccess } from '../middleware/requireAuth.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Repositories ──────────────────────────────────────────────────────────────
import {
  createTemplate, getTemplate, listTemplates, updateTemplate, deleteTemplate,
} from '../../database/repositories/Templates.mjs';

import {
  createConnection, getConnection, listConnections, updateConnection,
  deleteConnection, markConnectionError, clearConnectionError,
} from '../../database/repositories/Connections.mjs';

import {
  createAutomation, getAutomation, listAutomations, updateAutomation,
  deleteAutomation, enableAutomation, disableAutomation,
  getAutomationLogs, countAutomations,
} from '../../database/repositories/Automations.mjs';

import {
  createPanel, getPanel, listPanels, updatePanel, deletePanel, countPanels,
  addButton, listButtons, deleteButton,
  VALID_ACTION_TYPES, VALID_STYLES,
} from '../../database/repositories/CustomPanels.mjs';

import {
  createProduct, getProduct, listProducts, updateProduct, deleteProduct,
  adjustStock, setStock, countProducts, PRODUCT_STATUS,
} from '../../database/repositories/Products.mjs';

import {
  getOrder, listOrders, updateOrderStatus,
} from '../../database/repositories/Orders.mjs';

import {
  getClient, listClients, updateClient, deleteClient,
} from '../../database/repositories/Clients.mjs';

import {
  listProofs, countProofs,
} from '../../database/repositories/Proofs.mjs';

import {
  getTicketConfig, setTicketConfig,
} from '../../database/repositories/Tickets.mjs';

import { VALID_TRANSITIONS } from '../../modules/orders/flow.mjs';

import {
  TRIGGERS_MAP, CONDITION_TYPES, ACTION_TYPES,
} from '../../modules/automations/flow.mjs';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function paginate(array, page, limit) {
  const pg  = Math.max(1, parseInt(String(page), 10));
  const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
  const start = (pg - 1) * lim;
  return {
    data:       array.slice(start, start + lim),
    total:      array.length,
    page:       pg,
    limit:      lim,
    totalPages: Math.max(1, Math.ceil(array.length / lim)),
  };
}

function err(res, status, message) {
  return res.status(status).json({ error: message });
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

/** POST /guilds/:guildId/templates — criar template */
router.post('/guilds/:guildId/templates', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { name, description, type, data } = req.body;

  if (!name?.trim()) return err(res, 400, 'O campo "name" é obrigatório.');

  try {
    const template = createTemplate(guildId, {
      name:        name.trim().slice(0, 100),
      description: description?.trim().slice(0, 300) ?? null,
      type:        type ?? 'embed',
      data:        data ?? {},
    });
    res.status(201).json({ template });
  } catch (e) {
    logger.error(`[API19C] POST /guilds/${guildId}/templates:`, e);
    err(res, 500, 'Erro ao criar modelo.');
  }
});

/** GET /guilds/:guildId/templates/:id — obter template */
router.get('/guilds/:guildId/templates/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const template = getTemplate(guildId, id);
    if (!template) return err(res, 404, 'Modelo não encontrado.');
    res.json({ template });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/templates/${id}:`, e);
    err(res, 500, 'Erro ao carregar modelo.');
  }
});

/** PATCH /guilds/:guildId/templates/:id — atualizar template */
router.patch('/guilds/:guildId/templates/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const patch = {};
  if (req.body.name        !== undefined) patch.name        = req.body.name?.trim().slice(0, 100);
  if (req.body.description !== undefined) patch.description = req.body.description?.trim().slice(0, 300) ?? null;
  if (req.body.data        !== undefined) patch.data        = req.body.data;

  try {
    const template = updateTemplate(guildId, id, patch);
    if (!template) return err(res, 404, 'Modelo não encontrado.');
    res.json({ template });
  } catch (e) {
    logger.error(`[API19C] PATCH /guilds/${guildId}/templates/${id}:`, e);
    err(res, 500, 'Erro ao atualizar modelo.');
  }
});

/** DELETE /guilds/:guildId/templates/:id — excluir template */
router.delete('/guilds/:guildId/templates/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const deleted = deleteTemplate(guildId, id);
    if (!deleted) return err(res, 404, 'Modelo não encontrado.');
    res.json({ ok: true, id });
  } catch (e) {
    logger.error(`[API19C] DELETE /guilds/${guildId}/templates/${id}:`, e);
    err(res, 500, 'Erro ao excluir modelo.');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTIONS
// ══════════════════════════════════════════════════════════════════════════════

/** POST /guilds/:guildId/connections — criar conexão */
router.post('/guilds/:guildId/connections', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { action, templateId, targetChannelId, enabled } = req.body;

  if (!action?.trim())           return err(res, 400, 'O campo "action" é obrigatório.');
  if (!templateId?.trim())       return err(res, 400, 'O campo "templateId" é obrigatório.');
  if (!targetChannelId?.trim())  return err(res, 400, 'O campo "targetChannelId" é obrigatório.');

  try {
    const connection = createConnection(guildId, {
      action: action.trim(),
      templateId: templateId.trim(),
      targetChannelId: targetChannelId.trim(),
      enabled: enabled !== false,
    });
    res.status(201).json({ connection });
  } catch (e) {
    logger.error(`[API19C] POST /guilds/${guildId}/connections:`, e);
    err(res, 500, 'Erro ao criar conexão.');
  }
});

/** GET /guilds/:guildId/connections/:id — obter conexão */
router.get('/guilds/:guildId/connections/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const connection = getConnection(guildId, id);
    if (!connection) return err(res, 404, 'Conexão não encontrada.');
    res.json({ connection });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/connections/${id}:`, e);
    err(res, 500, 'Erro ao carregar conexão.');
  }
});

/** PATCH /guilds/:guildId/connections/:id — atualizar conexão */
router.patch('/guilds/:guildId/connections/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const patch = {};
  if (req.body.action          !== undefined) patch.action          = req.body.action;
  if (req.body.templateId      !== undefined) patch.templateId      = req.body.templateId;
  if (req.body.targetChannelId !== undefined) patch.targetChannelId = req.body.targetChannelId;
  if (req.body.enabled         !== undefined) patch.enabled         = Boolean(req.body.enabled);

  try {
    const connection = updateConnection(guildId, id, patch);
    if (!connection) return err(res, 404, 'Conexão não encontrada.');
    res.json({ connection });
  } catch (e) {
    logger.error(`[API19C] PATCH /guilds/${guildId}/connections/${id}:`, e);
    err(res, 500, 'Erro ao atualizar conexão.');
  }
});

/** DELETE /guilds/:guildId/connections/:id — excluir conexão */
router.delete('/guilds/:guildId/connections/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const deleted = deleteConnection(guildId, id);
    if (!deleted) return err(res, 404, 'Conexão não encontrada.');
    res.json({ ok: true, id });
  } catch (e) {
    logger.error(`[API19C] DELETE /guilds/${guildId}/connections/${id}:`, e);
    err(res, 500, 'Erro ao excluir conexão.');
  }
});

/** POST /guilds/:guildId/connections/:id/toggle — ativar/desativar */
router.post('/guilds/:guildId/connections/:id/toggle', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const existing = getConnection(guildId, id);
    if (!existing) return err(res, 404, 'Conexão não encontrada.');
    const connection = updateConnection(guildId, id, { enabled: !existing.enabled });
    res.json({ connection });
  } catch (e) {
    logger.error(`[API19C] POST /guilds/${guildId}/connections/${id}/toggle:`, e);
    err(res, 500, 'Erro ao alternar conexão.');
  }
});

/** POST /guilds/:guildId/connections/:id/clear-error — limpar erro */
router.post('/guilds/:guildId/connections/:id/clear-error', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const existing = getConnection(guildId, id);
    if (!existing) return err(res, 404, 'Conexão não encontrada.');
    clearConnectionError(guildId, id);
    res.json({ ok: true, id });
  } catch (e) {
    logger.error(`[API19C] POST /guilds/${guildId}/connections/${id}/clear-error:`, e);
    err(res, 500, 'Erro ao limpar erro da conexão.');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTOMATIONS
// ══════════════════════════════════════════════════════════════════════════════

/** GET /guilds/:guildId/automations/meta — triggers, conditions e actions disponíveis */
router.get('/guilds/:guildId/automations/meta', requireGuildAccess, (_req, res) => {
  res.json({
    triggers:   Object.values(TRIGGERS_MAP),
    conditions: Object.values(CONDITION_TYPES),
    actions:    Object.values(ACTION_TYPES),
  });
});

/** GET /guilds/:guildId/automations — listar automações */
router.get('/guilds/:guildId/automations', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { trigger, page = '1', limit = '20' } = req.query;
  try {
    const pg     = Math.max(1, parseInt(String(page), 10));
    const lim    = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const offset = (pg - 1) * lim;
    // Busca apenas os registros necessários para a página
    const automations = listAutomations(guildId, { trigger: trigger || undefined, limit: lim, offset });
    // Busca total para calcular páginas
    const allAutomations = listAutomations(guildId, { trigger: trigger || undefined });
    const total = allAutomations.length;
    res.json({ guildId, automations, total, page: pg, limit: lim, totalPages: Math.max(1, Math.ceil(total / lim)) });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/automations:`, e);
    err(res, 500, 'Erro ao carregar automações.');
  }
});

/** POST /guilds/:guildId/automations — criar automação */
router.post('/guilds/:guildId/automations', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { name, trigger, conditions, actions } = req.body;

  if (!name?.trim())    return err(res, 400, 'O campo "name" é obrigatório.');
  if (!trigger?.trim()) return err(res, 400, 'O campo "trigger" é obrigatório.');
  if (!TRIGGERS_MAP[trigger]) return err(res, 400, `Gatilho inválido: "${trigger}".`);

  try {
    const automation = createAutomation(guildId, {
      name:       name.trim().slice(0, 100),
      trigger,
      conditions: Array.isArray(conditions) ? conditions : [],
      actions:    Array.isArray(actions)    ? actions    : [],
    });
    res.status(201).json({ automation });
  } catch (e) {
    logger.error(`[API19C] POST /guilds/${guildId}/automations:`, e);
    err(res, 500, 'Erro ao criar automação.');
  }
});

/** GET /guilds/:guildId/automations/:id — obter automação */
router.get('/guilds/:guildId/automations/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const automation = getAutomation(guildId, id);
    if (!automation) return err(res, 404, 'Automação não encontrada.');
    res.json({ automation });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/automations/${id}:`, e);
    err(res, 500, 'Erro ao carregar automação.');
  }
});

/** PATCH /guilds/:guildId/automations/:id — atualizar automação */
router.patch('/guilds/:guildId/automations/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const patch = {};
  if (req.body.name       !== undefined) patch.name       = req.body.name?.trim().slice(0, 100);
  if (req.body.trigger    !== undefined) {
    if (!TRIGGERS_MAP[req.body.trigger]) return err(res, 400, `Gatilho inválido: "${req.body.trigger}".`);
    patch.trigger = req.body.trigger;
  }
  if (req.body.conditions !== undefined) patch.conditions = Array.isArray(req.body.conditions) ? req.body.conditions : [];
  if (req.body.actions    !== undefined) patch.actions    = Array.isArray(req.body.actions)    ? req.body.actions    : [];

  try {
    const automation = updateAutomation(guildId, id, patch);
    if (!automation) return err(res, 404, 'Automação não encontrada.');
    res.json({ automation });
  } catch (e) {
    logger.error(`[API19C] PATCH /guilds/${guildId}/automations/${id}:`, e);
    err(res, 500, 'Erro ao atualizar automação.');
  }
});

/** DELETE /guilds/:guildId/automations/:id — excluir automação */
router.delete('/guilds/:guildId/automations/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const deleted = deleteAutomation(guildId, id);
    if (!deleted) return err(res, 404, 'Automação não encontrada.');
    res.json({ ok: true, id });
  } catch (e) {
    logger.error(`[API19C] DELETE /guilds/${guildId}/automations/${id}:`, e);
    err(res, 500, 'Erro ao excluir automação.');
  }
});

/** POST /guilds/:guildId/automations/:id/toggle — ativar/desativar */
router.post('/guilds/:guildId/automations/:id/toggle', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const existing = getAutomation(guildId, id);
    if (!existing) return err(res, 404, 'Automação não encontrada.');
    if (existing.enabled) {
      disableAutomation(guildId, id);
    } else {
      enableAutomation(guildId, id);
    }
    const automation = getAutomation(guildId, id);
    res.json({ automation });
  } catch (e) {
    logger.error(`[API19C] POST /guilds/${guildId}/automations/${id}/toggle:`, e);
    err(res, 500, 'Erro ao alternar automação.');
  }
});

/** GET /guilds/:guildId/automations/:id/logs — histórico de execuções */
router.get('/guilds/:guildId/automations/:id/logs', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const { result, limit = '50' } = req.query;
  try {
    const automation = getAutomation(guildId, id);
    if (!automation) return err(res, 404, 'Automação não encontrada.');
    const lim  = Math.min(200, Math.max(1, parseInt(String(limit), 10)));
    const logs = getAutomationLogs(guildId, { automationId: id, result: result || undefined, limit: lim });
    res.json({ guildId, automationId: id, logs, total: logs.length });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/automations/${id}/logs:`, e);
    err(res, 500, 'Erro ao carregar logs da automação.');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PANELS
// ══════════════════════════════════════════════════════════════════════════════

/** GET /guilds/:guildId/panels — listar painéis */
router.get('/guilds/:guildId/panels', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { status, page = '1', limit = '20' } = req.query;
  try {
    const pg  = Math.max(1, parseInt(String(page), 10));
    const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const panels = listPanels(guildId, { status: status || undefined, limit: lim, offset: (pg - 1) * lim });
    const total  = countPanels(guildId, { status: status || undefined });
    res.json({
      guildId, panels, total, page: pg, limit: lim,
      totalPages: Math.max(1, Math.ceil(total / lim)),
    });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/panels:`, e);
    err(res, 500, 'Erro ao carregar painéis.');
  }
});

/** POST /guilds/:guildId/panels — criar painel */
router.post('/guilds/:guildId/panels', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { name, embedTitle, embedDescription, embedColor, embedImage, embedThumbnail, embedFooter } = req.body;

  if (!name?.trim()) return err(res, 400, 'O campo "name" é obrigatório.');

  try {
    const panel = createPanel(guildId, {
      name: name.trim().slice(0, 100),
      embedTitle:       embedTitle?.trim()       || null,
      embedDescription: embedDescription?.trim() || null,
      embedColor:       embedColor               || '#5865F2',
      embedImage:       embedImage               || null,
      embedThumbnail:   embedThumbnail           || null,
      embedFooter:      embedFooter?.trim()      || null,
    });
    res.status(201).json({ panel });
  } catch (e) {
    logger.error(`[API19C] POST /guilds/${guildId}/panels:`, e);
    err(res, 500, 'Erro ao criar painel.');
  }
});

/** GET /guilds/:guildId/panels/:id — obter painel com botões */
router.get('/guilds/:guildId/panels/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const panel = getPanel(guildId, id);
    if (!panel) return err(res, 404, 'Painel não encontrado.');
    const buttons = listButtons(guildId, id);
    res.json({ panel: { ...panel, buttons } });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/panels/${id}:`, e);
    err(res, 500, 'Erro ao carregar painel.');
  }
});

/** PATCH /guilds/:guildId/panels/:id — atualizar painel */
router.patch('/guilds/:guildId/panels/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const allowed = ['name', 'embedTitle', 'embedDescription', 'embedColor', 'embedImage', 'embedThumbnail', 'embedFooter'];
  const patch = {};
  for (const k of allowed) {
    if (k in req.body) patch[k] = req.body[k];
  }

  try {
    const panel = updatePanel(guildId, id, patch);
    if (!panel) return err(res, 404, 'Painel não encontrado.');
    res.json({ panel });
  } catch (e) {
    logger.error(`[API19C] PATCH /guilds/${guildId}/panels/${id}:`, e);
    err(res, 500, 'Erro ao atualizar painel.');
  }
});

/** DELETE /guilds/:guildId/panels/:id — excluir painel */
router.delete('/guilds/:guildId/panels/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const deleted = deletePanel(guildId, id);
    if (!deleted) return err(res, 404, 'Painel não encontrado.');
    res.json({ ok: true, id });
  } catch (e) {
    logger.error(`[API19C] DELETE /guilds/${guildId}/panels/${id}:`, e);
    err(res, 500, 'Erro ao excluir painel.');
  }
});

/** GET /guilds/:guildId/panels/:id/buttons — listar botões */
router.get('/guilds/:guildId/panels/:id/buttons', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const panel = getPanel(guildId, id);
    if (!panel) return err(res, 404, 'Painel não encontrado.');
    const buttons = listButtons(guildId, id);
    res.json({ panelId: id, buttons });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/panels/${id}/buttons:`, e);
    err(res, 500, 'Erro ao carregar botões.');
  }
});

/** POST /guilds/:guildId/panels/:id/buttons — adicionar botão */
router.post('/guilds/:guildId/panels/:id/buttons', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const { label, style, emoji, actionType, actionData } = req.body;

  if (!label?.trim())   return err(res, 400, 'O campo "label" é obrigatório.');
  if (!actionType)      return err(res, 400, 'O campo "actionType" é obrigatório.');
  if (!VALID_ACTION_TYPES.includes(actionType))
    return err(res, 400, `Tipo de ação inválido. Válidos: ${VALID_ACTION_TYPES.join(', ')}`);
  if (style && !VALID_STYLES.includes(style))
    return err(res, 400, `Estilo inválido. Válidos: ${VALID_STYLES.join(', ')}`);

  try {
    const button = addButton(guildId, id, {
      label:      label.trim().slice(0, 80),
      style:      style || 'Primary',
      emoji:      emoji?.trim() || null,
      actionType,
      actionData: actionData ?? {},
    });
    if (!button) return err(res, 409, 'Painel não encontrado ou limite de botões atingido (máx. 20).');
    res.status(201).json({ button });
  } catch (e) {
    logger.error(`[API19C] POST /guilds/${guildId}/panels/${id}/buttons:`, e);
    err(res, 500, 'Erro ao adicionar botão.');
  }
});

/** DELETE /guilds/:guildId/panels/:id/buttons/:btnId — remover botão */
router.delete('/guilds/:guildId/panels/:id/buttons/:btnId', requireGuildAccess, (req, res) => {
  const { guildId, id, btnId } = req.params;
  try {
    const deleted = deleteButton(guildId, id, btnId);
    if (!deleted) return err(res, 404, 'Botão não encontrado.');
    res.json({ ok: true, id: btnId });
  } catch (e) {
    logger.error(`[API19C] DELETE /guilds/${guildId}/panels/${id}/buttons/${btnId}:`, e);
    err(res, 500, 'Erro ao excluir botão.');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════════════════════════

/** GET /guilds/:guildId/products — listar produtos */
router.get('/guilds/:guildId/products', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { status, page = '1', limit = '20' } = req.query;
  try {
    const pg  = Math.max(1, parseInt(String(page), 10));
    const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const products = listProducts(guildId, { status: status || undefined, limit: lim, offset: (pg - 1) * lim });
    const total    = countProducts(guildId, { status: status || undefined });
    res.json({
      guildId, products, total, page: pg, limit: lim,
      totalPages: Math.max(1, Math.ceil(total / lim)),
    });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/products:`, e);
    err(res, 500, 'Erro ao carregar produtos.');
  }
});

/** POST /guilds/:guildId/products — criar produto */
router.post('/guilds/:guildId/products', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { name, price, stock, description, imageUrl } = req.body;

  if (!name?.trim()) return err(res, 400, 'O campo "name" é obrigatório.');

  const stockNum = stock !== undefined ? Number(stock) : 0;
  if (!Number.isInteger(stockNum) || stockNum < 0)
    return err(res, 400, 'O campo "stock" deve ser um número inteiro não-negativo.');

  try {
    const product = createProduct(guildId, {
      name:        name.trim().slice(0, 200),
      price:       price?.trim() || null,
      stock:       stockNum,
      description: description?.trim().slice(0, 500) || null,
      imageUrl:    imageUrl?.trim() || null,
    });
    res.status(201).json({ product });
  } catch (e) {
    logger.error(`[API19C] POST /guilds/${guildId}/products:`, e);
    err(res, 500, 'Erro ao criar produto.');
  }
});

/** GET /guilds/:guildId/products/:id — obter produto */
router.get('/guilds/:guildId/products/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const product = getProduct(guildId, id);
    if (!product) return err(res, 404, 'Produto não encontrado.');
    res.json({ product });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/products/${id}:`, e);
    err(res, 500, 'Erro ao carregar produto.');
  }
});

/** PATCH /guilds/:guildId/products/:id — atualizar produto */
router.patch('/guilds/:guildId/products/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const allowed = ['name', 'price', 'description', 'imageUrl', 'status'];
  const patch = {};
  for (const k of allowed) {
    if (k in req.body) patch[k] = req.body[k] ?? null;
  }
  if (patch.name !== undefined && patch.name !== null) patch.name = String(patch.name).trim().slice(0, 200);

  try {
    const product = updateProduct(guildId, id, patch);
    if (!product) return err(res, 404, 'Produto não encontrado.');
    res.json({ product });
  } catch (e) {
    logger.error(`[API19C] PATCH /guilds/${guildId}/products/${id}:`, e);
    err(res, 500, 'Erro ao atualizar produto.');
  }
});

/** DELETE /guilds/:guildId/products/:id — excluir produto */
router.delete('/guilds/:guildId/products/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const deleted = deleteProduct(guildId, id);
    if (!deleted) return err(res, 404, 'Produto não encontrado.');
    res.json({ ok: true, id });
  } catch (e) {
    logger.error(`[API19C] DELETE /guilds/${guildId}/products/${id}:`, e);
    err(res, 500, 'Erro ao excluir produto.');
  }
});

/** PATCH /guilds/:guildId/products/:id/stock — definir estoque */
router.patch('/guilds/:guildId/products/:id/stock', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const { qty, delta } = req.body;

  if (qty !== undefined) {
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 0)
      return err(res, 400, 'O campo "qty" deve ser um número inteiro não-negativo.');
    try {
      const product = setStock(guildId, id, n);
      if (!product) return err(res, 404, 'Produto não encontrado.');
      return res.json({ product });
    } catch (e) {
      logger.error(`[API19C] PATCH /guilds/${guildId}/products/${id}/stock (set):`, e);
      return err(res, 500, 'Erro ao definir estoque.');
    }
  }

  if (delta !== undefined) {
    const d = Number(delta);
    if (!Number.isInteger(d)) return err(res, 400, 'O campo "delta" deve ser um número inteiro.');
    try {
      const result = adjustStock(guildId, id, d);
      if (!result.ok) {
        const code = result.reason === 'product_not_found' ? 404 : 409;
        return err(res, code, result.reason === 'product_not_found' ? 'Produto não encontrado.' : 'Estoque insuficiente.');
      }
      return res.json({ product: result.product });
    } catch (e) {
      logger.error(`[API19C] PATCH /guilds/${guildId}/products/${id}/stock (delta):`, e);
      return err(res, 500, 'Erro ao ajustar estoque.');
    }
  }

  return err(res, 400, 'Informe "qty" (quantidade absoluta) ou "delta" (variação).');
});

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS — get-one + status update
// ══════════════════════════════════════════════════════════════════════════════

/** GET /guilds/:guildId/orders/:id — obter pedido */
router.get('/guilds/:guildId/orders/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const order = getOrder(guildId, id);
    if (!order) return err(res, 404, 'Pedido não encontrado.');
    res.json({ order });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/orders/${id}:`, e);
    err(res, 500, 'Erro ao carregar pedido.');
  }
});

/** PATCH /guilds/:guildId/orders/:id/status — atualizar status (respeita VALID_TRANSITIONS) */
router.patch('/guilds/:guildId/orders/:id/status', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const { status } = req.body;

  if (!status?.trim()) return err(res, 400, 'O campo "status" é obrigatório.');

  try {
    const result = updateOrderStatus(guildId, id, status.trim());
    if (!result.ok) {
      if (result.reason === 'not_found')         return err(res, 404, 'Pedido não encontrado.');
      if (result.reason === 'terminal_status')   return err(res, 409, 'Pedido em status terminal. Não pode ser alterado.');
      if (result.reason === 'invalid_transition') {
        const order   = getOrder(guildId, id);
        const allowed = VALID_TRANSITIONS[order?.status] ?? [];
        return err(res, 409, `Transição inválida de "${order?.status}" para "${status}". Permitidos: ${allowed.join(', ')}`);
      }
      return err(res, 409, result.reason);
    }
    res.json({ order: result.order });
  } catch (e) {
    logger.error(`[API19C] PATCH /guilds/${guildId}/orders/${id}/status:`, e);
    err(res, 500, 'Erro ao atualizar status do pedido.');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CLIENTS — get-one + update + delete
// ══════════════════════════════════════════════════════════════════════════════

/** GET /guilds/:guildId/clients/:id — obter cliente */
router.get('/guilds/:guildId/clients/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const client = getClient(guildId, id);
    if (!client) return err(res, 404, 'Cliente não encontrado.');
    res.json({ client });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/clients/${id}:`, e);
    err(res, 500, 'Erro ao carregar cliente.');
  }
});

/** PATCH /guilds/:guildId/clients/:id — atualizar cliente */
router.patch('/guilds/:guildId/clients/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  const patch = {};
  if (req.body.displayName !== undefined) patch.displayName = req.body.displayName?.trim() || null;
  if (req.body.discordId   !== undefined) patch.discordId   = req.body.discordId            || null;
  if (req.body.email       !== undefined) patch.email       = req.body.email?.trim()        || null;
  if (req.body.phone       !== undefined) patch.phone       = req.body.phone?.trim()        || null;
  if (req.body.notas       !== undefined) patch.notas       = req.body.notas?.trim()        || null;

  try {
    const client = updateClient(guildId, id, patch);
    if (!client) return err(res, 404, 'Cliente não encontrado.');
    res.json({ client });
  } catch (e) {
    logger.error(`[API19C] PATCH /guilds/${guildId}/clients/${id}:`, e);
    err(res, 500, 'Erro ao atualizar cliente.');
  }
});

/** DELETE /guilds/:guildId/clients/:id — excluir cliente */
router.delete('/guilds/:guildId/clients/:id', requireGuildAccess, (req, res) => {
  const { guildId, id } = req.params;
  try {
    const deleted = deleteClient(guildId, id);
    if (!deleted) return err(res, 404, 'Cliente não encontrado.');
    res.json({ ok: true, id });
  } catch (e) {
    logger.error(`[API19C] DELETE /guilds/${guildId}/clients/${id}:`, e);
    err(res, 500, 'Erro ao excluir cliente.');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PROOFS — listagem com filtros
// ══════════════════════════════════════════════════════════════════════════════

/** GET /guilds/:guildId/proofs — listar provas com filtros */
router.get('/guilds/:guildId/proofs', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { vendorId, page = '1', limit = '20' } = req.query;
  try {
    const pg   = Math.max(1, parseInt(String(page), 10));
    const lim  = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const offset = (pg - 1) * lim;
    // Busca apenas os registros necessários para a página
    const proofs = listProofs(guildId, { limit: lim, offset, vendorId: vendorId || undefined });
    const total  = countProofs(guildId);
    res.json({
      guildId, proofs, total, page: pg, limit: lim,
      totalPages: Math.max(1, Math.ceil(total / lim)),
    });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/proofs:`, e);
    err(res, 500, 'Erro ao carregar provas.');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS — configurações do servidor
// ══════════════════════════════════════════════════════════════════════════════

/** GET /guilds/:guildId/settings/tickets — configuração de tickets */
router.get('/guilds/:guildId/settings/tickets', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  try {
    const config = getTicketConfig(guildId);
    res.json({ guildId, tickets: config });
  } catch (e) {
    logger.error(`[API19C] GET /guilds/${guildId}/settings/tickets:`, e);
    err(res, 500, 'Erro ao carregar configuração de tickets.');
  }
});

/** PATCH /guilds/:guildId/settings/tickets — salvar configuração de tickets */
router.patch('/guilds/:guildId/settings/tickets', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const allowed = ['enabled', 'category_id', 'log_channel_id', 'support_role_id', 'intro_message'];
  const patch = {};
  for (const k of allowed) {
    if (k in req.body) patch[k] = req.body[k] ?? null;
  }

  try {
    setTicketConfig(guildId, patch);
    const config = getTicketConfig(guildId);
    res.json({ guildId, tickets: config });
  } catch (e) {
    logger.error(`[API19C] PATCH /guilds/${guildId}/settings/tickets:`, e);
    err(res, 500, 'Erro ao salvar configuração de tickets.');
  }
});

export default router;
