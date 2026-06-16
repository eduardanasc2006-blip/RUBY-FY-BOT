import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
  fundos,
  molduras,
  efeitos,
  badges
} from '../systems/perfilConfig.mjs';

/**
 * 🔥 PERFIL PRINCIPAL (CANVAS RPG)
 */
export async function gerarPerfil(user) {
  // =========================
  // 🔹 1. IDS NORMALIZADOS
  // =========================
  const molduraId = user.moldura ?? 'padrao';
  const fundoId = user.fundo ?? 'padrao';
  const efeitoId = user.efeitoEquipado ?? null;
  const badgeId = user.badgeEquipado ?? null;

  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext('2d');

  // =========================
  // 🔹 2. DADOS NOVOS DO USUÁRIO
  // =========================
  const avatarUrl = user.avatar;
  const titulo = user.titulo ?? 'Sem título';
  const parceiro = user.casadoCom ?? 'Nenhum';
  const listaBadges = user.badges || [];

  // =========================
  // 🔹 3. FUNDO
  // =========================
  const fundo = fundos[fundoId] || fundos.padrao;

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

  // =========================
  // 🔹 4. EFEITO
  // =========================
  if (efeitoId === 'aurora') {
    ctx.fillStyle = 'rgba(138, 43, 226, 0.15)';
    ctx.fillRect(0, 0, 900, 300);
  }
  if (efeitoId === 'neve') {
    ctx.fillStyle = 'rgba(173, 216, 230, 0.12)';
    ctx.fillRect(0, 0, 900, 300);
  }
  if (efeitoId === 'raios') {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, 900, 300);
  }

  // =========================
  // 🔹 5. OVERLAY
  // =========================
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(30, 30, 840, 240);

  // =========================
  // 🔹 6. AVATAR REAL
  // =========================
  const avatarX = 60;
  const avatarY = 70;
  const avatarSize = 160;

  try {
    const avatar = await loadImage(avatarUrl);

    ctx.save();
    ctx.beginPath();
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  }

  // =========================
  // 🔹 7. MOLDURA
  // =========================
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

  // =========================
  // 🔹 8. TEXTO
  // =========================
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Sans-serif';
  ctx.fillText(`Nível ${user.nivel || 1}`, 260, 100);

  ctx.font = '20px Sans-serif';
  ctx.fillText(`XP: ${user.xpDisponivel || 0}`, 260, 140);
  ctx.fillText(`Total XP: ${user.xpTotal || 0}`, 260, 170);
  ctx.fillText(`Reputação: ${user.reputacoes || 0}`, 260, 200);

  // =========================
  // 🔹 9. TÍTULO + PARCEIRO
  // =========================
  ctx.fillText(`Título: ${titulo}`, 260, 230);
  ctx.fillText(`Parceiro: ${parceiro}`, 260, 260);

  // =========================
  // 🔹 10. BADGES (GRID SIMPLES)
  // =========================
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

  let x = 700;
  let y = 80;

  listaBadges.slice(0, 6).forEach((b) => {
    const icon = icones[b] || '🏅';
    ctx.font = '24px Sans-serif';
    ctx.fillText(icon, x, y);
    y += 30;
  });

  return canvas.toBuffer('image/png');
}
