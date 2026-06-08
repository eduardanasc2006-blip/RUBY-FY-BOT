// ─────────────────────────────────────────────────────────────────────────────
  // Central Command Router
  // Patches client.on() so that ALL systems share ONE messageCreate listener
  // and ONE interactionCreate listener instead of N separate ones.
  // This eliminates MaxListenersExceededWarning and reduces CPU per message.
  //
  // Usage (loader.mjs, before any system registration):
  //   import { patchClientRouter } from './router/commandRouter.mjs';
  //   patchClientRouter(client);
  // ─────────────────────────────────────────────────────────────────────────────

  export function patchClientRouter(client) {
    if (client.__routerPatched) return;
    client.__routerPatched = true;

    const msgHandlers          = [];
    const interactionHandlers  = [];

    // ── Save the real EventEmitter methods ──────────────
    const origOn   = client.on.bind(client);
    const origOnce = client.once.bind(client);

    // ── Proxy client.on ─────────────────────────────────
    client.on = function (event, handler) {
      if (event === 'messageCreate') {
        msgHandlers.push(handler);
        return client;
      }
      if (event === 'interactionCreate') {
        interactionHandlers.push(handler);
        return client;
      }
      return origOn(event, handler);
    };

    // ── client.once passes through unchanged ────────────
    client.once = function (event, handler) {
      return origOnce(event, handler);
    };

    // ── ONE real messageCreate listener ─────────────────
    origOn('messageCreate', async (msg) => {
      for (const h of msgHandlers) {
        try {
          await h(msg);
        } catch (e) {
          if (!e.message?.includes('Unknown Message') &&
              !e.message?.includes('Missing Permissions')) {
            console.error('[Router:msg]', e.message);
          }
        }
      }
    });

    // ── ONE real interactionCreate listener ─────────────
    origOn('interactionCreate', async (interaction) => {
      for (const h of interactionHandlers) {
        try {
          await h(interaction);
        } catch (e) {
          // Silenciar erros esperados do Discord
          if (!e.message?.includes('Unknown interaction') &&
              !e.message?.includes('already been acknowledged') &&
              !e.message?.includes('Interaction has already been')) {
            console.error('[Router:interaction]', e.message);
          }
        }
      }
    });

    // Aumentar limite para cobrir listeners restantes (ready, guildCreate, etc.)
    client.setMaxListeners(50);
  }
  