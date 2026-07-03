import { createCanvas, loadImage } from '@napi-rs/canvas';
import { fundos, molduras, efeitos, badges as badgeCfg } from './perfilConfig.mjs';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function xpForLevel(lvl) { return lvl * 500; }

function rarityColor(r) {
  return { Comum: '#9e9e9e', Incomum: '#4caf50', Raro: '#2196f3', Épico: '#9c27b0', Lendário: '#ff9800' }[r] ?? '#ffffff';
}

function molduraColor(id) {
  return {
    padrao: '#ffffff', neon_roxo: '#bf00ff', neon_azul: '#00d4ff', sakura: '#ffb7c5',
    real: '#ffd700', sombria: '#8b5cf6', angelical: '#ffffff', demoniaca: '#ff2200',
    futurista: '#00ff99', galaxia: '#a78bfa',
  }[id] ?? '#ffffff';
}

function molduraGlow(id) {
  return { padrao: 0, neon_roxo: 30, neon_azul: 30, sakura: 18, real: 22, sombria: 28, angelical: 35, demoniaca: 28, futurista: 22, galaxia: 35 }[id] ?? 0;
}

const BADGE_ICONS = { estrela: '★', fogo: '♦', coroa: '◆', rico: '◈', veterano: '⬡', quiz: '✦', lendario: '⬟', casal: '♥' };

