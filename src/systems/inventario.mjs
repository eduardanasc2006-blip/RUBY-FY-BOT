import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
// ✅ Importação da função para limpar o cache
import { limparCache } from './inventario.mjs';

// 🗺️ MAPAS FIXOS
const mapaInventario = {
  moldura: 'molduras',
  fundo: 'fundos',
  efeito: 'efeitos',
  badge: 'badges',
  titulo: 'titulos'
};

const mapaCampoEquipado = {
  moldura: 'moldura',
  fundo: 'fundo',
  efeito: 'efeitoEquipado',
  badge: 'badgeEquipado',
  titulo: 'tituloEquipado'
};

const categoriasValidas = Object.keys(mapaInventario);
const itensPorPagina = 6;
const TEMPO_DEBOUNCE = 800;

// 💾 CACHE
const cacheUsuario = new Map();
const ultimoClique = new Map();

// =========================
// GET USER (SEQUELIZE SQLITE)
// =========================
export async function getUser(origem) {
  if (!origem) return null;

  const userId = origem.user?.id || origem.author?.id;
  const guildId = origem.guild?.id;
  const key = `${userId}:${guildId}`;

  if (cacheUsuario.has(key)) return cacheUsuario.get(key);

  const user = await Usuario.findOne({
    where: { userId, guildId }
  });

  if (user) cacheUsuario.set(key, user);

  return user;
}

// =========================
// LIMPAR CACHE
// =========================
export function limparCache(userId, guildId) {
  cacheUsuario.delete(`${userId}:${guildId}`);
}

// =========================
// INVENTÁRIO SEGURO
// =========================
export function garantirInventario(user) {
  if (!user) return null;

  let inv = user.inventario;

  if (typeof inv === 'string') {
    try {
      inv = JSON.parse(inv);
    } catch {
      inv = {};
    }
  }

  inv = inv || {};

  // ✅ Usa exatamente os mesmos nomes que a loja salva
  for (const campo of Object.values(mapaInventario)) {
    if (!Array.isArray(inv[campo])) inv[campo] = [];
  }

  user.inventario = JSON.stringify(inv);

  return inv;
}

// =========================
// EQUIPAR / DESEQUIPAR
// =========================
export async function equiparItem(user, tipo, itemId) {
  if (!categoriasValidas.includes(tipo)) {
    return { ok: false, msg: '❌ Tipo inválido.' };
  }

  if (!user || !itemId) {
    return { ok: false, msg: '❌ Dados inválidos.' };
  }

  itemId = String(itemId).toLowerCase().trim();

  const inv = garantirInventario(user);
  if (!inv) return { ok: false, msg: '❌ Inventário inválido.' };

  const lista = inv[mapaInventario[tipo]] || [];

  if (!lista.includes(itemId)) {
    return { ok: false, msg: '❌ Você não possui esse item.' };
  }

  const campo = mapaCampoEquipado[tipo];
  const jaEquipado = user[campo] === itemId;

  user[campo] = jaEquipado ? null : itemId;

  await user.save();
  // ✅ Limpa cache imediatamente após salvar
  limparCache(user.userId, user.guildId);

  return {
    ok: true,
    msg: jaEquipado
      ? `❎ Desequipado: **${itemId}**`
      : `✅ Equipado: **${itemId}**`
  };
}

