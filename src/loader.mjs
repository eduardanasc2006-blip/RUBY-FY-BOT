import { initDB, isDBConnected } from './db/sqlite.mjs';
import Config from './db/models/Config.mjs';

import { register as regConversao }      from './systems/conversao.mjs';
import { register as regRoblox }         from './systems/roblox.mjs';
import { register as regRelacionamentos } from './systems/relacionamentos.mjs';
import { register as regAfinidade }      from './systems/afinidade.mjs';
import { register as regInteracoes }     from './systems/interacoes.mjs';
import { register as regReputacao }      from './systems/reputacao.mjs';
import { register as regXpNiveis }       from './systems/xpniveis.mjs';
import { register as regQuiz }           from './systems/quiz.mjs';
import { register as regForca }          from './systems/forca.mjs';
import { register as regDiversao }       from './systems/diversao.mjs';
import { register as regConquistas }     from './systems/conquistas.mjs';
import { register as regMissoes }        from './systems/missoes.mjs';
import { register as regTitulos }        from './systems/titulos.mjs';
import { register as regPerfilVisual }   from './systems/perfilvisual.mjs';
import { register as regShip }           from './systems/ship.mjs';
import { register as regProdutos }       from './systems/produtos.mjs';
import { register as regSuporte }        from './systems/suporte.mjs';
import { register as regDenuncias }      from './systems/denuncias.mjs';
import { register as regAvaliacoes }     from './systems/avaliacoes.mjs';
import { register as regAdministracao }  from './systems/administracao.mjs';
import { register as regLogs }           from './systems/logs.mjs';
import { register as regAntiAbuso }      from './systems/antiabuso.mjs';
import { register as regAjuda }          from './systems/ajuda.mjs';
import { register as regEstatisticas }   from './systems/estatisticas.mjs';
import { register as regGenero }         from './systems/genero.mjs';
import { register as regMeuPerfil }      from './systems/meuperfil.mjs';

const configs = new Map();

/* =========================
   ECONOMIA GLOBAL (XP SYSTEM)
========================= */
const economy = {
  currency: 'xp',
  enabled: true,
  logs: true,
  version: '1.0',
};

/* =========================
   CONFIGS
========================= */
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

/* =========================
   BOOT DO BOT
========================= */
export async function loadSystems(client) {
  const dbOk = initDB();
  console.log(dbOk ? '[DB] SQLite pronto.' : '[DB] Aviso: banco nao iniciado.');

  await carregarConfigs();

  /* =========================
     AUTO CONFIG GUILD
  ========================= */
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

  /* =========================
     SISTEMAS REGISTRADOS
  ========================= */
  const sistemas = [
    ['Ajuda',           regAjuda],
    ['Diversao',        regDiversao],
    ['Conversao',       regConversao],
    ['Roblox',          regRoblox],
    ['Relacionamentos', regRelacionamentos],
    ['Afinidade',       regAfinidade],
    ['Interacoes',      regInteracoes],
    ['Reputacao',       regReputacao],
    ['XP & Niveis',     regXpNiveis],
    ['Quiz',            regQuiz],
    ['Forca',           regForca],
    ['Conquistas',      regConquistas],
    ['Missoes',         regMissoes],
    ['Titulos',         regTitulos],
    ['Perfil Visual',   regPerfilVisual],
    ['Ship',            regShip],
    ['Produtos',        regProdutos],
    ['Suporte',         regSuporte],
    ['Denuncias',       regDenuncias],
    ['Avaliacoes',      regAvaliacoes],
    ['Administracao',   regAdministracao],
    ['Logs',            regLogs],
    ['Anti-Abuso',      regAntiAbuso],
    ['Estatisticas',    regEstatisticas],
    ['Genero',          regGenero],
    ['MeuPerfil',       regMeuPerfil],
  ];

  /* =========================
     INIT SISTEMAS
  ========================= */
  let ok = 0, fail = 0;

  for (const [nome, fn] of sistemas) {
    try {
      fn(client, configs, { economy });
      ok++;
    } catch (e) {
      fail++;
      console.error(`[Loader] Erro ${nome}:`, e.message);
    }
  }

  const dbStatus = isDBConnected() ? 'SQLite ativo' : 'sem banco de dados';

  console.log(
    `[Loader] FiskBot — ${ok} sistemas ativos${fail ? `, ${fail} com erro` : ''}. ${dbStatus}`
  );

  return configs;
}
