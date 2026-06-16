import { initDB, isDBConnected } from './db/sqlite.mjs';
import Config from './db/models/Config.mjs';
import { patchClientRouter } from './router/commandRouter.mjs';

// ── Imports — register + comandos ─────────────────────────────
import { register as regAjuda,           comandos as cAjuda           } from './systems/ajuda.mjs';
import { register as regDiversao,        comandos as cDiversao        } from './systems/diversao.mjs';
import { register as regConversao,       comandos as cConversao       } from './systems/conversao.mjs';
import { register as regRoblox,          comandos as cRoblox          } from './systems/roblox.mjs';
import { register as regRelacionamentos, comandos as cRelacionamentos } from './systems/relacionamentos.mjs';
import { register as regAfinidade,       comandos as cAfinidade       } from './systems/afinidade.mjs';
import { register as regInteracoes,      comandos as cInteracoes      } from './systems/interacoes.mjs';
import { register as regReputacao,       comandos as cReputacao       } from './systems/reputacao.mjs';
import { register as regQuiz,            comandos as cQuiz            } from './systems/quiz.mjs';
import { register as regForca,           comandos as cForca           } from './systems/forca.mjs';
import { register as regConquistas,      comandos as cConquistas      } from './systems/conquistas.mjs';
import { register as regMissoes,         comandos as cMissoes         } from './systems/missoes.mjs';
import { register as regTitulos,         comandos as cTitulos         } from './systems/titulos.mjs';
import { register as regLoja,            comandos as cLoja            } from './systems/loja.mjs';
import { register as regPerfilVisual,    comandos as cPerfilVisual    } from './systems/perfilvisual.mjs';
import { register as regShip,            comandos as cShip            } from './systems/ship.mjs';
import { register as regAdministracao,   comandos as cAdministracao   } from './systems/administracao.mjs';
import { register as regLogs,            comandos as cLogs            } from './systems/logs.mjs';
import { register as regAntiAbuso,       comandos as cAntiAbuso       } from './systems/antiabuso.mjs';
import { register as regEstatisticas,    comandos as cEstatisticas    } from './systems/estatisticas.mjs';
import { register as regGenero,          comandos as cGenero          } from './systems/genero.mjs';
import { register as regMeuPerfil,       comandos as cMeuPerfil       } from './systems/meuperfil.mjs';
import { register as regInventario, comandos as cInventario } from './systems/inventario.mjs';

const configs = new Map();

/* =========================
   VISUAL
========================= */

const visual = {
  Ajuda:               { emoji: '❓', cor: 0x5865f2 },
  Diversão:            { emoji: '🎮', cor: 0xff66cc },
  'Robux & Conversão': { emoji: '💸', cor: 0x00ff99 },
  Roblox:              { emoji: '🟥', cor: 0xe74c3c },
  Relacionamentos:     { emoji: '💍', cor: 0xff5fa2 },
  Afinidade:           { emoji: '💜', cor: 0x9b59b6 },
  Interações:          { emoji: '🤝', cor: 0x3498db },
  Reputação:           { emoji: '🏆', cor: 0xf1c40f },
  Quiz:                { emoji: '❓', cor: 0x1abc9c },
  Forca:               { emoji: '🎯', cor: 0xe67e22 },
  Conquistas:          { emoji: '🏅', cor: 0xf1c40f },
  Missões:             { emoji: '📜', cor: 0x2ecc71 },
  Títulos:             { emoji: '👑', cor: 0xf39c12 },
  Loja:                { emoji: '🛍️', cor: 0x00b894 },
  'Perfil Visual':     { emoji: '🖼️', cor: 0x6c5ce7 },
  Ship:                { emoji: '❤️', cor: 0xff4d6d },
  Administração:       { emoji: '🛠️', cor: 0xe74c3c },
  Logs:                { emoji: '📋', cor: 0x95a5a6 },
  'Anti-Abuso':        { emoji: '🛡️', cor: 0xc0392b },
  Estatísticas:        { emoji: '📊', cor: 0x2980b9 },
  Gênero:              { emoji: '⚧️', cor: 0xe056fd },
  'Meu Perfil':        { emoji: '👤', cor: 0x5865f2 },
   Inventário: { emoji: '🎒', cor: 0x00d4ff },
};

