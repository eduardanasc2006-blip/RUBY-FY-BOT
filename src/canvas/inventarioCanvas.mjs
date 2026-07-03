import { createCanvas } from '@napi-rs/canvas';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

const RARITY_COLORS = { lendario:'#ffd700', epico:'#9b59b6', raro:'#3498db', incomum:'#2ecc71', comum:'#95a5a6' };

export async function gerarInventario(username, items) {
  const COLS = 4, SZ = 110, PAD = 16, TOP = 70;
  const rows = Math.ceil(items.length / COLS);
  const W = COLS*(SZ+PAD)+PAD, H = TOP+rows*(SZ+PAD)+PAD;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle='#0d0d1f'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffffff'; ctx.font='bold 20px Sans'; ctx.textAlign='center';
  ctx.fillText(`🎒 Inventário — ${username}`, W/2, 42);

  items.forEach((item, i) => {
    const col = i%COLS, row = Math.floor(i/COLS);
    const x = PAD+col*(SZ+PAD), y = TOP+row*(SZ+PAD);
    const color = RARITY_COLORS[item.raridade] ?? '#95a5a6';
    ctx.fillStyle='rgba(255,255,255,0.07)'; roundRect(ctx,x,y,SZ,SZ,10); ctx.fill();
    ctx.strokeStyle=color; ctx.lineWidth=1.5; roundRect(ctx,x,y,SZ,SZ,10); ctx.stroke();
    ctx.fillStyle=color; ctx.font='28px Sans'; ctx.textAlign='center';
    ctx.fillText(item.emoji??'📦', x+SZ/2, y+46);
    ctx.fillStyle='#ffffff'; ctx.font='bold 11px Sans';
    ctx.fillText((item.nome??'Item').slice(0,12), x+SZ/2, y+70);
    if (item.equipado) { ctx.fillStyle='#2ecc71'; ctx.font='10px Sans'; ctx.fillText('✓ Equipado', x+SZ/2, y+86); }
  });

  return canvas.toBuffer('image/png');
}
