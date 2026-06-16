import { createCanvas } from '@napi-rs/canvas';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import { fundos, molduras, efeitos, badges } from '../systems/perfilConfig.mjs';

// ==================================================
// 🔧 FUNÇÕES BASE DO SISTEMA
// ==================================================

/**
 * 🔹 Busca usuário seguro (funciona com mensagem OU interação)
 */
export async function getUser(origem) {
  return await Usuario.findOne({
    userId: origem.user?.id || origem.author.id,
    guildId: origem.guild.id
  });
}

/**
 * 🔹 Garante estrutura completa do inventário
 * ✅ Agora com validação forte e consistência
 */
export function garantirInventario(user) {
  user.inventario = user.inventario || {
    fundos: [],
    molduras: [],
    efeitos: [],
    badges: [],
    titulos: []
  };

  // Garante que nenhum campo seja undefined
  user.inventario.fundos = Array.isArray(user.inventario.fundos) ? user.inventario.fundos : [];
  user.inventario.molduras = Array.isArray(user.inventario.molduras) ? user.inventario.molduras : [];
  user.inventario.efeitos = Array.isArray(user.inventario.efeitos) ? user.inventario.efeitos : [];
  user.inventario.badges = Array.isArray(user.inventario.badges) ? user.inventario.badges : [];
  user.inventario.titulos = Array.isArray(user.inventario.titulos) ? user.inventario.titulos : [];

  return user.inventario;
}

/**
 * 🔥 SISTEMA EQUIPAR / DESEQUIPAR (TOGGLE)
 * ✅ 1 por vez → substitui antigo
 * ✅ Clicar novamente → desequipa
 * ✅ Validação de tipo FORTE
 */
export async function equiparItem(user, tipo, itemId) {
  // ✅ FIX 3: VALIDAÇÃO DE TIPO FORTE
  const tiposPermitidos = ['moldura', 'fundo', 'efeito', 'badge', 'titulo'];
  if (!tiposPermitidos.includes(tipo)) {
    return { ok: false, msg: '❌ Tipo inválido! Use: moldura, fundo, efeito, badge, titulo' };
  }

  const inv = garantirInventario(user);

  const slots = {
    moldura: 'moldura',
    fundo: 'fundo',
    efeito: 'efeitoEquipado',
    badge: 'badgeEquipado',
    titulo: 'tituloEquipado'
  };

  const inventarioMap = {
    moldura: inv.molduras,
    fundo: inv.fundos,
    efeito: inv.efeitos,
    badge: inv.badges,
    titulo: inv.titulos
  };

  const campoUser = slots[tipo];
  const listaItens = inventarioMap[tipo];

  if (!listaItens || !listaItens.includes(itemId)) {
    return { ok: false, msg: '❌ Você não possui esse item' };
  }

  // LÓGICA PRINCIPAL
  if (user[campoUser] === itemId) {
    user[campoUser] = null;
    await user.save();
    return { ok: true, msg: `❎ Desequipado: ${tipo} → ${itemId}` };
  }

  user[campoUser] = itemId;
  await user.save();
  return { ok: true, msg: `✅ Equipado: ${tipo} → ${itemId}` };
}

/**
 * ⚡ NOVO: COMANDO DESEQUIPAR GLOBAL
 */
export async function desequiparTodos(user, tipo) {
  const tiposPermitidos = ['moldura', 'fundo', 'efeito', 'badge', 'titulo'];
  if (!tiposPermitidos.includes(tipo)) {
    return { ok: false, msg: '❌ Tipo inválido!' };
  }

  const slots = {
    moldura: 'moldura',
    fundo: 'fundo',
    efeito: 'efeitoEquipado',
    badge: 'badgeEquipado',
    titulo: 'tituloEquipado'
  };

  const campo = slots[tipo];
  if (!user[campo]) {
    return { ok: true, msg: `ℹ️ Nenhum(a) ${tipo} estava equipado(a).` };
  }

  user[campo] = null;
  await user.save();
  return { ok: true, msg: `✅ Todos os itens do tipo ${tipo} foram desequipados.` };
}

// ==================================================
// 🎨 PERFIL CANVAS (VERSÃO FINAL + NOVAS FUNÇÕES)
// ==================================================

