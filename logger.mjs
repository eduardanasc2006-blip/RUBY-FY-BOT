import Log from '../db/models/Log.mjs';

export async function registrarLog(client, guildId, tipo, userId, dados, configs) {
  try {
    await Log.create({ guildId, tipo, userId, dados });
    const cfg = configs?.get(guildId);
    if (!cfg?.canalLogs) return;
    const canal = client.channels.cache.get(cfg.canalLogs);
    if (!canal) return;
    const { EmbedBuilder } = await import('discord.js');
    const cores = {
      casamento: 0xff69b4, divorcio: 0x888888, nivel: 0x00bfff,
      reputacao: 0xffd700, ticket: 0x7289da, denuncia: 0xff4444,
      avaliacao: 0x2ecc71, admin: 0xe74c3c, afinidade: 0xa855f7,
      produto: 0xf39c12, roblox: 0x00a2ff, conquista: 0xf1c40f,
    };
    const embed = new EmbedBuilder()
      .setColor(cores[tipo] || 0x7289da)
      .setTitle(`📋 Log — ${tipo}`)
      .setDescription(dados.descricao || JSON.stringify(dados).slice(0, 200))
      .setTimestamp()
      .setFooter({ text: `User: ${userId || 'Sistema'}` });
    await canal.send({ embeds: [embed] }).catch(() => {});
  } catch {}
}
