import { initDB, isDBConnected } from './db/sqlite.mjs';
import Config from './db/models/Config.mjs';

// ── Imports — register + comandos de cada sistema ─────────────
import { register as regAjuda,          comandos as cAjuda }          from './systems/ajuda.mjs';
import { register as regDiversao,       comandos as cDiversao }       from './systems/diversao.mjs';
import { register as regConversao,      comandos as cConversao }      from './systems/conversao.mjs';
import { register as regRoblox,         comandos as cRoblox }         from './systems/roblox.mjs';
import { register as regRelacionamentos,comandos as cRelacionamentos } from './systems/relacionamentos.mjs';
import { register as regAfinidade,      comandos as cAfinidade }      from './systems/afinidade.mjs';
import { register as regInteracoes,     comandos as cInteracoes }     from './systems/interacoes.mjs';
import { register as regReputacao,      comandos as cReputacao }      from './systems/reputacao.mjs';
import { register as regXpNiveis,       comandos as cXpNiveis }       from './systems/xpniveis.mjs';
import { register as regQuiz,           comandos as cQuiz }           from './systems/quiz.mjs';
import { register as regForca,          comandos as cForca }          from './systems/forca.mjs';
import { register as regConquistas,     comandos as cConquistas }     from './systems/conquistas.mjs';
import { register as regMissoes,        comandos as cMissoes }        from './systems/missoes.mjs';
import { register as regTitulos,        comandos as cTitulos }        from './systems/titulos.mjs';
import { register as regLoja,           comandos as cLoja }           from './systems/loja.mjs';
import { register as regPerfilVisual,   comandos as cPerfilVisual }   from './systems/perfilvisual.mjs';
import { register as regShip,           comandos as cShip }           from './systems/ship.mjs';
import { register as regProdutos,       comandos as cProdutos }       from './systems/produtos.mjs';
import { register as regSuporte,        comandos as cSuporte }        from './systems/suporte.mjs';
import { register as regAtendimento,      comandos as cAtendimento }      from './systems/atendimento.mjs';
import { register as regAvaliacoes,     comandos as cAvaliacoes }     from './systems/avaliacoes.mjs';
import { register as regAdministracao,  comandos as cAdministracao }  from './systems/administracao.mjs';
import { register as regLogs,           comandos as cLogs }           from './systems/logs.mjs';
import { register as regAntiAbuso,      comandos as cAntiAbuso }      from './systems/antiabuso.mjs';
import { register as regEstatisticas,   comandos as cEstatisticas }   from './systems/estatisticas.mjs';
import { register as regGenero,         comandos as cGenero }         from './systems/genero.mjs';
import { register as regMeuPerfil,      comandos as cMeuPerfil }      from './systems/meuperfil.mjs';

const configs = new Map();

async function carregarConfigs() {
  if (!isDBConnected()) return;
  try {
    const todas = await Config.find({}).lean();
    for (const cfg of todas) configs.set(cfg.guildId, cfg);
    console.log(`[Loader] ${todas.length} configuracoes carregadas.`);
  } catch (e) {
    console.warn('[Loader] Nao foi possivel carregar configuracoes:', e.message);
  }
}

export async function loadSystems(client) {
  if (client.__systemsLoaded) return;
  client.__systemsLoaded = true;
  // ── Banco de dados ──────────────────────────────────────────
  const dbOk = initDB();
  console.log(dbOk ? '[DB] ✔ SQLite pronto.' : '[DB] ✖ Aviso: banco de dados nao iniciado.');

  await carregarConfigs();

  // ── Config automática ao entrar em novo servidor ────────────
  client.on('guildCreate', async (guild) => {
    if (!isDBConnected() || configs.has(guild.id)) return;
    try {
      const cfg = await Config.findOneAndUpdate(
        { guildId: guild.id },
        { $setOnInsert: { guildId: guild.id } },
        { upsert: true, new: true }
      );
      if (cfg) configs.set(guild.id, cfg);
    } catch {}
  });

  // ── Mapa de sistemas: [nome, registerFn, comandosArray] ────
  const sistemas = [
    ['Ajuda',           regAjuda,          cAjuda],
    ['Diversão',        regDiversao,       cDiversao],
    ['Robux & Conversão',regConversao,     cConversao],
    ['Roblox',          regRoblox,         cRoblox],
    ['Relacionamentos', regRelacionamentos,cRelacionamentos],
    ['Afinidade',       regAfinidade,      cAfinidade],
    ['Interações',      regInteracoes,     cInteracoes],
    ['Reputação',       regReputacao,      cReputacao],
    ['XP & Níveis',     regXpNiveis,       cXpNiveis],
    ['Quiz',            regQuiz,           cQuiz],
    ['Forca',           regForca,          cForca],
    ['Conquistas',      regConquistas,     cConquistas],
    ['Missões',         regMissoes,        cMissoes],
    ['Títulos',         regTitulos,        cTitulos],
    ['Loja',            regLoja,           cLoja],
    ['Perfil Visual',   regPerfilVisual,   cPerfilVisual],
    ['Ship',            regShip,           cShip],
    ['Produtos',        regProdutos,       cProdutos],
    ['Suporte',         regSuporte,        cSuporte],
    ['Atendimento',       regAtendimento,      cAtendimento],
    ['Avaliações',      regAvaliacoes,     cAvaliacoes],
    ['Administração',   regAdministracao,  cAdministracao],
    ['Logs',            regLogs,           cLogs],
    ['Anti-Abuso',      regAntiAbuso,      cAntiAbuso],
    ['Estatísticas',    regEstatisticas,   cEstatisticas],
    ['Gênero',          regGenero,         cGenero],
    ['Meu Perfil',      regMeuPerfil,      cMeuPerfil],
  ];

  // ── Inicializa client.systems ───────────────────────────────
  if (!client.systems) client.systems = new Map();

  let ok = 0, fail = 0, totalCmds = 0;

  for (const [nome, fn, cmds] of sistemas) {
    try {
      fn(client, configs);
      const cmdList = Array.isArray(cmds) ? cmds : [];
      client.systems.set(nome, { id: nome, label: nome, emoji: '📦', cor: 0x5865f2, comandos: cmdList });
      totalCmds += cmdList.length;
      ok++;
      console.log(`[Loader] ✔ ${nome} — ${cmdList.length} comando(s)`);
    } catch (e) {
      fail++;
      console.error(`[Loader] ✖ ${nome}: ${e.message}`);
    }
  }

  const dbStatus = isDBConnected() ? 'SQLite ativo' : 'sem banco de dados';
  console.log(
    `[Loader] FiskBot pronto — ${ok} sistemas ativos${fail ? `, ${fail} com erro` : ''} — ` +
    `${totalCmds} comandos registrados — ${dbStatus}`
  );

  return configs;
}