export async function gerarPerfil(user, avatarURL = null) {
  // NORMALIZAÇÃO SEGURA
  const molduraId = user.moldura ?? 'padrao';
  const fundoId = user.fundo ?? 'padrao';
  const efeitoId = user.efeitoEquipado ?? null;
  const badgeId = user.badgeEquipado ?? null;
  const tituloId = user.tituloEquipado ?? null; // ✅ Adicionado título

  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext('2d');

  // ACESSO SEGURO AOS ITENS
  const fundo = fundos[fundoId] || fundos.padrao;
  const badge = badges[badgeId] || null;
  const efeitoValido = efeitos[efeitoId] ? efeitoId : null;

  // 1. FUNDO
  if (fundo.tipo === 'cor') {
    ctx.fillStyle = fundo.valor;
    ctx.fillRect(0, 0, 900, 300);
  }
  if (fundo.tipo === 'gradiente') {
    const grad = ctx.createLinearGradient(0, 0, 900, 300);
    grad.addColorStop(0, fundo.cores[0]);
    grad.addColorStop(1, fundo.cores[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 300);
  }

  // 2. EFEITO (ORDEM VISUAL CORRETA + SÓ SE EXISTIR)
  if (efeitoValido === 'aurora') {
    ctx.fillStyle = 'rgba(138, 43, 226, 0.15)';
    ctx.fillRect(0, 0, 900, 300);
  }
  if (efeitoValido === 'neve') {
    ctx.fillStyle = 'rgba(173, 216, 230, 0.12)';
    ctx.fillRect(0, 0, 900, 300);
  }
  if (efeitoValido === 'raios') {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, 900, 300);
  }

  // 3. OVERLAY ESCURO
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(30, 30, 840, 240);

  // 4. AVATAR REAL DO DISCORD (✅ ADICIONADO)
  const avatarX = 60;
  const avatarY = 70;
  const avatarSize = 160;

  if (avatarURL) {
    try {
      const img = await loadImage(avatarURL);
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      ctx.fillStyle = '#2b2d31';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Sans-serif';
      ctx.fillText('ERRO', avatarX + 45, avatarY + 85);
    }
  } else {
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Sans-serif';
    ctx.fillText('AVATAR', avatarX + 45, avatarY + 85);
  }

  // 5. MOLDURA
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';

  if (molduraId === 'ouro') { ctx.strokeStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20; }
  if (molduraId === 'neon') { ctx.strokeStyle = '#00d4ff'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 25; }
  if (molduraId === 'gelo') { ctx.strokeStyle = '#66ccff'; ctx.shadowColor = '#66ccff'; ctx.shadowBlur = 15; }
  if (molduraId === 'sombria') { ctx.strokeStyle = '#8b5cf6'; ctx.shadowColor = '#8b5cf6'; ctx.shadowBlur = 25; }
  if (molduraId === 'galaxia') { ctx.strokeStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 30; }

  ctx.lineWidth = 6;
  ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);
  ctx.shadowBlur = 0;

  // 6. TÍTULO (✅ ADICIONADO NO PERFIL)
  if (tituloId) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px Sans-serif';
    ctx.fillText(`📛 ${tituloId.toUpperCase()}`, 260, 70);
  }

  // 7. TEXTO
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Sans-serif';
  ctx.fillText(`Nível ${user.nivel || 1}`, 260, 100);
  ctx.font = '20px Sans-serif';
  ctx.fillText(`XP: ${user.xpDisponivel || 0}`, 260, 140);
  ctx.fillText(`Total XP: ${user.xpTotal || 0}`, 260, 170);
  ctx.fillText(`Reputação: ${user.reputacoes || 0}`, 260, 200);

  // 8. BADGE (SEM REDUNDÂNCIA + FALLBACK SEGURO)
  if (badge) {
    ctx.font = '28px Sans-serif';
    const icones = { estrela: '⭐', fogo: '🔥', coroa: '👑', rico: '💎', veterano: '🎖️', quiz: '🧠', lendario: '🏆', casal: '💞' };
    const icone = icones[badgeId] || '🏅';
    ctx.fillText(icone, 780, 70);
  }

  return canvas.toBuffer('image/png');
}

// ==================================================
// ⚙️ COMANDOS
// ==================================================

/**
 * 📌 COMANDO !MEUPERFIL
 */
export async function meuperfil(message) {
  const user = await getUser(message);
  if (!user) return message.reply('❌ Usuário não cadastrado.');

  // DEFAULTS SEGUROS
  user.moldura = user.moldura ?? 'padrao';
  user.fundo = user.fundo ?? 'padrao';
  user.efeitoEquipado = user.efeitoEquipado ?? null;
  user.badgeEquipado = user.badgeEquipado ?? null;
  user.tituloEquipado = user.tituloEquipado ?? null;

  // ✅ Avatar real do Discord
  const avatarURL = message.author.displayAvatarURL({ format: 'png', size: 256 });
  const img = await gerarPerfil(user, avatarURL);

  return message.channel.send({ files: [{ attachment: img, name: 'perfil.png' }] });
}

/**
 * 📌 COMANDO !EQUIPAR (TEXTO)
 */
export async function equipar(message, args) {
  const tipo = args[0]?.toLowerCase();
  const itemId = args[1]?.toLowerCase();

  if (!tipo || !itemId) {
    return message.reply('❌ Uso: `!equipar <tipo> <item>`\nEx: `!equipar moldura ouro`');
  }

  const user = await getUser(message);
  if (!user) return message.reply('❌ Usuário não encontrado.');

  const res = await equiparItem(user, tipo, itemId);
  return message.reply(res.msg);
}

/**
 * 📌 NOVO COMANDO !DESEQUIPAR
 */
