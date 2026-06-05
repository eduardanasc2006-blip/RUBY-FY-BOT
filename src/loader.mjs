import { initDB, isDBConnected } from './db/sqlite.mjs';
import Config from './db/models/Config.mjs';

// ── Imports — register + comandos ─────────────────────────────
import { register as regAjuda, comandos as cAjuda } from './systems/ajuda.mjs';
import { register as regDiversao, comandos as cDiversao } from './systems/diversao.mjs';
import { register as regConversao, comandos as cConversao } from './systems/conversao.mjs';
import { register as regRoblox, comandos as cRoblox } from './systems/roblox.mjs';
import { register as regRelacionamentos, comandos as cRelacionamentos } from './systems/relacionamentos.mjs';
import { register as regAfinidade, comandos as cAfinidade } from './systems/afinidade.mjs';
import { register as regInteracoes, comandos as cInteracoes } from './systems/interacoes.mjs';
import { register as regReputacao, comandos as cReputacao } from './systems/reputacao.mjs';
import { register as regXpNiveis, comandos as cXpNiveis } from './systems/xpniveis.mjs';
import { register as regQuiz, comandos as cQuiz } from './systems/quiz.mjs';
import { register as regForca, comandos as cForca } from './systems/forca.mjs';
import { register as regConquistas, comandos as cConquistas } from './systems/conquistas.mjs';
import { register as regMissoes, comandos as cMissoes } from './systems/missoes.mjs';
import { register as regTitulos, comandos as cTitulos } from './systems/titulos.mjs';
import { register as regLoja, comandos as cLoja } from './systems/loja.mjs';
import { register as regPerfilVisual, comandos as cPerfilVisual } from './systems/perfilvisual.mjs';
import { register as regShip, comandos as cShip } from './systems/ship.mjs';
import { register as regProdutos, comandos as cProdutos } from './systems/produtos.mjs';
import { register as regSuporte, comandos as cSuporte } from './systems/suporte.mjs';
import { register as regAtendimento, comandos as cAtendimento } from './systems/atendimento.mjs';
import { register as regAvaliacoes, comandos as cAvaliacoes } from './systems/avaliacoes.mjs';
import { register as regAdministracao, comandos as cAdministracao } from './systems/administracao.mjs';
import { register as regLogs, comandos as cLogs } from './systems/logs.mjs';
import { register as regAntiAbuso, comandos as cAntiAbuso } from './systems/antiabuso.mjs';
import { register as regEstatisticas, comandos as cEstatisticas } from './systems/estatisticas.mjs';
import { register as regGenero, comandos as cGenero } from './systems/genero.mjs';
import { register as regMeuPerfil, comandos as cMeuPerfil } from './systems/meuperfil.mjs';

const configs = new Map();

const visual = {
  'Ajuda': { emoji: '❓', cor: 0x5865f2 },
  'Diversão': { emoji: '🎮', cor: 0xff66cc },
  'Robux & Conversão': { emoji: '💸', cor: 0x00ff99 },
  'Roblox': { emoji: '🟥', cor: 0xe74c3c },
  'Relacionamentos': { emoji: '💍', cor: 0xff5fa2 },
  'Afinidade': { emoji: '💜', cor: 0x9b59b6 },
  'Interações': { emoji: '🤝', cor: 0x3498db },
  'Reputação': { emoji: '🏆', cor: 0xf1c40f },
  'XP & Níveis': { emoji: '⭐', cor: 0xf39c12 },
  'Quiz': { emoji: '❓', cor: 0x1abc9c },
  'Forca': { emoji: '🎯', cor: 0xe67e22 },
  'Conquistas': { emoji: '🏅', cor: 0xf1c40f },
  'Missões': { emoji: '📜', cor: 0x2ecc71 },
  'Títulos': { emoji: '👑', cor: 0xf39c12 },
  'Loja': { emoji: '🛍️', cor: 0x00b894 },
  'Perfil Visual': { emoji: '🖼️', cor: 0x6c5ce7 },
  'Ship': { emoji: '❤️', cor: 0xff4d6d },
  'Produtos': { emoji: '📦', cor: 0x00cec9 },
  'Suporte': { emoji: '🎫', cor: 0x3498db },
  'Atendimento': { emoji: '📞', cor: 0x2ecc71 },
  'Avaliações': { emoji: '⭐', cor: 0xf1c40f },
  'Administração': { emoji: '🛠️', cor: 0xe74c3c },
  'Logs': { emoji: '📋', cor: 0x95a5a6 },
  'Anti-Abuso': { emoji: '🛡️', cor: 0xc0392b },
  'Estatísticas': { emoji: '📊', cor: 0x2980b9 },
  'Gênero': { emoji: '⚧️', cor: 0xe056fd },
  'Meu Perfil': { emoji: '👤', cor: 0x5865f2 },
};

