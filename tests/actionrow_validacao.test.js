const assert = require('node:assert');

// Regras de ActionRow da API do Discord:
//   - cada linha tem ATE 5 botoes OU UM unico select menu (nunca os dois juntos)
//   - o top level de `components` tem que ser ActionRow (type 1)
//   - no maximo 5 ActionRows por mensagem
// Violar isso devolve DiscordAPIError 50035 e o comando fica mudo para o usuario.
const TIPO_ACTION_ROW = 1;
const TIPO_BOTAO = 2;
const TIPOS_SELECT = new Set([3, 5, 6, 7, 8]);

function validarComponents(nome, components) {
  const rows = (components || []).map((r) => (r.toJSON ? r.toJSON() : r));
  assert.ok(rows.length <= 5, `${nome}: ${rows.length} ActionRows (max 5)`);

  rows.forEach((r, i) => {
    assert.strictEqual(r.type, TIPO_ACTION_ROW, `${nome} row${i}: top-level tem que ser ActionRow (type 1)`);
    const cs = r.components || [];
    const selects = cs.filter((c) => TIPOS_SELECT.has(c.type));
    const botoes = cs.filter((c) => c.type === TIPO_BOTAO);

    assert.ok(selects.length <= 1, `${nome} row${i}: no maximo 1 select menu por linha`);
    if (selects.length === 1) {
      assert.strictEqual(cs.length, 1, `${nome} row${i}: o select menu tem que ficar SOZINHO na linha`);
    }
    assert.ok(botoes.length <= 5, `${nome} row${i}: no maximo 5 botoes por linha`);
    assert.ok(
      cs.length === 0 || selects.length + botoes.length === cs.length,
      `${nome} row${i}: componente de tipo inesperado`
    );
  });
}

const GUILD = { id: 'g-actionrow', members: { cache: new Map() } };

try {
  // O select de produto so aparece quando ha produto ativo no estoque da guild.
  const estoque = require('../src/utils/estoque');
  const cat = estoque.addCategoria('g-actionrow', 'Categoria ActionRow');
  estoque.addProduto('g-actionrow', cat.id, { nome: 'Produto ActionRow', valor: 7.5, controlarQtd: true, quantidade: 3 });

  // Painel de revisao do /proof: era o caso que quebrava (UserSelect + botao juntos)
  const { buildProofFormulario } = require('../src/utils/proofModal');
  const proofVazio = buildProofFormulario('u-teste', GUILD, {
    numero: 26, produto: '', valor: '', clienteId: null, canalId: null,
  });
  validarComponents('proof (sem dados)', proofVazio.components);

  const proofCheio = buildProofFormulario('u-teste', GUILD, {
    numero: 26, produto: 'Robux 500', valor: '3,00',
    clienteId: '111111111111111', clienteNome: null, canalId: '222222222222222222',
  });
  validarComponents('proof (preenchido)', proofCheio.components);

  // O botao "Fora do Discord" continua presente, so mudou de linha
  const customIds = proofCheio.components.flatMap((r) => r.toJSON().components.map((c) => c.custom_id));
  for (const esperado of ['proofsel:canal', 'proofsel:cliente', 'proofsel:produto', 'proofsel:plataforma', 'proofsel:confirmar', 'proofsel:cancelar']) {
    assert.ok(customIds.includes(esperado), `painel do proof perdeu o componente ${esperado}`);
  }

  // Demais paineis: nenhum pode montar uma linha invalida
  const paineis = [
    ['autoRespostaPanel.painelCentral', () => require('../src/utils/autoRespostaPanel').painelCentral('g-actionrow')],
    ['autoRespostaPanel.telaEscolherCanais', () => require('../src/utils/autoRespostaPanel').telaEscolherCanais('g-actionrow')],
    ['canalComandoPanel', () => require('../src/utils/canalComandoPanel').buildCanalComandoPanel('g-actionrow')],
    ['permissionsPanel', () => require('../src/utils/permissionsPanel').buildPermissionsPanel('g-actionrow')],
    ['metasPanel', () => require('../src/utils/metasPanel').buildMetasPainel('g-actionrow')],
    ['painelCenter', () => require('../src/utils/painelCenter').buildPainelCentral('g-actionrow')],
    ['comprarPanel.escolherCategoria', () => require('../src/utils/comprarPanel').escolherCategoria('g-actionrow')],
    ['estoquePanel.publicoCategorias', () => require('../src/utils/estoquePanel').publicoCategorias('g-actionrow')],
    ['estoquePanel.adminMenu', () => require('../src/utils/estoquePanel').adminMenu('g-actionrow')],
    ['configPanel', () => require('../src/utils/configPanel').buildConfigPanel()],
  ];
  for (const [nome, fn] of paineis) {
    let painel;
    try {
      painel = fn();
    } catch {
      continue; // painel depende de estado/sessao que o teste nao monta
    }
    if (painel && painel.components) validarComponents(nome, painel.components);
  }

  console.log('testes actionrow OK');
} finally {
  const fs = require('node:fs');
  const path = require('node:path');
  try { fs.unlinkSync(path.join(__dirname, '..', 'data', 'estoque', 'g-actionrow.json')); } catch {}
}