export async function gerarPerfil(user) {
  const W = 1000, H = 600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const fundoId   = user.fundo    ?? 'escuro';
  const molduraId = user.moldura  ?? 'padrao';
  const efeitoId  = user.efeitoEquipado ?? null;
  const fundo     = fundos[fundoId] || fundos.escuro;

  if (fundo.tipo === 'cor') {
    ctx.fillStyle = fundo.valor;
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, fundo.cores[0]);
    g.addColorStop(1, fundo.cores[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const overlays = { aurora: 'rgba(138,43,226,0.14)', neve: 'rgba(173,216,230,0.12)', raios: 'rgba(255,255,255,0.07)', energia: 'rgba(0,212,255,0.10)', petalas: 'rgba(255,183,197,0.12)', fumaca: 'rgba(20,20,20,0.22)', estrelas: 'rgba(255,255,200,0.06)' };
  if (efeitoId && overlays[efeitoId]) { ctx.fillStyle = overlays[efeitoId]; ctx.fillRect(0, 0, W, H); }

  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  roundRect(ctx, 20, 20, W - 40, H - 40, 20);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(320, 40); ctx.lineTo(320, H - 40); ctx.stroke();

  const AX = 65, AY = 65, AS = 185;
  const ACX = AX + AS / 2, ACY = AY + AS / 2, AR = AS / 2;

  try {
    const av = await loadImage(user.avatar);
    ctx.save();
    ctx.beginPath();
    ctx.arc(ACX, ACY, AR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(av, AX, AY, AS, AS);
    ctx.restore();
  } catch {
    ctx.fillStyle = '#36393f';
    ctx.beginPath(); ctx.arc(ACX, ACY, AR, 0, Math.PI * 2); ctx.fill();
  }

  const mCor = molduraColor(molduraId), mGlow = molduraGlow(molduraId);
  ctx.save();
  if (mGlow > 0) { ctx.shadowColor = mCor; ctx.shadowBlur = mGlow; }
  ctx.strokeStyle = mCor; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(ACX, ACY, AR + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  const nivel    = user.nivel ?? 1;
  const xpAtual  = user.xpDisponivel ?? 0;
  const xpNeeded = xpForLevel(nivel);
  const xpPct    = Math.min(xpAtual / xpNeeded, 1);

  const barX = AX, barY = AY + AS + 18, barW = AS, barH = 14;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, barX, barY, barW, barH, 7); ctx.fill();
  const xpG = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  xpG.addColorStop(0, '#7c3aed'); xpG.addColorStop(1, '#00d4ff');
  ctx.fillStyle = xpG;
  roundRect(ctx, barX, barY, Math.max(barW * xpPct, 10), barH, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '11px Sans'; ctx.textAlign = 'center';
  ctx.fillText(`${xpAtual.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`, barX + barW / 2, barY + barH + 14);
  ctx.textAlign = 'left';

  const badgeId = user.badgeEquipado;
  if (badgeId && BADGE_ICONS[badgeId]) {
    const bCfg = badgeCfg[badgeId];
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(ctx, AX + 20, barY + 34, AS - 40, 26, 8); ctx.fill();
    ctx.fillStyle = bCfg ? rarityColor(bCfg.raridade) : '#ffd700';
    ctx.font = 'bold 13px Sans'; ctx.textAlign = 'center';
    ctx.fillText(`${BADGE_ICONS[badgeId]} ${bCfg?.nome ?? badgeId}`, ACX, barY + 52);
    ctx.textAlign = 'left';
  }

  const listaBadges = (user.badges ?? []).slice(0, 6);
  if (listaBadges.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.font = '10px Sans'; ctx.textAlign = 'center';
    ctx.fillText('Badges', ACX, H - 78);
    listaBadges.forEach((b, i) => {
      const bCfg2 = badgeCfg[b];
      ctx.fillStyle = bCfg2 ? rarityColor(bCfg2.raridade) : '#ffd700';
      ctx.font = '22px Sans'; ctx.textAlign = 'left';
      ctx.fillText(BADGE_ICONS[b] ?? '✦', AX + i * 36, H - 52);
    });
    ctx.textAlign = 'left';
  }

  const TX = 338, TW = W - TX - 30;

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 28px Sans';
  ctx.fillText((user.displayName ?? user.username ?? 'Usuário').slice(0, 22), TX, 76);
  ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.font = '15px Sans';
  ctx.fillText(`@${(user.username ?? 'usuario').slice(0, 24)}`, TX, 98);
  ctx.fillStyle = '#ffd700'; ctx.font = 'italic 14px Sans';
  ctx.fillText(`✦  ${(user.titulo ?? 'Sem título').slice(0, 30)}`, TX, 120);

  const stats = [
    { label: 'Nível',        value: `${nivel}` },
    { label: 'XP Total',     value: (user.xpTotal ?? 0).toLocaleString() },
    { label: 'Reputação',    value: `${user.reputacao ?? 0}` },
    { label: 'Mensagens',    value: (user.totalMensagens ?? 0).toLocaleString() },
    { label: 'Streak',       value: `${user.streak ?? 0} dias` },
    { label: 'Parceiro',     value: (user.casadoCom ?? 'Nenhum').slice(0, 14) },
    { label: 'Afinidade',    value: `${user.afinidade ?? 0}` },
    { label: 'Membro desde', value: user.membroDesde ?? '—' },
  ];

  const GY = 140, GCW = Math.floor(TW / 2) - 6, GH = 50;
  stats.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = TX + col * (GCW + 8), y = GY + row * (GH + 6);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; roundRect(ctx, x, y, GCW, GH, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = '11px Sans'; ctx.fillText(s.label, x + 10, y + 17);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px Sans'; ctx.fillText(String(s.value).slice(0, Math.floor(GCW / 9)), x + 10, y + 38);
  });

  const cosY = H - 85;
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; roundRect(ctx, TX, cosY, TW, 52, 12); ctx.fill();
  [
    { label: 'Fundo',   value: fundos[fundoId]?.nome ?? fundoId },
    { label: 'Moldura', value: molduras[molduraId]?.nome ?? molduraId },
    { label: 'Efeito',  value: efeitoId ? (efeitos[efeitoId]?.nome ?? efeitoId) : 'Nenhum' },
  ].forEach((c, i) => {
    const cx = TX + i * Math.floor(TW / 3) + 10;
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.font = '10px Sans'; ctx.fillText(c.label, cx, cosY + 17);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px Sans'; ctx.fillText(c.value.slice(0, 14), cx, cosY + 38);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.font = '11px Sans'; ctx.textAlign = 'right';
  ctx.fillText('FiskBot', W - 32, H - 28);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}
