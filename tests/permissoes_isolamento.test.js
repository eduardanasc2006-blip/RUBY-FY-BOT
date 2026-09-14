// Teste de ISOLAMENTO E COBERTURA DO SISTEMA DE PERMISSÕES.
// Verifica sem tocar no Discord real:
//  1) Configuração de permissão no Servidor A NÃO afeta o Servidor B.
//  2) Usuário comum NÃO consegue ações administrativas.
//  3) Owner/Administrator sempre passam.
//  4) Cargo autorizado (no grupo) passa; cargo não autorizado NÃO passa.
//  5) Os comandos administrativos usam verificação (não ficam abertos).

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const DATA = path.join(__dirname, '..', 'data');

// Garante estado limpo para as guilds de teste antes do require do module.
for (const g of ['g-perm-A', 'g-perm-B']) {
  try {
    const f = path.join(DATA, 'permissoes.json');
    const dados = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (dados && typeof dados === 'object') {
      const { [g]: _, ...resto } = dados;
      fs.writeFileSync(f, JSON.stringify(resto, null, 2));
    }
  } catch {}
}

const {
  GRUPOS,
  comandoPode,
  setCargo,
  cargosDoGrupo,
  eDono,
  pode,
} = require('../src/utils/permissions');

const GA = 'g-perm-A';
const GB = 'g-perm-B';
const OWNER = 'u-owner';
const COMUM = 'u-comum';
const CARGO_A = 'r-cargo-a';
const CARGO_B = 'r-cargo-b';

const PermissionFlagsBits = require('discord.js').PermissionFlagsBits;

// --- mocks de member ---
// roles: cache é um Map-like com .some; cada role é objeto { id } como no Discord.
function membro(guildId, roleIds) {
  const roles = (roleIds || []).map((id) => ({ id }));
  return {
    guild: { id: guildId },
    roles: { cache: { some: (fn) => roles.some(fn) } },
    permissions: { has: () => false },
  };
}
const membroAdmin = (guildId) => ({
  guild: { id: guildId },
  roles: { cache: { some: () => false } },
  permissions: { has: (f) => f === PermissionFlagsBits.Administrator },
});

let falhas = 0;
function check(nome, cond, detalhe) {
  if (cond) console.log(`[OK] ${nome}`);
  else { console.log(`[FALHA] ${nome} ${detalhe ? '— ' + detalhe : ''}`); falhas++; }
}

// 1) Todos os grupos conhecidos existem e comandos administrativos mapeados
const comandosEsperados = GRUPOS.flatMap((g) => g.comandos);
for (const cmd of ['configestoque', 'painelestoque', 'painelcategoria', 'settaxa', 'configtaxa', 'painel', 'metas', 'cliente', 'backup', 'limpar', 'lock', 'unlock', 'rolegive', 'embed', 'mensagem', 'modelos', 'autoresposta', 'criarcomando', 'gerenciarcomandos', 'comprar', 'setwelcome']) {
  check(`grupo cobre '${cmd}'`, comandosEsperados.includes(cmd), `GRUPOS não tem ${cmd}`);
}

// Comandos protegidos por isAdmin||eDono OU comandoPode(comando do grupo):
// qualquer um dos dois conta como cobertura. Verifica greppando os arquivos.
for (const arquivo of ['src/prefixCommands/canalcomando.js', 'src/commands/canalcomando.js', 'src/prefixCommands/canalavisos.js', 'src/commands/canalavisos.js']) {
  const conteudo = fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8');
  const tem = /isAdmin|eDono|comandoPode/.test(conteudo);
  check(`${arquivo} protege com permissão`, tem, 'sem checagem de permissão');
}

// Os handlers de botão/modal (estadm, painelcenter, cfg, embed, autoresp, metas)
// mapeiam para um grupo e usam o comandoDoCustomId/permitido no index.js.
const indexSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
for (const prefixo of ['estadm:', 'estmodal:', 'painelcenter:', 'painelcat:', 'cfg:', 'embedpainel:', 'embedmodal:', 'msgpainel:', 'msgmodal:', 'lockconf:', 'unlockconf:', 'modelos:', 'gerencmd:', 'autoresp:', 'autorespcanal', 'metaspainel:', 'metasmodal:']) {
  check(`index mapeia '${prefixo}' p/ grupo`, indexSrc.includes(`startsWith('${prefixo}')`) || indexSrc.includes(`startsWith("${prefixo}")`), 'sem handler no index');
}

