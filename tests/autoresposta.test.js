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