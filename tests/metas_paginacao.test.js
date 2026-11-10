// Regressão do painel /metas: ele quebrava com 3+ metas configuradas.
//
// Cada meta ocupava 2 botões (editar + excluir) e o código agrupava 4 METAS por
// linha — 8 botões numa ActionRow. O Discord rejeita (50035 BASE_TYPE_BAD_LENGTH)
// e o /metas respondia "Ocorreu um erro ao executar este comando". O teste antigo
// (actionrow_validacao.test.js) só validava o painel VAZIO, então passava sempre.
//
// Aqui o painel é montado com várias metas e o JSON dos components é conferido
// contra os limites da API: <=5 botões por linha e <=5 ActionRows por mensagem.

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const metasStore = require('../src/utils/metasStore');
const { buildMetasPainel } = require('../src/utils/metasPanel');

const DATA = path.join(__dirname, '..', 'data');
const GUILD = 'g-metas-teste';

const TIPO_ACTION_ROW = 1;
const TIPO_BOTAO = 2;

const RESULTADOS = [];
function check(nome, fn) {
  try {
    fn();
    RESULTADOS.push({ nome, ok: true });
    console.log('[OK] ' + nome);
  } catch (e) {
    RESULTADOS.push({ nome, ok: false, erro: e?.message || String(e) });
    console.log('[FALHA] ' + nome + ' -> ' + (e?.message || e));
  }
}

function validarComponents(nome, components) {
  const rows = (components || []).map((r) => (r.toJSON ? r.toJSON() : r));
  assert.ok(rows.length <= 5, `${nome}: ${rows.length} ActionRows (max 5)`);
  rows.forEach((r, i) => {
    assert.strictEqual(r.type, TIPO_ACTION_ROW, `${nome} row${i}: top-level tem que ser ActionRow`);
    const botoes = (r.components || []).filter((c) => c.type === TIPO_BOTAO);
    assert.ok(botoes.length <= 5, `${nome} row${i}: ${botoes.length} botoes (max 5)`);
  });
}

function preencher(qtd) {
  const lista = metasStore.listaMetas(GUILD);
  lista.length = 0;
  for (let i = 1; i <= qtd; i++) {
    metasStore.addMeta(GUILD, {
      cargoId: 'cargo-' + i,
      cargoNome: 'Cargo ' + i,
      tipo: i % 2 ? 'vendas' : 'valor',
      meta: i * 10,
    });
  }
}

try {
  const guild = { id: GUILD, roles: { cache: new Map() } };

  // O caso que quebrava em produção (3 metas montava uma linha com 6 botões).
  for (const qtd of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13]) {
    preencher(qtd);
    const totalPaginas = Math.max(1, Math.ceil(qtd / 6));
    for (let pag = 0; pag < totalPaginas; pag++) {
      const painel = buildMetasPainel(guild, 'user-1', pag);
      validarComponents(`metas (${qtd} metas, pg ${pag + 1})`, painel.components);
    }
  }

  // O título mostra a paginação quando há mais de uma página.
  preencher(7);
  assert.ok(buildMetasPainel(guild, 'u').embeds[0].toJSON().title.includes('(1/2)'), 'titulo paginado em 2 paginas');
  preencher(6);
  assert.ok(!buildMetasPainel(guild, 'u').embeds[0].toJSON().title.includes('/'), 'titulo sem paginacao com 1 pagina');

  // A página de navegação existe só quando há mais de uma página, e os botões
  // de navegação apontam para páginas válidas (custom id metaspainel:pag:<n>:<user>).
  preencher(7);
  const p = buildMetasPainel(guild, 'user-1', 0).components.map((r) => r.toJSON());
  const ids = p.flatMap((r) => r.components.map((c) => c.custom_id));
  assert.ok(ids.includes('metaspainel:pag:1:user-1'), 'botao proxima na pagina 0');
  assert.ok(ids.includes('metaspainel:add:user-1'), 'botao adicionar presente');

  // Cada meta visível tem os botões de editar e excluir.
  preencher(2);
  const ids2 = buildMetasPainel(guild, 'user-1', 0).components
    .flatMap((r) => r.toJSON().components.map((c) => c.custom_id));
  for (const id of metasStore.listaMetas(GUILD).map((m) => m.id)) {
    assert.ok(ids2.includes(`metaspainel:edit:${id}:user-1`), `edit da meta ${id}`);
    assert.ok(ids2.includes(`metaspainel:rm:${id}:user-1`), `rm da meta ${id}`);
  }

  console.log('testes metas paginacao OK');
} finally {
  try { fs.rmSync(path.join(DATA, 'metas.json'), { force: true }); } catch {}
}
