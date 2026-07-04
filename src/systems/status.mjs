import { EmbedBuilder } from 'discord.js';

/* =========================
   REGISTER
========================= */

export function register(client, configs) {
  if (client.__statusRegistrado) return;
  client.__statusRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const cmd = msg.content.slice(prefixo.length).trim().split(/\s+/)[0].toLowerCase();

    if (!['status', 'saude', 'health'].includes(cmd)) return;

    const sistemas = client.systems ? Array.from(client.systems.values()) : [];
    const totalSistemas = sistemas.length;
    const totalComandos = sistemas.reduce(
      (acc, s) => acc + (Array.isArray(s.comandos) ? s.comandos.length : 0),
      0
    );

    const uptimeMs = client.uptime || 0;
    const uptimeSeg = Math.floor(uptimeMs / 1000);
    const dias = Math.floor(uptimeSeg / 86400);
    const horas = Math.floor((uptimeSeg % 86400) / 3600);
    const minutos = Math.floor((uptimeSeg % 3600) / 60);
    const segundos = uptimeSeg % 60;
    const uptimeTexto = `${dias}d ${horas}h ${minutos}m ${segundos}s`;

    const ping = client.ws?.ping ?? -1;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📡 Status do FiskBot')
      .addFields(
        { name: '🧩 Sistemas carregados', value: `${totalSistemas}`, inline: true },
        { name: '⚙️ Comandos ativos', value: `${totalComandos}`, inline: true },
        { name: '📶 Ping', value: `${ping}ms`, inline: true },
        { name: '⏱️ Uptime', value: uptimeTexto, inline: true },
        { name: '🌐 Servidores', value: `${client.guilds?.cache?.size ?? 0}`, inline: true },
      )
      .setFooter({ text: 'FiskBot' })
      .setTimestamp();

    return msg.reply({ embeds: [embed] });
  });
}

/* =========================
   COMANDOS
========================= */

export const comandos = [
  { cmd: '!status', desc: 'Mostra sistemas/comandos carregados, ping e uptime do bot.' },
  { cmd: '!saude', desc: 'Alias de !status.' },
  { cmd: '!health', desc: 'Alias de !status.' },
];
