/**
 * Rotas da API REST — Etapa 19A.
 *
 * Todas as rotas exigem autenticação e acesso validado ao guildId.
 * Os dados vêm diretamente dos repositories existentes (sem duplicar lógica).
 *
 * GET /api/guilds                      — servidores do usuário com bot presente
 * GET /api/guilds/:guildId             — dados básicos do servidor
 * GET /api/guilds/:guildId/stats       — estatísticas
 * GET /api/guilds/:guildId/templates   — modelos
 * GET /api/guilds/:guildId/connections — conexões
 * GET /api/guilds/:guildId/tickets     — tickets
 * GET /api/guilds/:guildId/orders      — pedidos
 * GET /api/guilds/:guildId/clients     — clientes
 */

import { Router } from 'express';
import { requireAuth, requireGuildAccess, sessionMiddleware } from '../middleware/requireAuth.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Repositories ──────────────────────────────────────────────────────────────
import { listTemplates }     from '../../database/repositories/Templates.mjs';
import { listConnections }   from '../../database/repositories/Connections.mjs';
import { listTickets, countOpenTickets, countTickets } from '../../database/repositories/Tickets.mjs';
import { listOrders, countOrders }   from '../../database/repositories/Orders.mjs';
import { listClients, countClients } from '../../database/repositories/Clients.mjs';
import { listProofs, countProofs }   from '../../database/repositories/Proofs.mjs';
import { getOrCreate }               from '../../database/repositories/GuildConfig.mjs';
import { getAuditStats }             from '../../database/repositories/AuditLog.mjs';

const router = Router();

// Aplica sessionMiddleware + requireAuth a todas as rotas desta router
router.use(sessionMiddleware);
router.use(requireAuth);

// ── GET /api/guilds ───────────────────────────────────────────────────────────

/**
 * Retorna a lista de servidores do usuário que:
 * 1. O usuário tem permissão ManageGuild
 * 2. O Ruby FY está presente (guild_id existe no banco)
 */
router.get('/guilds', (req, res) => {
  try {
    const guilds     = req.session.data.guilds ?? [];
    const accessible = guilds.filter(g => {
      const perms  = BigInt(g.permissions ?? '0');
      const MANAGE = BigInt(0x20);
      const ADMIN  = BigInt(0x8);
      return (perms & MANAGE) === MANAGE || (perms & ADMIN) === ADMIN;
    });

    // Verifica quais estão no banco (bot presente)
    const result = accessible.map(g => {
      let botPresent = false;
      try {
        const row = getOrCreate(g.id);
        botPresent = !!row;
      } catch { /* guild não registrada — bot não está */ }

      return {
        id:         g.id,
        name:       g.name,
        icon:       g.icon,
        owner:      g.owner,
        botPresent,
      };
    });

    res.json({ guilds: result });
  } catch (err) {
    logger.error('[API] Erro em GET /guilds:', err);
    res.status(500).json({ error: 'Erro ao carregar servidores.' });
  }
});

// ── GET /api/guilds/:guildId ──────────────────────────────────────────────────

router.get('/guilds/:guildId', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;

  try {
    getOrCreate(guildId); // garante que a guild está registrada
    res.json({
      guild: {
        id:   req.targetGuild.id,
        name: req.targetGuild.name,
        icon: req.targetGuild.icon,
      },
    });
  } catch (err) {
    logger.error(`[API] Erro em GET /guilds/${guildId}:`, err);
    res.status(500).json({ error: 'Erro ao carregar dados do servidor.' });
  }
});

// ── GET /api/guilds/:guildId/stats ────────────────────────────────────────────

