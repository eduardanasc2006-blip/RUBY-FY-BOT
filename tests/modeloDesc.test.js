const { criar, atualizar, obter, excluir } = require('../src/utils/embedModelos');
const path = require('node:path');
const fs = require('node:fs');
const ARQ = path.join(__dirname, '..', 'data', 'modelos_embed.json');
const bk = fs.existsSync(ARQ) ? fs.readFileSync(ARQ) : null;
function ok(c, m) { console.log((c ? '[OK] ' : '[FALHA] ') + m); if (!c) process.exitCode = 1; }
function limpar() {
  if (bk === null) { try { fs.rmSync(ARQ, { force: true }); } catch {} }
  else { fs.writeFileSync(ARQ, bk); }
}
(async () => {
  try {
    const r1 = criar('g1', { nome: 'Modelo1', categoria: 'cat', descricao: 'Desc original', dados: { descricao: 'x' } });
    ok(r1.ok && r1.modelo.descricao === 'Desc original', 'criar salva descricao');
    ok(r1.modelo.categoria !== null, 'categoria criada');
    const r2 = atualizar('g1', r1.modelo.id, { descricao: 'Desc nova' });
    ok(r2.ok && r2.modelo.descricao === 'Desc nova', 'atualizar troca descricao');
    const r3 = atualizar('g1', r1.modelo.id, { nome: 'Modelo1' });
    ok(r3.ok && r3.modelo.descricao === 'Desc nova', 'atualizar sem descricao preserva');
    const r4 = atualizar('g1', r1.modelo.id, { descricao: null });
    ok(r4.ok && r4.modelo.descricao === null, 'atualizar com descricao null zera');
    const r5 = obter('g1', r1.modelo.id);
    ok(r5 && r5.descricao === null, 'persistido como null');
    excluir('g1', r1.modelo.id);
    ok(true, 'limpeza');
  } finally {
    limpar();
  }
})().catch((e) => { console.error(e); process.exit(1); });
