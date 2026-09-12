// Testa store de auto-respostas por servidor:
// - respostas e canais sao isolados por guildId
// - handler encontra por substring, sem diferenciar maiusculas
const { acharResposta } = require('../src/utils/autoRespostaHandler');

let falhas = 0;
function checa(nome, cond) {
  if (!cond) {
    console.error('❌', nome);
    falhas++;
  } else {
    console.log('✅', nome);
  }
}
if (!process.env.AUTOTEST_TMP) {
  // Sem isolar FS real: so testa o handler (puro) e nao grava dados.

  const lista = [
    { palavra: 'quanto é 100 robux', resposta: 'Custa 100 R$' },
    { palavra: 'enviar', resposta: 'Enviado!' },
  ];
  checa('handler acha substring no meio', acharResposta(lista, ' ei, quanto é 100 roBUX hoje?')?.resposta === 'Custa 100 R$');
  checa('handler ignora CASE', acharResposta(lista, 'ENVIAR agora')?.resposta === 'Enviado!');
  checa('handler nao acha palavra ausente', acharResposta(lista, 'ola mundo') === null);
  checa('handler lista vazia', acharResposta([], 'qualquer') === null);
} else if (process.env.AUTOTEST_TMP === 'STORE_BUG') {
  const fs = require('node:fs');
  const path = require('node:path');
  const store = require('../src/utils/autoRespostaStore');
  const g = 'g-store-bug';
  const arq = path.join(__dirname, '..', 'data', 'autorespostas', g + '.json');
  try { fs.rmSync(arq); } catch (e) {}
  store.adicionar(g, 'palavra1', 'resposta1');
  // adicionarPalavra deve atualizar a palavra principal (item.palavra)
  const r1 = store.adicionarPalavra(g, 'palavra1', 'palavra2');
  checa('adicionarPalavra ok', r1.ok);
  let item = store.listar(g)[0];
  checa('palavra principal sincronizada apos adicionar', item.palavra === item.palavras[0] && item.palavras.includes('palavra2'));
  // removerPalavra deve re-sincronizar a palavra principal
  const r2 = store.removerPalavra(g, 'palavra2', 'palavra1');
  checa('removerPalavra ok', r2.ok);
  item = store.listar(g)[0];
  checa('palavra principal atualizada apos remover', item.palavra === item.palavras[0]);
  try { fs.rmSync(arq); } catch (e) {}
} else {
  const fs = require('node:fs');
  const path = require('node:path');
  const store = require('../src/utils/autoRespostaStore');
  // Como o store usa DIR fixo, os testes de persistencia ficam em outro script.

  checa('canais vazio por padrao', store.canais(process.env.AUTOTEST_TMP).length === 0);
}

if (falhas) {
  console.error(`\n${falhas} falha(s)`);
  process.exit(1);
} else {
  console.log('\ntestes autoResposta OK');
}