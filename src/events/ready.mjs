import { Events } from 'discord.js';
import { deployCommands } from '../deploy-commands.mjs';

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`[Bot] Online como ${client.user.tag}`);
    console.log(`[Bot] Servindo ${client.guilds.cache.size} servidor(es).`);

    // ── Deploy automático de slash commands ─────────────────────────────────
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID || null;

    if (!token || !clientId) {
      console.warn('[Deploy] Variáveis de ambiente DISCORD_TOKEN ou CLIENT_ID não configuradas. Pulando deploy.');
      return;
    }

    console.log('[Deploy] Iniciando registro de slash commands...');
    
    try {
      const result = await deployCommands({ token, clientId, guildId });
      console.log(`[Deploy] ✅ ${result.registered} comando(s) registrado(s) com sucesso.`);
    } catch (error) {
      console.error('[Deploy] ❌ Erro ao registrar comandos:', error.message);
    }
  },
};
