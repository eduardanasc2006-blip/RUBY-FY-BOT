import { EmbedBuilder, Colors } from 'discord.js';
import { fundos, molduras, efeitos, badges } from './perfilConfig.mjs';
import Usuario from '../db/models/Usuario.mjs';

const CONFIGS = { fundo: fundos, moldura: molduras, efeito: efeitos, badge: badges };
const INV_KEY  = { fundo: 'fundos', moldura: 'molduras', efeito: 'efeitos', badge: 'badges' };
const DB_FIELD = { fundo: 'fundo', moldura: 'moldura', efeito: 'efeitoEquipado', badge: 'badgeEquipado' };

async function equipar(message, tipo, itemId) {
  const userId = message.author.id, guildId = message.guild?.id;
  if (!guildId) return message.reply('❌ Comando apenas em servidores.');
  if (!itemId) return message.reply(`❌ Informe o ID do item. Ex: \`!equipar${tipo} neon_roxo\``);

  const cfg = CONFIGS[tipo];
  if (!cfg?.[itemId]) return message.reply(`❌ Item \`${itemId}\` não existe. Veja \`!loja ${INV_KEY[tipo]}\`.`);

  const user = await Usuario.findOne({ userId, guildId });
  if (!user) return message.reply('❌ Você ainda não tem perfil. Mande uma mensagem primeiro!');

  const inv   = user.inventario ?? {};
  const owned = inv[INV_KEY[tipo]] ?? (tipo === 'fundo' ? ['escuro'] : tipo === 'moldura' ? ['padrao'] : []);
  if (!owned.includes(itemId))
    return message.reply(`❌ Você não possui **${cfg[itemId].nome}**. Use \`!comprar ${itemId}\`.`);

  await Usuario.updateOne({ userId, guildId }, { $set: { [DB_FIELD[tipo]]: itemId } });

  return message.reply({
    embeds: [new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(`✅ **${cfg[itemId].nome}** equipado! Veja seu perfil com \`!meuperfil\`.`)
    ]
  });
}

export function register(client, configs) {
  if (client.__equiparRegistrado) return;
  client.__equiparRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const parts = msg.content.slice(p.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts[1]?.toLowerCase();

    const map = {
      equiparfundo:   'fundo',
      equiparmoldura: 'moldura',
      equiparefeito:  'efeito',
      equiparbadge:   'badge',
    };

    if (map[cmd]) {
      try { await equipar(msg, map[cmd], arg); }
      catch (e) { console.error('[equipar]', e); }
    }
  });
}
