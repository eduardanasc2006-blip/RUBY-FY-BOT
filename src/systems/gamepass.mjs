import { EmbedBuilder, Colors } from 'discord.js';
import { checkCooldown } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';

export const comandos = [
  { cmd: '!gamepass <id|link>', desc: 'Ver preço de um gamepass em BRL' },
];

function extractId(input) {
  const m = input.match(/game-pass\/(\d+)/i);
  if (m) return m[1];
  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
}

async function fetchGamepass(id) {
  try {
    const res = await fetch(`https://economy.roblox.com/v2/game-passes/${id}/game-pass-product-info`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const d = await res.json();
    let thumb = null;
    try {
      const tr = await fetch(`https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${id}&size=150x150&format=Png`, { headers: { Accept: 'application/json' } });
      if (tr.ok) { const td = await tr.json(); thumb = td.data?.[0]?.imageUrl ?? null; }
    } catch {}
    return { name: d.Name ?? 'Sem nome', price: d.PriceInRobux ?? null, forSale: d.IsForSale ?? false, sales: d.Sales ?? 0, creator: d.Creator?.Name ?? '?', thumb };
  } catch { return null; }
}

export function register(client, configs) {
  if (client.__gamepassRegistrado) return;
  client.__gamepassRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const parts = msg.content.slice(p.length).trim().split(/\s+/);
    if (parts[0].toLowerCase() !== 'gamepass') return;

    const id = extractId(parts[1] ?? '');
    if (!id) return msg.reply(embedErro('Use: `!gamepass <ID ou link>`'));

    const cd = checkCooldown(msg.author.id, 'gamepass', 5000);
    if (cd) return msg.reply(embedErro(`Aguarde ${cd}s.`));

    const loading = await msg.reply({ embeds: [new EmbedBuilder().setColor(Colors.Grey).setDescription('🔍 Buscando no Roblox...')] });
    const gp = await fetchGamepass(id);
    if (!gp) return loading.edit({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription('❌ Gamepass não encontrado.')] });

    const embed = new EmbedBuilder()
      .setColor(Colors.Orange)
      .setTitle(`🎮 ${gp.name}`)
      .setURL(`https://www.roblox.com/game-pass/${id}`)
      .addFields(
        { name: 'Criador', value: gp.creator, inline: true },
        { name: 'Vendas', value: gp.sales.toLocaleString('pt-BR'), inline: true },
        { name: 'À venda', value: gp.forSale ? '✅' : '❌', inline: true },
      );
    if (gp.price !== null) embed.addFields({ name: '💎 Preço', value: `${gp.price.toLocaleString('pt-BR')} Robux`, inline: true });
    if (gp.thumb) embed.setThumbnail(gp.thumb);
    await loading.edit({ embeds: [embed] });
  });
}
