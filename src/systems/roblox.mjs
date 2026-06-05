import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { checkCooldown, formatarTempo } from '../utils/cooldown.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { registrarLog } from '../utils/logger.mjs';

const THUMB = 'https://thumbnails.roblox.com/v1';

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, ...opts });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json();
}

async function resolverUsuario(nome) {
  try {
    const r = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ usernames: [nome], excludeBannedUsers: false }),
    });
    const d = await r.json();
    const found = d.data?.[0];
    if (found) return found;
  } catch {}

  try {
    const r2 = await fetch(`https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(nome)}`);
    const d2 = await r2.json();
    if (d2?.Id) return { id: d2.Id, name: d2.Username, displayName: d2.Username };
  } catch {}

  return null;
}

export const comandos = [
  { cmd: '!perfil <usuário>', desc: 'Perfil Roblox de um usuário.' },
  { cmd: '!avatar <usuário>', desc: 'Avatar 2D do perfil Roblox.' },
  { cmd: '!grupo <id>',       desc: 'Informações de um grupo Roblox.' },
  { cmd: '!gamepass <id>',    desc: 'Informações de uma Gamepass.' },
];

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const CDKey = (c) => `roblox:${c}:${msg.author.id}:${msg.guild.id}`;
    const CD_MS = 15_000;

    if (cmd === 'perfil') {
      const nome = args.join(' ');
      if (!nome) return msg.reply({ embeds: [embedErro('Use: `!perfil <usuário roblox>`')] });
      const espera = checkCooldown(CDKey('perfil'), CD_MS);
      if (espera) return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para usar novamente.`)] });
      const loading = await msg.reply('🔍 Buscando perfil...');
      try {
        const user = await resolverUsuario(nome);
        if (!user) {
          return loading.edit({ content: null, embeds: [embedErro(`Usuário **"${nome}"** não encontrado.\nVerifique se o nome de usuário está correto (é case-sensitive no Roblox).`)] });
        }

        const userId = user.id || user.Id;
        const results = await Promise.allSettled([
          fetchJSON(`https://users.roblox.com/v1/users/${userId}`),
          fetchJSON(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
          fetchJSON(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
          fetchJSON(`https://friends.roblox.com/v1/users/${userId}/followings/count`),
          fetchJSON(`${THUMB}/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`),
        ]);

        const info = results[0].status === 'fulfilled' ? results[0].value : { displayName: user.displayName || user.name, name: user.name, id: userId, created: null };
        const friendsCount = results[1].status === 'fulfilled' ? (results[1].value.count ?? 0) : '?';
        const followersCount = results[2].status === 'fulfilled' ? (results[2].value.count ?? 0) : '?';
        const followingCount = results[3].status === 'fulfilled' ? (results[3].value.count ?? 0) : '?';
        const avatarUrl = results[4].status === 'fulfilled' ? results[4].value.data?.[0]?.imageUrl : null;

        const embed = new EmbedBuilder()
          .setColor(0x00a2ff)
          .setTitle(`🎮 ${info.displayName} (@${info.name})`)
          .setThumbnail(avatarUrl || null)
          .setURL(`https://www.roblox.com/users/${userId}/profile`)
          .addFields(
            { name: '🆔 ID', value: String(userId), inline: true },
            { name: '📅 Conta criada', value: info.created ? new Date(info.created).toLocaleDateString('pt-BR') : 'N/A', inline: true },
            { name: '👥 Amigos', value: String(friendsCount), inline: true },
            { name: '👁️ Seguidores', value: String(followersCount), inline: true },
            { name: '➡️ Seguindo', value: String(followingCount), inline: true },
            { name: '🔗 Perfil', value: `[Abrir no Roblox](https://www.roblox.com/users/${userId}/profile)`, inline: true },
          )
          .setFooter({ text: 'FiskBot • Roblox' })
          .setTimestamp();

        await registrarLog(client, msg.guild.id, 'roblox', msg.author.id, { descricao: `<@${msg.author.id}> consultou perfil de ${info.name}` }, configs);
        await loading.edit({ content: null, embeds: [embed] });
      } catch (e) {
        await loading.edit({ content: null, embeds: [embedErro(`Erro ao buscar perfil: ${e.message}`)] });
      }
      return;
    }

    if (cmd === 'avatar') {
      const nome = args.join(' ');
      if (!nome) return msg.reply({ embeds: [embedErro('Use: `!avatar <usuário roblox>`')] });
      const espera = checkCooldown(CDKey('avatar'), CD_MS);
      if (espera) return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para usar novamente.`)] });
      const loading = await msg.reply('🔍 Buscando avatar...');
      try {
        const user = await resolverUsuario(nome);
        if (!user) return loading.edit({ content: null, embeds: [embedErro('Usuário não encontrado.')] });
        const userId = user.id || user.Id;
        const [thumb2d, thumb3d] = await Promise.allSettled([
          fetchJSON(`${THUMB}/users/avatar?userIds=${userId}&size=420x420&format=Png`),
          fetchJSON(`${THUMB}/users/avatar-3d?userId=${userId}`),
        ]);
        const url2d = thumb2d.status === 'fulfilled' ? thumb2d.value.data?.[0]?.imageUrl : null;
        const url3d = thumb3d.status === 'fulfilled' ? thumb3d.value?.imageUrl : null;
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Ver 2D').setStyle(ButtonStyle.Link).setURL(url2d || `https://www.roblox.com/users/${userId}/profile`),
          new ButtonBuilder().setLabel('Ver 3D').setStyle(ButtonStyle.Link).setURL(url3d || `https://www.roblox.com/users/${userId}/profile`),
        );
        const embed = new EmbedBuilder()
          .setColor(0x00a2ff)
          .setTitle(`🎭 Avatar de ${user.name || user.Username}`)
          .setImage(url2d || null)
          .setFooter({ text: 'FiskBot • Roblox' });
        await loading.edit({ content: null, embeds: [embed], components: [row] });
      } catch (e) {
        await loading.edit({ content: null, embeds: [embedErro(`Erro ao buscar avatar: ${e.message}`)] });
      }
      return;
    }

    if (cmd === 'grupo') {
      const id = args[0];
      if (!id || isNaN(id)) return msg.reply({ embeds: [embedErro('Use: `!grupo <id do grupo>`')] });
      const espera = checkCooldown(CDKey('grupo'), CD_MS);
      if (espera) return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para usar novamente.`)] });
      const loading = await msg.reply('🔍 Buscando grupo...');
      try {
        const [info, icon] = await Promise.allSettled([
          fetchJSON(`https://groups.roblox.com/v1/groups/${id}`),
          fetchJSON(`${THUMB}/groups/icons?groupIds=${id}&size=420x420&format=Png`),
        ]);
        if (info.status === 'rejected') return loading.edit({ content: null, embeds: [embedErro(`Grupo **${id}** não encontrado.`)] });
        const g = info.value;
        const embed = new EmbedBuilder()
          .setColor(0x00a2ff)
          .setTitle(`👥 ${g.name}`)
          .setThumbnail(icon.status === 'fulfilled' ? icon.value.data?.[0]?.imageUrl : null)
          .setDescription(g.description?.slice(0, 300) || 'Sem descrição.')
          .addFields(
            { name: '👑 Dono', value: g.owner?.username || 'N/A', inline: true },
            { name: '👥 Membros', value: (g.memberCount ?? 0).toLocaleString('pt-BR'), inline: true },
          )
          .setFooter({ text: 'FiskBot • Roblox' });
        await loading.edit({ content: null, embeds: [embed] });
      } catch (e) {
        await loading.edit({ content: null, embeds: [embedErro(`Erro ao buscar grupo: ${e.message}`)] });
      }
      return;
    }

    if (cmd === 'gamepass') {
      const input = args[0];
      if (!input) return msg.reply({ embeds: [embedErro('Use: `!gamepass <id>`')] });

      const id = input.replace(/\D/g, '');
      if (!id) return msg.reply({ embeds: [embedErro('ID inválido. Informe apenas os números do gamepass.')] });

      const espera = checkCooldown(CDKey('gamepass'), CD_MS);
      if (espera) return msg.reply({ embeds: [embedErro(`Aguarde **${formatarTempo(espera)}** para usar novamente.`)] });
      const loading = await msg.reply('🔍 Buscando gamepass...');
      try {
        const [info, thumb] = await Promise.allSettled([
          fetchJSON(`https://economy.roblox.com/v1/game-passes/${id}/game-pass-product-info`),
          fetchJSON(`${THUMB}/game-passes?gamePassIds=${id}&size=150x150&format=Png`),
        ]);

        if (info.status === 'rejected') {
          return loading.edit({ content: null, embeds: [embedErro(`Gamepass **${id}** não encontrado.\nVerifique se o ID está correto.`)] });
        }

        const gp = info.value;
        const thumbUrl = thumb.status === 'fulfilled' ? thumb.value.data?.[0]?.imageUrl : null;
        const preco = gp.PriceInRobux ? `${gp.PriceInRobux} Robux` : 'Grátis';
        const embed = new EmbedBuilder()
          .setColor(0x00a2ff)
          .setTitle(`🎟️ ${gp.Name || 'Gamepass'}`)
          .setThumbnail(thumbUrl || null)
          .addFields(
            { name: '💰 Preço', value: preco, inline: true },
            { name: '👤 Criador', value: gp.Creator?.Name || 'N/A', inline: true },
            { name: '🔗 Link', value: `[Ver no Roblox](https://www.roblox.com/game-pass/${id})`, inline: true },
          )
          .setFooter({ text: 'FiskBot • Roblox' });
        await loading.edit({ content: null, embeds: [embed] });
      } catch (e) {
        await loading.edit({ content: null, embeds: [embedErro(`Erro ao buscar gamepass: ${e.message}`)] });
      }
      return;
    }
  });
}
