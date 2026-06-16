import { createCanvas } from '@napi-rs/canvas';
import {
  fundos,
  molduras,
  efeitos,
  badges
} from '../systems/perfilConfig.mjs';
import Usuario from '../db/models/Usuario.mjs';

/**
 * 🔥 PERFIL PRINCIPAL (CANVAS RPG)
 */
export async function gerarPerfil(user) {
  // ✅ NORMALIZAÇÃO SEGURA DOS IDS
  const molduraId = user.moldura ?? 'padrao';
  const fundoId = user.fundo ?? 'padrao';
  const efeitoId = user.efeitoEquipado ?? null;
  const badgeId = user.badgeEquipado ?? null;

  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext('2d');

  // ✅ ACESSO SEGURO AOS ITENS
  const fundo = fundos[fundoId] || fundos.padrao;
  const badge = badges[badgeId] || null;
  const efeito = efeitoId;

  // ==============================================
  // 🔹 1. FUNDO
  // ==============================================
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

  // ==============================================
  // 🔹 2. EFEITO (AGORA LOGO APÓS FUNDO — ORDEM CORRETA)
  // ==============================================
  if (efeito === 'aurora') {
    ctx.fillStyle = 'rgba(138, 43, 226, 0.15)';
    ctx.fillRect(0, 0, 900, 300);
  }
  if (efeito === 'neve') {
    ctx.fillStyle = 'rgba(173, 216, 230, 0.12)';
    ctx.fillRect(0, 0, 900, 300);
  }
  if (efeito === 'raios') {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, 900, 300);
  }

  // ==============================================
  // 🔹 3. OVERLAY ESCURO (DEPOIS DO EFEITO)
  // ==============================================
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(30, 30, 840, 240);

  // ==============================================
  // 🔹 4. AVATAR
  // ==============================================
  const avatarX = 60;
  const avatarY = 70;
  const avatarSize = 160;

  ctx.fillStyle = '#2b2d31';
  ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);

  // placeholder do avatar
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Sans-serif';
  ctx.fillText('AVATAR', avatarX + 45, avatarY + 85);

  // ==============================================
  // 🔹 5. MOLDURA
  // ==============================================
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';

  if (molduraId === 'ouro') {
    ctx.strokeStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
  }
  if (molduraId === 'neon') {
    ctx.strokeStyle = '#00d4ff';
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 25;
  }
  if (molduraId === 'gelo') {
    ctx.strokeStyle = '#66ccff';
    ctx.shadowColor = '#66ccff';
    ctx.shadowBlur = 15;
  }
  if (molduraId === 'sombria') {
    ctx.strokeStyle = '#8b5cf6';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 25;
  }
  if (molduraId === 'galaxia') {
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 30;
  }

  ctx.lineWidth = 6;
  ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);
  ctx.shadowBlur = 0;

  // ==============================================
  // 🔹 6. TEXTO
  // ==============================================
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Sans-serif';
  ctx.fillText(`Nível ${user.nivel || 1}`, 260, 100);

  ctx.font = '20px Sans-serif';
  ctx.fillText(`XP: ${user.xpDisponivel || 0}`, 260, 140);
  ctx.fillText(`Total XP: ${user.xpTotal || 0}`, 260, 170);
  ctx.fillText(`Reputação: ${user.reputacoes || 0}`, 260, 200);

  // ==============================================
  // 🔹 7. BADGE (SEM REDUNDÂNCIA)
  // ==============================================
  if (badge) {
    ctx.font = '28px Sans-serif';
    const icones = {
      estrela: '⭐',
      fogo: '🔥',
      coroa: '👑',
      rico: '💎',
      veterano: '🎖️',
      quiz: '🧠',
      lendario: '🏆',
      casal: '💞'
    };
    // ✅ Como já tem "if (badge)", não precisa de fallback extra
    const icone = icones[badgeId];
    ctx.fillText(icone, 780, 70);
  }

  return canvas.toBuffer('image/png');
}

/**
 * ⚙️ COMANDO !MEUPERFIL
 */
export async function meuperfil(message) {
  const user = await Usuario.findOne({
    userId: message.author.id,
    guildId: message.guild.id
  });

  if (!user) {
    return message.reply('❌ Usuário não encontrado.');
  }

  // ✅ DEFAULTS SEGUROS
  user.moldura = user.moldura ?? 'padrao';
  user.fundo = user.fundo ?? 'padrao';
  user.efeitoEquipado = user.efeitoEquipado ?? null;
  user.badgeEquipado = user.badgeEquipado ?? null;

  const img = await gerarPerfil(user);

  return message.channel.send({
    files: [{
      attachment: img,
      name: 'perfil.png'
    }]
  });
}
