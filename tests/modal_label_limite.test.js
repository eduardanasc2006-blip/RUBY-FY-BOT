const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Limites da API do Discord nos componentes de modal, aplicados pelo shapeshift
// do discord.js ANTES de chamar a API. Violar lanca "Invalid string length", o
// erro cai no catch do handler e o comando fica mudo para o usuario.
//   - TextInputBuilder.setLabel: max 45 chars
//   - ModalBuilder.setTitle:     max 45 chars
// (EmbedBuilder.setTitle tem limite 256 e NAO entra nesta validacao.)
// Regressao real: logs da Discloud de 14/10 e 25/10 mostraram
//   `ExpectedConstraintError > s.string().lengthLessThanOrEqual() ... <= 45`.
const LIMITE = 45;
const JANELA = 400; // distancia maxima entre o `new XBuilder()` e o setLabel/setTitle

function textoDe(expr) {
  const partes = expr.match(/'[^']*'|"[^"]*"|`[^`]*`/g) || [];
  return partes.map((p) => p.slice(1, -1)).join('');
}

function linhaDe(src, indice) {
  return src.slice(0, indice).split('\n').length;
}

// Varre cada `new ModalBuilder()`/`new TextInputBuilder()` e valida o
// setTitle/setLabel que pertence a ele (dentro da janela seguinte).
function varrer(src, arquivo, problemas) {
  const construtores = [
    { re: /new\s+ModalBuilder\s*\(/g, metodo: 'setTitle' },
    { re: /new\s+TextInputBuilder\s*\(/g, metodo: 'setLabel' },
  ];

  for (const { re, metodo } of construtores) {
    let m;
    while ((m = re.exec(src))) {
      const trecho = src.slice(m.index, m.index + JANELA);
      const chamada = new RegExp(
        `\\.${metodo}\\(\\s*((?:'[^']*'|"[^"]*"|\`[^\`]*\`)(?:\\s*\\+\\s*(?:'[^']*'|"[^"]*"|\`[^\`]*\`))*)\\s*\\)`
      ).exec(trecho);
      if (!chamada) continue;
      const texto = textoDe(chamada[1]);
      if (texto.includes('${')) continue; // tamanho dinamico: validado nos testes de fluxo
      if (texto.length > LIMITE) {
        problemas.push({
          arquivo,
          linha: linhaDe(src, m.index + chamada.index),
          metodo,
          len: texto.length,
          texto,
        });
      }
    }
  }
}

const IGNORAR = new Set(['node_modules', 'data', '.git', 'tests', '.agent_tmp']);
function arquivosJs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) arquivosJs(p, acc);
    else if (entrada.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

const raiz = path.join(__dirname, '..');
const arquivos = [...arquivosJs(path.join(raiz, 'src')), path.join(raiz, 'deploy-commands.js')].filter((f) =>
  fs.existsSync(f)
);

const problemas = [];
for (const arquivo of arquivos) {
  varrer(fs.readFileSync(arquivo, 'utf8'), path.relative(raiz, arquivo), problemas);
}

assert.deepStrictEqual(
  problemas,
  [],
  `setLabel/setTitle de modal acima de ${LIMITE} chars (Discord rejeita e o comando fica mudo):\n` +
    problemas.map((p) => `  ${p.arquivo}:${p.linha} ${p.metodo} ${p.len} chars -> "${p.texto}"`).join('\n')
);

// Constroi o modal real do gerenciarcomandos e confere os limites de ponta a ponta.
const { TextInputBuilder, TextInputStyle, ModalBuilder } = require('discord.js');
const { modalEditar } = require('../src/utils/customEditPanel');

const guild = { id: 'g-label-limite', members: { cache: new Map() } };
const modal = modalEditar(guild, { nome: 'teste', resposta: 'x', embed: {}, copiaveis: [], guildId: guild.id }, 'dono').toJSON();

assert.ok(modal.title.length <= LIMITE, `titulo do modal tem ${modal.title.length} chars (max ${LIMITE})`);
for (const row of modal.components) {
  for (const c of row.components) {
    if (c.label) assert.ok(c.label.length <= LIMITE, `label "${c.label}" tem ${c.label.length} chars (max ${LIMITE})`);
  }
}

// Garante que a validacao do discord.js continua ativa (se um dia mudar, o teste avisa).
assert.throws(() => new ModalBuilder().setCustomId('x').setTitle('a'.repeat(LIMITE + 1)), /Invalid string length/);
assert.throws(
  () => new TextInputBuilder().setCustomId('x').setLabel('a'.repeat(LIMITE + 1)).setStyle(TextInputStyle.Short),
  /Invalid string length/
);

console.log(`✅ Labels/titulos de modal <= ${LIMITE} chars em ${arquivos.length} arquivos`);
console.log('Testes de limite de label OK');
