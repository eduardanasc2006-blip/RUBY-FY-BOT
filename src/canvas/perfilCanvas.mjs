import { createCanvas, loadImage } from '@napi-rs/canvas';

function formatarData(data) {
  if (!data) return 'Desconhecida';
  const d = new Date(data);
  if (isNaN(d.getTime())) return 'Desconhecida';
  return d.toLocaleDateString('pt-BR');
}

/**
 * 🔥 PERFIL ÚNICO (imagem composta simples)
 */
export async function gerarPerfil(user) {
  const canvas = createCanvas(900, 340);
  const ctx = canvas.getContext('2d');

  // =========================
  // 🔹 1. FUNDO
  // =========================
  const grad = ctx.createLinearGradient(0, 0, 900, 340);
  grad.addColorStop(0, '#1a1b1e');
  grad.addColorStop(1, '#2b2d31');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 900, 340);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(30, 30, 840, 280);

  // =========================
  // 🔹 2. AVATAR
  // =========================
  const avatarX = 60;
  const avatarY = 70;
  const avatarSize = 180;

  try {
    const avatar = await loadImage(user.avatar);

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

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#5865f2';
  ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);

  // =========================
  // 🔹 3. NOME + TAG
  // =========================
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Sans-serif';
  ctx.fillText(user.nome || 'Usuário', 280, 90);

  ctx.fillStyle = '#b5bac1';
  ctx.font = '18px Sans-serif';
  ctx.fillText(user.tag || '', 280, 118);

  // =========================
  // 🔹 4. INFORMAÇÕES
  // =========================
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Sans-serif';

  const linhas = [
    `Nível: ${user.nivel ?? 1}`,
    `XP: ${user.xpDisponivel ?? 0} (Total: ${user.xpTotal ?? 0})`,
    `Reputação: ${user.reputacao ?? 0}`,
    `Casado(a) com: ${user.casadoCom ?? 'Ninguém'}`,
    `Título: ${user.titulo ?? 'Sem título'}`,
    `Gênero: ${user.genero ?? 'Não informado'}`,
    `Entrou em: ${formatarData(user.dataEntrada)}`,
    `Conquistas: ${user.conquistasTotal ?? 0}/${user.conquistasMax ?? 0}`
  ];

  let y = 155;
  for (const linha of linhas) {
    ctx.fillText(linha, 280, y);
    y += 28;
  }

  return canvas.toBuffer('image/png');
}
