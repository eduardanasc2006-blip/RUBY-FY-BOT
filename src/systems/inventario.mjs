import { EmbedBuilder, Colors } from 'discord.js';
import { fundos, molduras, efeitos, badges } from './perfilConfig.mjs';
import Usuario from '../db/models/Usuario.mjs';

const CONFIGS = { fundos, molduras, efeitos, badges };
const CAT_LABEL = { fundos: '🖼 Fundos', molduras: '🔲 Molduras', efeitos: '✨ Efeitos', badges: '🏅 Badges' };

export async function inventario(message) {
  const userId = message.author.id, guildId = message.guild?.id;
  if (!guildId) return message.reply('❌ Comando apenas em servidores.');

  const user = await Usuario.findOne({ userId, guildId });
  if (!user) return message.reply('❌ Você ainda não tem perfil. Mande uma mensagem primeiro!');

  const inv = user.inventario ?? {};

  const equipado = {
    fundos:   user.fundo,
    molduras: user.moldura,
    efeitos:  user.efeitoEquipado,
    badges:   user.badgeEquipado,
  };

  const embed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle(`🎒 Inventário de ${message.author.username}`)
    .setThumbnail(message.author.displayAvatarURL({ size: 128 }));

  for (const [cat, label] of Object.entries(CAT_LABEL)) {
    const owned = inv[cat] ?? (cat === 'fundos' ? ['escuro'] : cat === 'molduras' ? ['padrao'] : []);
    if (!owned.length) { embed.addFields({ name: label, value: '_Nenhum_', inline: true }); continue; }

    const eq = equipado[cat];
    const lines = owned.map(id => {
      const cfg = CONFIGS[cat][id];
      const nome = cfg?.nome ?? id;
      const isEq = id === eq;
      return `${isEq ? '✅ ' : ''}**${nome}** \`${id}\``;
    });
    embed.addFields({ name: label, value: lines.join('\n').slice(0, 1000), inline: true });
  }

  embed.addFields({
    name: '📋 Como equipar',
    value: '`!equiparfundo <id>` | `!equiparmoldura <id>` | `!equiparefeito <id>` | `!equiparbadge <id>`',
  });

  return message.reply({ embeds: [embed] });
}

export function register(client, configs) {
  if (client.__inventarioRegistrado) return;
  client.__inventarioRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const cmd = msg.content.slice(p.length).trim().split(/\s+/)[0].toLowerCase();
    if (cmd === 'inventario' || cmd === 'inv') {
      try { await inventario(msg); } catch (e) { console.error('[inventario]', e); }
    }
  });
}