async function carregarConfigs() {
  if (!isDBConnected()) return;

  try {
    const todas = await Config.find({}).lean();

    for (const cfg of todas) {
      configs.set(cfg.guildId, cfg);
    }

    console.log(`[Loader] ${todas.length} configuracoes carregadas.`);
  } catch (e) {
    console.warn(
      '[Loader] Nao foi possivel carregar configuracoes:',
      e.message
    );
  }
}

export async function loadSystems(client) {
  if (client.__systemsLoaded) return;
  client.__systemsLoaded = true;

  const dbOk = initDB();

  console.log(
    dbOk
      ? '[DB] ✔ SQLite pronto.'
      : '[DB] ✖ Banco de dados nao iniciado.'
  );

  await carregarConfigs();

  client.on('guildCreate', async (guild) => {
    if (!isDBConnected()) return;
    if (configs.has(guild.id)) return;

    try {
      const cfg = await Config.findOneAndUpdate(
        { guildId: guild.id },
        { $setOnInsert: { guildId: guild.id } },
        {
          upsert: true,
          new: true,
        }
      );

      if (cfg) configs.set(guild.id, cfg);
    } catch {}
  });

  const sistemas = [
    ['Ajuda', regAjuda, cAjuda],
    ['Diversão', regDiversao, cDiversao],
    ['Robux & Conversão', regConversao, cConversao],
    ['Roblox', regRoblox, cRoblox],
    ['Relacionamentos', regRelacionamentos, cRelacionamentos],
    ['Afinidade', regAfinidade, cAfinidade],
    ['Interações', regInteracoes, cInteracoes],
    ['Reputação', regReputacao, cReputacao],
    ['XP & Níveis', regXpNiveis, cXpNiveis],
    ['Quiz', regQuiz, cQuiz],
    ['Forca', regForca, cForca],
    ['Conquistas', regConquistas, cConquistas],
    ['Missões', regMissoes, cMissoes],
    ['Títulos', regTitulos, cTitulos],
    ['Loja', regLoja, cLoja],
    ['Perfil Visual', regPerfilVisual, cPerfilVisual],
    ['Ship', regShip, cShip],
    ['Produtos', regProdutos, cProdutos],
    ['Suporte', regSuporte, cSuporte],
    ['Atendimento', regAtendimento, cAtendimento],
    ['Avaliações', regAvaliacoes, cAvaliacoes],
    ['Administração', regAdministracao, cAdministracao],
    ['Logs', regLogs, cLogs],
    ['Anti-Abuso', regAntiAbuso, cAntiAbuso],
    ['Estatísticas', regEstatisticas, cEstatisticas],
    ['Gênero', regGenero, cGenero],
    ['Meu Perfil', regMeuPerfil, cMeuPerfil],
  ];

  if (!client.systems) {
    client.systems = new Map();
  }

  let ok = 0;
  let fail = 0;
  let totalCmds = 0;

  for (const [nome, fn, cmds] of sistemas) {
    try {
      fn(client, configs);

      const cmdList = Array.isArray(cmds) ? cmds : [];

      const metaVisual = visual[nome] || {
        emoji: '📦',
        cor: 0x5865f2,
      };

      client.systems.set(nome, {
        id: nome,
        label: nome,
        emoji: metaVisual.emoji,
        cor: metaVisual.cor,
        comandos: cmdList,
      });

      totalCmds += cmdList.length;
      ok++;

      console.log(
        `[Loader] ✔ ${nome} — ${cmdList.length} comando(s)`
      );
    } catch (e) {
      fail++;

      console.error(
        `[Loader] ✖ ${nome}:`,
        e.stack || e.message
      );
    }
  }

  const dbStatus = isDBConnected()
    ? 'SQLite ativo'
    : 'sem banco de dados';

  console.log(
    `[Loader] FiskBot pronto — ${ok} sistemas ativos` +
    `${fail ? `, ${fail} com erro` : ''} — ` +
    `${totalCmds} comandos registrados — ${dbStatus}`
  );

  return configs;
  }
