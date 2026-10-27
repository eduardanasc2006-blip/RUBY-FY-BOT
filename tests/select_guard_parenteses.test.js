const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Regressao: `interaction.isXSelectMenu` (sem parenteses) e uma REFERENCIA de
// metodo, sempre truthy — o guard nunca barra por tipo e o handler errado pode
// capturar a interacao. So o `customId` salvava por acidente. Este teste varre
// os fontes e exige a chamada com `()`.
//
// Cobre tambem `isButton`/`isModalSubmit`/`isChatInputCommand` pelo mesmo motivo.

const METODOS = [
  'isButton',
  'isAnySelectMenu',
  'isStringSelectMenu',
  'isUserSelectMenu',
  'isRoleSelectMenu',
  'isChannelSelectMenu',
  'isMentionableSelectMenu',
  'isModalSubmit',
  'isChatInputCommand',
  'isAutocomplete',
];

function arquivosJs(dir) {
  const saida = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) saida.push(...arquivosJs(p));
    else if (e.name.endsWith('.js')) saida.push(p);
  }
  return saida;
}

const raiz = path.join(__dirname, '..');
const arquivos = [...arquivosJs(path.join(raiz, 'src')), path.join(raiz, 'deploy-commands.js')];

let verificados = 0;
const problemas = [];

for (const arq of arquivos) {
  const linhas = fs.readFileSync(arq, 'utf8').split('\n');
  linhas.forEach((linha, i) => {
    // ignora comentarios
    const semComentario = linha.replace(/\/\/.*$/, '');
    for (const m of METODOS) {
      // ocorrencia de `.metodo` que NAO seja seguida de `(` nem fizer parte de
      // um identificador maior (ex.: `.isButtonX`)
      const re = new RegExp(`\\.${m}(?![\\w(])`, 'g');
      if (re.test(semComentario)) {
        problemas.push(`${path.relative(raiz, arq)}:${i + 1}: .${m} sem () -> ${linha.trim()}`);
      }
      if (new RegExp(`\\.${m}\\(`).test(semComentario)) verificados++;
    }
  });
}

assert.strictEqual(
  problemas.length,
  0,
  `Chamadas de metodo sem parenteses (sempre truthy, guard nao filtra por tipo):\n${problemas.join('\n')}`,
);

// sanidade: o scanner tem que ter encontrado chamadas de verdade
assert.ok(verificados > 20, `esperado encontrar chamadas com (), achou ${verificados}`);

console.log(`✅ modal_select_guard: ${verificados} chamadas verificadas, 0 sem ()`);