// =========================
// INVENTÁRIO PAGINADO
// =========================
export async function inventario(message) {
  const user = await getUser(message);
  if (!user) return message.reply('❌ Usuário não cadastrado.');

  const estado = {
    tipo: 'moldura',
    pagina: 0
  };

  const renderInv = () => garantirInventario(user);

  function getLista() {
    const inv = renderInv();
    return inv[mapaInventario[estado.tipo]] || [];
  }

  function maxPagina() {
    return Math.max(0, Math.ceil(getLista().length / itensPorPagina) - 1);
  }

  function estaEquipado(item) {
    return user[mapaCampoEquipado[estado.tipo]] === item;
  }

  function gerarEmbed() {
    const lista = getLista();
    const inicio = estado.pagina * itensPorPagina;
    const itens = lista.slice(inicio, inicio + itensPorPagina);

    return new EmbedBuilder()
      .setTitle(`🎒 Inventário - ${estado.tipo.toUpperCase()}`)
      .setDescription(
        itens.length
          ? itens.map(i => `${estaEquipado(i) ? '✅' : '⬜'} \`${i}\``).join('\n')
          : '❌ Sem itens'
      )
      .setFooter({ text: `Página ${estado.pagina + 1}/${maxPagina() + 1}` })
      .setColor('#00d4ff');
  }

  function gerarBotoes() {
    const lista = getLista().slice(
      estado.pagina * itensPorPagina,
      (estado.pagina + 1) * itensPorPagina
    );

    const rows = [];
    let row = new ActionRowBuilder();

    for (const item of lista) {
      if (row.components.length === 5) {
        rows.push(row);
        row = new ActionRowBuilder();
      }

      const equipado = estaEquipado(item);

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`inv_${estado.tipo}_${item}`)
          .setLabel(equipado ? `❌ ${item}` : `✅ ${item}`)
          .setStyle(equipado ? ButtonStyle.Danger : ButtonStyle.Success)
      );
    }

    if (row.components.length) rows.push(row);
    return rows;
  }

  function gerarNav() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(estado.pagina === 0),

      new ButtonBuilder()
        .setLabel(`${estado.pagina + 1}/${maxPagina() + 1}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(estado.pagina >= maxPagina())
    );
  }

  function gerarCats() {
    return new ActionRowBuilder().addComponents(
      ...categoriasValidas.map(c =>
        new ButtonBuilder()
          .setCustomId(`cat_${c}`)
          .setLabel(c.toUpperCase())
          .setStyle(c === estado.tipo ? ButtonStyle.Success : ButtonStyle.Secondary)
      )
    );
  }

  const msg = await message.channel.send({
    embeds: [gerarEmbed()],
    components: [...gerarBotoes(), gerarNav(), gerarCats()]
  });

  const collector = msg.createMessageComponentCollector({ time: 600000 });

  collector.on('collect', async (i) => {
    if (i.user.id !== message.author.id) return;

    const agora = Date.now();
    const last = ultimoClique.get(i.user.id) || 0;
    if (agora - last < TEMPO_DEBOUNCE) {
      return i.reply({ content: '⏳ Aguarde...', ephemeral: true });
    }
    ultimoClique.set(i.user.id, agora);

    if (i.customId === 'prev' && estado.pagina > 0) estado.pagina--;
    if (i.customId === 'next' && estado.pagina < maxPagina()) estado.pagina++;

    if (i.customId.startsWith('cat_')) {
      estado.tipo = i.customId.replace('cat_', '');
      estado.pagina = 0;
    }

    if (i.customId.startsWith('inv_')) {
      const [, tipo, ...rest] = i.customId.split('_');
      const item = rest.join('_');

      const res = await equiparItem(user, tipo, item);
      await i.reply({ content: res.msg, ephemeral: true });
    }

    return i.update({
      embeds: [gerarEmbed()],
      components: [...gerarBotoes(), gerarNav(), gerarCats()]
    });
  });

  collector.on('end', () => msg.edit({ components: [] }).catch(() => {}));
}

// ✅ Comandos e registro adicionados
export const comandos = [
  {
    cmd: '!inventario',
    desc: 'Visualiza e equipa itens do inventário'
  },
  {
    cmd: '!inv',
    desc: 'Atalho para o inventário'
  }
];

export function register(client, configs) {
  if (client.__inventarioRegistrado) return;
  client.__inventarioRegistrado = true;

  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    const cfg = configs.get(message.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!message.content.startsWith(prefixo)) return;

    const args = message.content
      .slice(prefixo.length)
      .trim()
      .split(/\s+/);

    const cmd = args.shift()?.toLowerCase();

    if (cmd === 'inventario' || cmd === 'inv') {
      return inventario(message);
    }
  });
}
