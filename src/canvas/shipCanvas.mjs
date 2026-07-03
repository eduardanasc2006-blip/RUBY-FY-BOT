import { createCanvas, loadImage } from '@napi-rs/canvas';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function getShipColor(pct) {
  if (pct >= 85) return '#ff4da6';
  if (pct >= 60) return '#ff9e00';
  if (pct >= 35) return '#7c3aed';
  return '#64748b';
}

export async function gerarShip(user1, user2, pct) {
  const W = 700, H = 220;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#0d0d1f'); bg.addColorStop(1,'#200040');
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

  const color = getShipColor(pct);

  async function drawAvatar(url, cx, cy, radius) {
    try {
      const img = await loadImage(url);
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2); ctx.clip();
      ctx.drawImage(img,cx-radius,cy-radius,radius*2,radius*2); ctx.restore();
    } catch {
      ctx.fillStyle='#36393f'; ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle=color; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2); ctx.stroke();
  }

  await drawAvatar(user1.avatar,100,110,60);
  await drawAvatar(user2.avatar,600,110,60);

  ctx.fillStyle=color; ctx.font='bold 36px Sans'; ctx.textAlign='center';
  ctx.fillText('💖', W/2, 105);
  ctx.font='bold 28px Sans'; ctx.fillStyle='#ffffff';
  ctx.fillText(`${pct}%`, W/2, 148);

  const barW=260, barH=14, bx=W/2-barW/2, by=163;
  ctx.fillStyle='rgba(255,255,255,0.1)'; roundRect(ctx,bx,by,barW,barH,7); ctx.fill();
  ctx.fillStyle=color; roundRect(ctx,bx,by,barW*(pct/100),barH,7); ctx.fill();

  ctx.font='13px Sans'; ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.textAlign='center';
  ctx.fillText(`${(user1.username??'').slice(0,14)} & ${(user2.username??'').slice(0,14)}`, W/2, 197);

  return canvas.toBuffer('image/png');
}