export async function desequipar(message, args) {
  const tipo = args[0]?.toLowerCase();

  if (!tipo) {
    return message.reply('❌ Uso: `!desequipar <tipo>`\nEx: `!desequipar moldura`');
  }

  const user = await getUser(message);
  if (!user) return message.reply('❌ Usuário não encontrado.');

  const res = await desequiparTodos(user, tipo);
  return message.reply(res.msg);
}

/**
 * 📦 COMANDO !INVENTARIO (COM BOTÕES + CORREÇÕES GRAVES)
 */
export async function inventario(message) {
  // ✅ FIX 4: SEMPRE BUSCA USUÁRIO ATUALIZADO
  let user = await Usuario.findOne({
    userId: message.author.id,
    guildId: message.guild.id
  });
  if (!user) return message.reply('❌ Usuário não cadastrado.');

  let inv = garantirInventario(user);

  const embed = new EmbedBuilder()
    .setTitle('🎒 SEU INVENTÁRIO')
    .setDescription('Clique nas categorias para ver e equipar')
    .setColor('#00d4ff');

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('inv_moldura').setLabel('🪟 Molduras').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('inv_fundo').setLabel('🎨 Fundos').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('inv_efeito').setLabel('✨ Efeitos').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('inv_badge').setLabel('🏅 Badges').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('inv_titulo').setLabel('📛 Títulos').setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [botoes] });
  const coletor = msg.createMessageComponentCollector({ time: 600000 });

  coletor.on('collect', async (interacao) => {
    if (interacao.user.id !== message.author.id) return;

    const tipo = interacao.customId.replace('inv_', '');

    // ✅ FIX 1: MAPEAMENTO SEGURO (sem erro de plural)
    const mapaTipos = {
      moldura: 'molduras',
      fundo: 'fundos',
      efeito: 'efeitos',
      badge: 'badges',
      titulo: 'titulos'
    };
    const lista = inv[mapaTipos[tipo]] || [];

    if (!lista.length) {
      return interacao.reply({ content: '❌ Você não tem itens dessa categoria', ephemeral: true });
    }

    const row = new ActionRowBuilder();
    lista.forEach(id => {
      const equipado = (tipo === 'moldura' && user.moldura === id) ||
                       (tipo === 'fundo' && user.fundo === id) ||
                       (tipo === 'efeito' && user.efeitoEquipado === id) ||
                       (tipo === 'badge' && user.badgeEquipado === id) ||
                       (tipo === 'titulo' && user.tituloEquipado === id);

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`equip_${tipo}_${id}`)
          .setLabel(`${equipado ? '✅' : ''} ${id}`)
          .setStyle(equipado ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
    });

    await interacao.reply({ content: `📦 ${tipo.toUpperCase()}`, components: [row], ephemeral: true });
  });

  coletor.on('end', () => {
    msg.edit({ components: [] }).catch(() => {});
  });
}

/**
 * 🎯 HANDLER DE BOTÕES (EQUIPAR REAL + MELHORIAS UX)
 */
export async function handleBotoes(interacao) {
  if (!interacao.customId.startsWith('equip_')) return;

  const [_, tipo, itemId] = interacao.customId.split('_');

  // ✅ FIX 2: RECARREGA USUÁRIO DO BANCO (dados sempre atualizados)
  const user = await Usuario.findOne({
    userId: interacao.user.id,
    guildId: interacao.guild.id
  });

  if (!user) return interacao.reply({ content: '❌ Usuário não encontrado', ephemeral: true });

  const res = await equiparItem(user, tipo, itemId);

  if (res.ok) {
    const avatarURL = interacao.user.displayAvatarURL({ format: 'png', size: 256 });
    const img = await gerarPerfil(user, avatarURL);

    return interacao.update({
      content: `${res.msg}\n\n📌 Perfil atualizado:`,
      files: [{ attachment: img, name: 'perfil.png' }],
      components: interacao.message.components
    });
  }

  return interacao.reply({ content: res.msg, ephemeral: true });
}

// ==================================================
// 🛒 SISTEMA DE LOJA (INÍCIO) - PRONTO PARA EXPANDIR
// ==================================================

/**
 * 🛒 EXEMPLO DE FUNÇÃO PARA ADICIONAR ITEM AO INVENTÁRIO
 * (Usado pela loja, recompensas, etc.)
 */
export async function adicionarAoInventario(user, tipo, itemId) {
  const mapaTipos = {
    moldura: 'molduras',
    fundo: 'fundos',
    efeito: 'efeitos',
    badge: 'badges',
    titulo: 'titulos'
  };

  const chave = mapaTipos[tipo];
  if (!chave) return { ok: false, msg: 'Tipo inválido' };

  const inv = garantirInventario(user);
  if (!inv[chave].includes(itemId)) {
    inv[chave].push(itemId);
    await user.save();
    return { ok: true, msg: `📦 Item adicionado: ${itemId}` };
  }

  return { ok: false, msg: 'ℹ️ Você já possui esse item.' };
}