/* =========================
   CONFIG DB
========================= */

async function carregarConfigs() {
  if (!isDBConnected()) return;

  try {
    const todas = await Config.find({}).lean();

    for (const cfg of todas) {
      configs.set(cfg.guildId, cfg);
    }

    console.log(`[Loader] ${todas.length} configs carregadas.`);
  } catch (e) {
    console.warn('[Loader] erro configs:', e.message);
  }
}

/* =========================
   MAIN LOADER
========================= */

export async function loadSystems(client) {
  if (client.__systemsLoaded) return;

  try {
    patchClientRouter(client);

    await initDB();

    if (!isDBConnected()) {
      throw new Error('Falha ao conectar SQLite.');
    }

    console.log('[DB] ✔ SQLite pronto.');

    await carregarConfigs();

    client.__systemsLoaded = true;

    if (!client.systems) {
      client.systems = new Map();
    }

    const sistemas = [
      ['Ajuda',               regAjuda,           cAjuda],
      ['Diversão',            regDiversao,        cDiversao],
      ['Robux & Conversão',   regConversao,       cConversao],
      ['Roblox',              regRoblox,          cRoblox],
      ['Relacionamentos',     regRelacionamentos, cRelacionamentos],
      ['Afinidade',           regAfinidade,       cAfinidade],
      ['Interações',          regInteracoes,      cInteracoes],
      ['Reputação',           regReputacao,       cReputacao],
      ['Quiz',                regQuiz,            cQuiz],
      ['Forca',               regForca,           cForca],
      ['Conquistas',          regConquistas,      cConquistas],
      ['Missões',             regMissoes,         cMissoes],
      ['Títulos',             regTitulos,         cTitulos],
      ['Loja',                regLoja,            cLoja],
      ['Perfil Visual',       regPerfilVisual,    cPerfilVisual],
      ['Ship',                regShip,            cShip],
      ['Administração',       regAdministracao,   cAdministracao],
      ['Logs',                regLogs,            cLogs],
      ['Anti-Abuso',          regAntiAbuso,       cAntiAbuso],
      ['Estatísticas',        regEstatisticas,    cEstatisticas],
      ['Gênero',              regGenero,          cGenero],
      ['Meu Perfil',          regMeuPerfil,       cMeuPerfil],
       ['Inventário', regInventario, cInventario],
    ];

    let ok = 0;
    let fail = 0;
    let totalCmds = 0;

    for (const [nome, fn, cmds] of sistemas) {
      try {
        await Promise.resolve(fn(client, configs));

        const metaRaw = visual[nome] || {
          emoji: '📦',
          cor: 0x5865f2,
        };

        const cmdList = Array.isArray(cmds) ? cmds : [];

        client.systems.set(nome, {
          id: nome,
          label: nome,
          emoji: metaRaw.emoji,
          cor: metaRaw.cor,
          comandos: cmdList,
        });

        totalCmds += cmdList.length;
        ok++;

        console.log(`[Loader] ✔ ${nome} — ${cmdList.length} comandos`);
      } catch (e) {
        fail++;

        console.error(`[Loader] ✖ ${nome}`);
        console.error(e);
      }
    }

    console.log(
      `[Loader] pronto — ${ok} sistemas — ${fail} erros — ${totalCmds} comandos`
    );

    return configs;

  } catch (err) {
    console.error('[Loader] Falha ao iniciar sistemas');
    console.error(err);
    throw err;
  }
}

/* =========================
   GLOBAL ERROR HANDLERS
========================= */

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]');
  console.error(err);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]');
  console.error(err);
});
