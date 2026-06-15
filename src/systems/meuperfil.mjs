import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getDB } from '../db/sqlite.mjs';

/* =========================
   CONFIG
========================= */
const AVATAR_PADRAO = 'https://cdn.discordapp.com/embed/avatars/0.png';

/* =========================
   RENDER PERFIL
========================= */
export async function renderPerfil(data) {
  const canvas = createCanvas(800, 420);
  const ctx = canvas.getContext('2d');

  // 1. FUNDO
  ctx.fillStyle = '#0b0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#11141b';
  ctx.fillRect(20, 20, 760, 380);

  // 2. AVATAR
  try {
    const avatar = await loadImage(data.avatar || AVATAR_PADRAO);
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 130, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 50, 60, 140, 140);
    ctx.restore();
  } catch (err) {
    console.error('[perfil] avatar erro:', err);
  }

  // 3. TEXTO
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Arial';
  ctx.fillText(data.nome || 'Usuário', 220, 110);

  ctx.fillStyle = '#00ff88';
  ctx.font = '20px Arial';
  ctx.fillText(`XP: ${data.xp || 0}`, 220, 160);

  // 4. BORDA BASE
  ctx.strokeStyle = '#00a2ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // 5. MOLDURA (USUÁRIO)
  if (data.moldura) {
    try {
      const frame = await loadImage(`assets/frames/${data.moldura}.png`);
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      console.error('[perfil] moldura erro:', err);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6;
      ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);
    }
  }

  // 6. EFEITOS (VÁRIOS AO MESMO TEMPO)
  if (Array.isArray(data.efeitos)) {
    for (const efeitoId of data.efeitos) {
      try {
        const efeitoImg = await loadImage(`assets/frames/${efeitoId}.png`);
        ctx.globalAlpha = 0.75; // transparência para não tampar texto
        ctx.drawImage(efeitoImg, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      } catch (err) {
        console.error('[perfil] efeito erro:', err);
      }
    }
  }

  // 7. BADGES (IMAGENS, ATÉ 5)
  // Agora inclui TODOS os tipos: comprados, conquista e automáticos
  if (Array.isArray(data.badges)) {
    let posX = 220;
    const posY = 200;
    const tamanho = 32; // Tamanho exato para caber bem

    // Mostra no máximo 5 badges por linha
    for (const badgeId of data.badges.slice(0, 5)) {
      try {
        // Carrega a imagem da pasta correta
        const badgeImg = await loadImage(`assets/badges/${badgeId}.png`);
        ctx.drawImage(badgeImg, posX, posY, tamanho, tamanho);
      } catch (err) {
        // Se não encontrar a imagem, mostra ícone de texto
        console.error('[perfil] badge erro:', badgeId, err);
        ctx.fillStyle = '#ffd700';
        ctx.font = '20px Arial';
        ctx.fillText(`🏅`, posX, posY + 24);
      }
      posX += tamanho + 8; // Espaçamento entre badges
    }

    // Se tiver mais de 5, mostra quantos faltam
    if (data.badges.length > 5) {
      ctx.fillStyle = '#aaa';
      ctx.font = '14px Arial';
      ctx.fillText(`+${data.badges.length - 5}`, posX, posY + 22);
    }
  }

  return canvas.toBuffer('image/png');
}

/* =========================
   COMMAND !meuperfil
========================= */
export function register(client, configs) {
  if (client.__meuPerfilRegistrado) return;
  client.__meuPerfilRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const prefixo = configs.get(msg.guild.id)?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;
    const cmd = msg.content.slice(prefixo.length).trim().split(/\s+/)[0].toLowerCase();
    if (cmd !== 'meuperfil') return;

    try {
      const db = getDB();
      if (!db) return msg.reply('❌ Banco de dados não está pronto.');

      // Busca dados do usuário
      const user = db.prepare(`
        SELECT moldura, badges, efeitos, xpDisponivel 
        FROM usuarios 
        WHERE userId = ? AND guildId = ?
      `).get(msg.author.id, msg.guild.id);

      // Parse SEGURO (não quebra se estiver vazio ou corrompido)
      let badges = [];
      let efeitos = [];
      try { badges = user?.badges ? JSON.parse(user.badges) : []; } catch { badges = []; }
      try { efeitos = user?.efeitos ? JSON.parse(user.efeitos) : []; } catch { efeitos = []; }

      // Dados prontos para renderizar
      const data = {
        nome: msg.author.username,
        avatar: msg.author.displayAvatarURL({ extension: 'png', size: 256 }),
        xp: user?.xpDisponivel || 0,
        moldura: user?.moldura || null,
        badges, // <- Aqui entram: comprados, Veterano, Quiz, Lendário, Casado
        efeitos
      };

      const buffer = await renderPerfil(data);
      const file = new AttachmentBuilder(buffer, { name: 'perfil.png' });

      return msg.reply({ files: [file] });

    } catch (err) {
      console.error('[perfil] erro completo:', err);
      return msg.reply('❌ Erro ao gerar perfil.');
    }
  });
}

export const comandos = [
  { cmd: '!meuperfil', desc: 'Mostra seu perfil com molduras, badges e efeitos.' },
];
