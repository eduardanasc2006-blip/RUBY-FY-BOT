import { createCanvas, loadImage } from '@napi-rs/canvas';

export async function gerarCasamento(user1, user2, diasJuntos) {
  const W = 700, H = 220;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#1a0030'); bg.addColorStop(1,'#0d001a');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

  async function drawAvatar(url, cx, cy, r) {
    try {
      const img = await loadImage(url);
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
      ctx.drawImage(img,cx-r,cy-r,r*2,r*2); ctx.restore();
    } catch {
      ctx.fillStyle='#36393f'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle='#ff5fa2'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  }

  await drawAvatar(user1.avatar, 110, 110, 65);
  await drawAvatar(user2.avatar, 590, 110, 65);

  ctx.font='bold 34px Sans'; ctx.textAlign='center'; ctx.fillStyle='#ff5fa2';
  ctx.fillText('💍', W/2, 100);
  ctx.font='bold 20px Sans'; ctx.fillStyle='#ffffff';
  ctx.fillText(`Juntos há ${diasJuntos} dia(s)`, W/2, 140);
  ctx.font='13px Sans'; ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.fillText(`${(user1.username??'').slice(0,14)} ♥ ${(user2.username??'').slice(0,14)}`, W/2, 170);

  return canvas.toBuffer('image/png');
}