router.get('/guilds/:guildId/stats', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;

  try {
    const openTickets    = countOpenTickets(guildId);
    const closedTickets  = countTickets(guildId, { status: 'closed' });
    const totalOrders    = countOrders(guildId);
    const doneOrders     = countOrders(guildId, { status: 'completed' });
    const cancelOrders   = countOrders(guildId, { status: 'cancelled' });
    const activeOrders   = totalOrders - doneOrders - cancelOrders;
    const totalProofs    = countProofs(guildId);
    const totalClients   = countClients(guildId);
    const allConns       = listConnections(guildId);
    const activeConns    = allConns.filter(c => c.enabled).length;
    const templates      = listTemplates(guildId);
    const auditStats     = getAuditStats(guildId);

    res.json({
      guildId,
      tickets:     { open: openTickets, closed: closedTickets },
      orders:      { total: totalOrders, active: activeOrders, completed: doneOrders, cancelled: cancelOrders },
      proofs:      totalProofs,
      clients:     totalClients,
      connections: { total: allConns.length, active: activeConns },
      templates:   templates.length,
      audit:       { total: auditStats.total, last24h: auditStats.last24h },
    });
  } catch (err) {
    logger.error(`[API] Erro em GET /guilds/${guildId}/stats:`, err);
    res.status(500).json({ error: 'Erro ao carregar estatísticas.' });
  }
});

// ── GET /api/guilds/:guildId/templates ────────────────────────────────────────

router.get('/guilds/:guildId/templates', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;

  try {
    const templates = listTemplates(guildId);
    res.json({ guildId, templates });
  } catch (err) {
    logger.error(`[API] Erro em GET /guilds/${guildId}/templates:`, err);
    res.status(500).json({ error: 'Erro ao carregar modelos.' });
  }
});

// ── GET /api/guilds/:guildId/connections ──────────────────────────────────────

router.get('/guilds/:guildId/connections', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;

  try {
    const connections = listConnections(guildId);
    res.json({ guildId, connections });
  } catch (err) {
    logger.error(`[API] Erro em GET /guilds/${guildId}/connections:`, err);
    res.status(500).json({ error: 'Erro ao carregar conexões.' });
  }
});

// ── GET /api/guilds/:guildId/tickets ──────────────────────────────────────────

router.get('/guilds/:guildId/tickets', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { status, page = '1', limit = '20' } = req.query;

  try {
    const filters  = status ? { status } : {};
    const tickets  = listTickets(guildId, filters);
    const pg       = Math.max(1, parseInt(String(page), 10));
    const lim      = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const start    = (pg - 1) * lim;
    const paginated = tickets.slice(start, start + lim);

    res.json({
      guildId,
      tickets:    paginated,
      total:      tickets.length,
      page:       pg,
      limit:      lim,
      totalPages: Math.max(1, Math.ceil(tickets.length / lim)),
    });
  } catch (err) {
    logger.error(`[API] Erro em GET /guilds/${guildId}/tickets:`, err);
    res.status(500).json({ error: 'Erro ao carregar tickets.' });
  }
});

// ── GET /api/guilds/:guildId/orders ───────────────────────────────────────────

router.get('/guilds/:guildId/orders', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { status, page = '1', limit = '20' } = req.query;

  try {
    const filters  = status ? { status } : {};
    const orders   = listOrders(guildId, filters);
    const pg       = Math.max(1, parseInt(String(page), 10));
    const lim      = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const start    = (pg - 1) * lim;
    const paginated = orders.slice(start, start + lim);

    res.json({
      guildId,
      orders:     paginated,
      total:      orders.length,
      page:       pg,
      limit:      lim,
      totalPages: Math.max(1, Math.ceil(orders.length / lim)),
    });
  } catch (err) {
    logger.error(`[API] Erro em GET /guilds/${guildId}/orders:`, err);
    res.status(500).json({ error: 'Erro ao carregar pedidos.' });
  }
});

// ── GET /api/guilds/:guildId/clients ──────────────────────────────────────────

router.get('/guilds/:guildId/clients', requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const { page = '1', limit = '20' } = req.query;

  try {
    const clients  = listClients(guildId);
    const pg       = Math.max(1, parseInt(String(page), 10));
    const lim      = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const start    = (pg - 1) * lim;
    const paginated = clients.slice(start, start + lim);

    res.json({
      guildId,
      clients:    paginated,
      total:      clients.length,
      page:       pg,
      limit:      lim,
      totalPages: Math.max(1, Math.ceil(clients.length / lim)),
    });
  } catch (err) {
    logger.error(`[API] Erro em GET /guilds/${guildId}/clients:`, err);
    res.status(500).json({ error: 'Erro ao carregar clientes.' });
  }
});

export default router;
