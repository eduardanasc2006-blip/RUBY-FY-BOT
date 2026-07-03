import { createCanvas } from '@napi-rs/canvas';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

export async function gerarQuizCard(pergunta, alternativas) {
  const W = 700, H = 280;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle='#0d0d1f'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#7c3aed'; ctx.lineWidth=2;
  roundRect(ctx,10,10,W-20,H-20,14); ctx.stroke();

  ctx.fillStyle='#7c3aed'; ctx.font='bold 15px Sans'; ctx.textAlign='left';
  ctx.fillText('🧠  QUIZ', 28, 42);
  ctx.fillStyle='#ffffff'; ctx.font='bold 18px Sans';

  const pWords = pergunta.split(' ');
  let line='', y=75;
  for (const w of pWords) {
    const test=line+(line?' ':'')+w;
    if (ctx.measureText(test).width > W-56) { ctx.fillText(line,28,y); line=w; y+=26; }
    else line=test;
  }
  ctx.fillText(line,28,y); y+=36;

  const letters=['A','B','C','D'];
  const colors=['#e74c3c','#2ecc71','#3498db','#f1c40f'];
  alternativas.slice(0,4).forEach((alt,i) => {
    const bx=28+(i%2)*330, by=y+Math.floor(i/2)*46;
    ctx.fillStyle=colors[i]+'33'; roundRect(ctx,bx,by,300,36,8); ctx.fill();
    ctx.strokeStyle=colors[i]; ctx.lineWidth=1; roundRect(ctx,bx,by,300,36,8); ctx.stroke();
    ctx.fillStyle=colors[i]; ctx.font='bold 13px Sans';
    ctx.fillText(letters[i]+'.', bx+10, by+23);
    ctx.fillStyle='#ffffff'; ctx.font='13px Sans';
    ctx.fillText(alt.slice(0,28), bx+28, by+23);
  });

  return canvas.toBuffer('image/png');
}