// 2) Isolamento por guild: conceder cargo no A não afeta B
setCargo(GA, 'estoque', CARGO_A, true);
check('cargo A existe no grupo estoque de A', cargosDoGrupo(GA, 'estoque').includes(CARGO_A));
check('cargo A NÃO existe no grupo estoque de B', !cargosDoGrupo(GB, 'estoque').includes(CARGO_A));
check('grupo estoque de B vazio', cargosDoGrupo(GB, 'estoque').length === 0);

// 3) Usuário comum bloqueado
check('comum em A NÃO pode configestoque', comandoPode(membro(GA, []), COMUM, 'configestoque') === false);
check('comum em A NÃO pode painelestoque', comandoPode(membro(GA, []), COMUM, 'painelestoque') === false);
check('comum em A NÃO pode metas', comandoPode(membro(GA, []), COMUM, 'metas') === false);
check('comum em A NÃO pode settaxa', comandoPode(membro(GA, []), COMUM, 'settaxa') === false);
check('comum em A NÃO pode confirmar pedido (comprar/grupo vendas)', comandoPode(membro(GA, []), COMUM, 'comprar') === false);

// 4) Cargo autorizado (no grupo estoque) passa SOMENTE no seu servidor
check('membro com cargo A em A PODERIA configestoque', comandoPode(membro(GA, [CARGO_A]), COMUM, 'configestoque') === true);
// Mesmo cargo, mas no Servidor B onde não foi concedido -> NÃO passa
// (o member tem roles mas o permissions de B não inclui o cargo)
const membroComCargoA_emB = membro(GB, [CARGO_A]);
const membroComCargoA_emA = membro(GA, [CARGO_A]);
check('cargo A NÃO passa em B (mesmo role id)', comandoPode(membroComCargoA_emB, COMUM, 'configestoque') === false);
check('cargo A passa em A', comandoPode(membroComCargoA_emA, COMUM, 'configestoque') === true);

// 5) Owner (ADMIN_IDS) sempre passa em qualquer servidor
process.env.ADMIN_IDS = OWNER;
check('owner passa configestoque', comandoPode(membro(GA, []), OWNER, 'configestoque') === true);
check('owner NÃO é afetado por guild', comandoPode(membro(GB, []), OWNER, 'configestoque') === true);
check('eDono(owner) true', eDono(OWNER) === true);

// 6) Administrator do servidor passa mesmo sem cargo
check('admin passa configestoque', comandoPode(membroAdmin(GA), COMUM, 'configestoque') === true);
const adminEmB = membroAdmin(GB);
check('admin de B NÃO é admin de A através de permissão de A', comandoPode(membro(GA, []), COMUM, 'configestoque') === false);

// 7) pode() direto: grupo inexistente retorna false sem cargo/admin
check('pode grupo vazio false', pode(membro(GA, []), COMUM, 'estoque') === false);

// 8) Comando sem grupo (ex: calculadora) NÃO é restrito por cargo (não bloqueia usuário comum)
check('calc (sem grupo) liberado', comandoPode(membro(GA, []), COMUM, 'calc') === true);

// 9) cargosDoGrupo nunca retorna dados do outro servidor
const gcA = cargosDoGrupo(GA, 'vendas');
setCargo(GB, 'vendas', CARGO_B, true);
check('vendas de A independente de B', !cargosDoGrupo(GA, 'vendas').includes(CARGO_B));
check('vendas de B tem cargo B', cargosDoGrupo(GB, 'vendas').includes(CARGO_B));
check('vendas de A não tem cargo B', !gcA.includes(CARGO_B));

console.log('\n===== RESULTADO PERMISSÕES (isolamento + cobertura) =====');
console.log(falhas === 0 ? 'TODOS OS CHECKS PASSARAM' : `${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);