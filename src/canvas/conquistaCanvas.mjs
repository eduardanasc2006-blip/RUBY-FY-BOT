import { createCanvas } from '@napi-rs/canvas';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

export async function gerarConquistas(username, conquistas) {
  const COLS = 5, SZ = 90, PAD = 12, TOP = 70;
  const rows = Math.max(1, Math.ceil(conquistas.length / COLS));
  const W = COLS*(SZ+PAD)+PAD, H = TOP+rows*(SZ+PAD)+PAD;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle='#0d0d1f'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffd700'; ctx.font='bold 20px Sans'; ctx.textAlign='center';
  ctx.fillText(`🏆 Conquistas — ${username}`, W/2, 42);

  conquistas.forEach((c, i) => {
    const col = i%COLS, row = Math.floor(i/COLS);
    const x = PAD+col*(SZ+PAD), y = TOP+row*(SZ+PAD);
    ctx.fillStyle=c.desbloqueada ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.05)';
    roundRect(ctx,x,y,SZ,SZ,10); ctx.fill();
    ctx.strokeStyle=c.desbloqueada ? '#ffd700' : '#444';
    ctx.lineWidth=1.5; roundRect(ctx,x,y,SZ,SZ,10); ctx.stroke();
    ctx.globalAlpha=c.desbloqueada?1:0.3;
    ctx.font='26px Sans'; ctx.textAlign='center';
    ctx.fillStyle='#ffffff';
    ctx.fillText(c.emoji??'🔒', x+SZ/2, y+38);
    ctx.font='bold 9px Sans';
    ctx.fillText((c.nome??'').slice(0,12), x+SZ/2, y+56);
    ctx.globalAlpha=1;
  });

  return canvas.toBuffer('image/png');
}
