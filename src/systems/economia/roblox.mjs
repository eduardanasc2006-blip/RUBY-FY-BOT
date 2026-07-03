import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { checkCooldown, formatarTempo } from '../../utils/cooldown.mjs';
import { embedErro } from '../../utils/embeds.mjs';
import { registrarLog } from '../../utils/logger.mjs';

const THUMB = 'https://thumbnails.roblox.com/v1';

async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0'
    },
    ...opts
  });

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
    const r2 = await fetch(
      `https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(nome)}`
    );
    const d2 = await r2.json();
    if (d2?.Id) {
      return { id: d2.Id, name: d2.Username, displayName: d2.Username };
    }
  } catch {}

  return null;
}

export const comandos = [
  { cmd: '!perfilroblox <usuário>', desc: 'Perfil Roblox de um usuário.' },
  { cmd: '!avatar <usuário>', desc: 'Avatar 2D do perfil Roblox.' },
  { cmd: '!grupo <id>', desc: 'Informações de um grupo Roblox.' },
  { cmd: '!gamepass <id>', desc: 'Informações de uma Gamepass.' },
];

export function register(client, configs) {
  if (client.__robloxRegistrado) return;
  client.__robloxRegistrado = true;
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    const CDKey = (c) => `roblox:${c}:${msg.author.id}:${msg.guild.id}`;
    const CD_MS = 15_000;

    // ───────────────────────── PERFIL ─────────────────────────
    if (cmd === 'perfilroblox') {
      const nome = args.join(' ');
      if (!nome)
        return msg.reply({
          embeds: [embedErro('Use: `!perfilroblox <usuário roblox>`')],
        });

      const espera = checkCooldown(CDKey('perfilroblox'), CD_MS);
      if (espera)
        return msg.reply({
          embeds: [embedErro(`Aguarde **${formatarTempo(espera)}**.`)],
        });

      const loading = await msg.reply('🔍 Buscando perfil...');

      try {
        const user = await resolverUsuario(nome);
        if (!user) {
          return loading.edit({
            content: null,
            embeds: [
              embedErro(`Usuário **${nome}** não encontrado.`),
            ],
          });
        }

        const userId = user.id || user.Id;

        const results = await Promise.allSettled([
          fetchJSON(`https://users.roblox.com/v1/users/${userId}`),
          fetchJSON(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
          fetchJSON(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
          fetchJSON(`https://friends.roblox.com/v1/users/${userId}/followings/count`),
          fetchJSON(`${THUMB}/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`),
        ]);

        const info =
          results[0].status === 'fulfilled'
            ? results[0].value
            : { displayName: user.displayName, name: user.name };

        const friends = results[1].status === 'fulfilled' ? results[1].value.count : '?';
        const followers = results[2].status === 'fulfilled' ? results[2].value.count : '?';
        const following = results[3].status === 'fulfilled' ? results[3].value.count : '?';
        const avatar = results[4].status === 'fulfilled'
          ? results[4].value.data?.[0]?.imageUrl
          : null;

        const embed = new EmbedBuilder()
          .setColor(0x00a2ff)
          .setTitle(`🎮 ${info.displayName}`)
          .setThumbnail(avatar)
          .setURL(`https://www.roblox.com/users/${userId}/profile`)
          .addFields(
            { name: '🆔 ID', value: String(userId), inline: true },
            { name: '👥 Amigos', value: String(friends), inline: true },
            { name: '👁️ Seguidores', value: String(followers), inline: true },
            { name: '➡️ Seguindo', value: String(following), inline: true },
          )
          .setTimestamp();

        await loading.edit({ content: null, embeds: [embed] });
      } catch (e) {
        await loading.edit({
          content: null,
          embeds: [embedErro(`Erro: ${e.message}`)],
        });
      }

      return;
    }

    // ───────────────────────── GAMEPASS (CORRIGIDO) ─────────────────────────
    if (cmd === 'gamepass') {
      const input = args[0];
      if (!input)
        return msg.reply({ embeds: [embedErro('Use: `!gamepass <id>`')] });

      const id = input.replace(/\D/g, '');
      if (!id)
        return msg.reply({ embeds: [embedErro('ID inválido.')] });

      const espera = checkCooldown(CDKey('gamepass'), CD_MS);
      if (espera)
        return msg.reply({
          embeds: [embedErro(`Aguarde **${formatarTempo(espera)}**.`)],
        });

      const loading = await msg.reply('🔍 Buscando gamepass...');

      try {
        // 🔥 endpoint correto e mais estável
        const info = await fetchJSON(
          `https://games.roblox.com/v1/game-passes/${id}/game-pass-product-info`
        ).catch(() => null);

        const thumb = await fetchJSON(
          `${THUMB}/game-passes?gamePassIds=${id}&size=512x512&format=Png`
        ).catch(() => null);

        if (!info || !info.Name) {
          return loading.edit({
            content: null,
            embeds: [
              embedErro(`❌ Gamepass **${id}** não encontrado.`),
            ],
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x00a2ff)
          .setTitle(`🎟️ ${info.Name}`)
          .setThumbnail(thumb?.data?.[0]?.imageUrl || null)
          .addFields(
            {
              name: '💰 Preço',
              value: info.PriceInRobux
                ? `${info.PriceInRobux.toLocaleString('pt-BR')} Robux`
                : 'Grátis',
              inline: true,
            },
            { name: '🆔 ID', value: id, inline: true },
            { name: '👤 Criador', value: info.Creator?.Name || 'N/A', inline: true },
            {
              name: '🔗 Link',
              value: `[Abrir no Roblox](https://www.roblox.com/game-pass/${id})`,
            },
          )
          .setTimestamp();

        await loading.edit({ content: null, embeds: [embed] });
      } catch (e) {
        await loading.edit({
          content: null,
          embeds: [embedErro(`Erro: ${e.message}`)],
        });
      }

      return;
    }

    // ───────────────────────── AVATAR ─────────────────────────
    if (cmd === 'avatar') {
      const nome = args.join(' ');
      if (!nome)
        return msg.reply({
          embeds: [embedErro('Use: `!avatar <usuário>`')],
        });

      const loading = await msg.reply('🔍 Buscando avatar...');

      try {
        const user = await resolverUsuario(nome);
        if (!user)
          return loading.edit({
            embeds: [embedErro('Usuário não encontrado.')],
          });

        const userId = user.id || user.Id;

        const thumb = await fetchJSON(
          `${THUMB}/users/avatar?userIds=${userId}&size=420x420&format=Png`
        );

        const url = thumb.data?.[0]?.imageUrl;

        const embed = new EmbedBuilder()
          .setColor(0x00a2ff)
          .setTitle(`🎭 Avatar`)
          .setImage(url);

        await loading.edit({ embeds: [embed] });
      } catch (e) {
        await loading.edit({
          embeds: [embedErro(`Erro: ${e.message}`)],
        });
      }
    }

    // ───────────────────────── GRUPO ─────────────────────────
    if (cmd === 'grupo') {
      const id = args[0];
      if (!id) return msg.reply({ embeds: [embedErro('Use: `!grupo <id>`')] });

      const loading = await msg.reply('🔍 Buscando grupo...');

      try {
        const info = await fetchJSON(
          `https://groups.roblox.com/v1/groups/${id}`
        );

        const embed = new EmbedBuilder()
          .setColor(0x00a2ff)
          .setTitle(info.name)
          .setDescription(info.description || 'Sem descrição.')
          .addFields(
            { name: '👥 Membros', value: String(info.memberCount), inline: true },
            { name: '👑 Dono', value: info.owner?.username || 'N/A', inline: true },
          );

        await loading.edit({ embeds: [embed] });
      } catch (e) {
        await loading.edit({
          embeds: [embedErro(`Erro: ${e.message}`)],
        });
      }
    }
  });
}
