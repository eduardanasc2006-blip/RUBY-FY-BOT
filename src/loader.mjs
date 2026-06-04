import { initDB, isDBConnected } from './db/sqlite.mjs';
import Config from './db/models/Config.mjs';

// ===============================
// SYSTEMS IMPORTS
// ===============================
import { register as regConversao }      from './systems/conversao.mjs';
import { register as regRoblox }         from './systems/roblox.mjs';
import { register as regRelacionamentos } from './systems/relacionamentos.mjs';
import { register as regAfinidade }      from './systems/afinidade.mjs';
import { register as regInteracoes }     from './systems/interacoes.mjs';
import { register as regReputacao }      from './systems/reputacao.mjs';
import { register as regXpNiveis, comandos as cmdsXpNiveis } from './systems/xpniveis.mjs';
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

// ===============================
// CONFIG CACHE
// ===============================
const configs = new Map();

// ===============================
// LOAD CONFIGS
// ===============================
async function carregarConfigs() {
  if (!isDBConnected()) return;

  try {
    const todas = await Config.find({}).lean();

    for (const cfg of todas) {
      configs.set(cfg.guildId, cfg);
    }

    console.log(`[Loader] ${todas.length} configurações carregadas.`);
  } catch (e) {
    console.warn('[Loader] Erro configs:', e.message);
  }
}

// ===============================
// MAIN LOADER
// ===============================
export async function loadSystems(client) {

  // 🔥 PREVENÇÃO DE DUPLO LOAD (CRÍTICO)
  if (client.__systemsLoaded) {
    console.log('[Loader] Sistemas já carregados, ignorando reload');
    return;
  }
  client.__systemsLoaded = true;

  // registry global
  client.systems = new Map();

  // ===============================
  // DB INIT
  // ===============================
  const dbOk = initDB();
  console.log(dbOk ? '[DB] SQLite pronto.' : '[DB] Banco não iniciado.');

  await carregarConfigs();

  // ===============================
  // AUTO CONFIG GUILD
  // ===============================
  client.on('guildCreate', async (guild) => {
    if (!isDBConnected() || configs.has(guild.id)) return;

    try {
      const cfg = await Config.findOneAndUpdate(
        { guildId: guild.id },
        { $setOnInsert: { guildId: guild.id } },
        { upsert: true, new: true }
      );

      if (cfg) configs.set(guild.id, cfg);
    } catch (e) {
      console.warn('[Loader] guildCreate error:', e.message);
    }
  });

  // ===============================
  // SYSTEMS LIST
  // ===============================
  const sistemas = [
    ['Conversao', regConversao],
    ['Roblox', regRoblox],
    ['Relacionamentos', regRelacionamentos],
    ['Afinidade', regAfinidade],
    ['Interacoes', regInteracoes],
    ['Reputacao', regReputacao],
    ['XP & Niveis', regXpNiveis, cmdsXpNiveis],
    ['Quiz', regQuiz],
    ['Forca', regForca],
    ['Diversao', regDiversao],
    ['Conquistas', regConquistas],
    ['Missoes', regMissoes],
    ['Titulos', regTitulos],
    ['Perfil Visual', regPerfilVisual],
    ['Ship', regShip],
    ['Produtos', regProdutos],
    ['Suporte', regSuporte],
    ['Denuncias', regDenuncias],
    ['Avaliacoes', regAvaliacoes],
    ['Administracao', regAdministracao],
    ['Logs', regLogs],
    ['Anti-Abuso', regAntiAbuso],
    ['Ajuda', regAjuda],
    ['Estatisticas', regEstatisticas],
    ['Genero', regGenero],
    ['MeuPerfil', regMeuPerfil],
  ];

  console.log('REGISTRO AJUDA ENCONTRADO');

  // ===============================
  // REGISTER SYSTEMS
  // ===============================
  let ok = 0;
  let fail = 0;

  for (const [nome, fn, comandos] of sistemas) {
    console.log('CARREGANDO:', nome);

    try {
      fn(client, configs);
      ok++;

      client.systems.set(nome, {
        id: nome,
        label: nome,

        emoji:
          nome === 'XP & Niveis' ? '⭐' :
          nome === 'Relacionamentos' ? '💍' :
          nome === 'Afinidade' ? '💜' :
          nome === 'Reputacao' ? '🏆' :
          nome === 'Conquistas' ? '🎖️' :
          nome === 'Missoes' ? '📜' :
          nome === 'Titulos' ? '👑' :
          nome === 'Perfil Visual' ? '🖼️' :
          nome === 'Ship' ? '💕' :
          nome === 'Diversao' ? '🎮' :
          nome === 'Quiz' ? '❓' :
          nome === 'Forca' ? '🎯' :
          nome === 'Suporte' ? '🎫' :
          nome === 'Denuncias' ? '🚨' :
          nome === 'Avaliacoes' ? '⭐' :
          nome === 'Administracao' ? '🛡️' :
          nome === 'Logs' ? '📋' :
          nome === 'Anti-Abuso' ? '🔨' :
          nome === 'Estatisticas' ? '📊' :
          nome === 'Genero' ? '⚧️' :
          nome === 'MeuPerfil' ? '👤' :
          nome === 'Roblox' ? '🟥' :
          nome === 'Conversao' ? '🔄' :
          nome === 'Interacoes' ? '🤝' :
          nome === 'Produtos' ? '🛒' :
          nome === 'Ajuda' ? '📚' :
          '📦',

        cor:
          nome === 'XP & Niveis' ? 0xf1c40f :
          nome === 'Relacionamentos' ? 0xff69b4 :
          nome === 'Afinidade' ? 0xa855f7 :
          nome === 'Reputacao' ? 0xffd700 :
          nome === 'Conquistas' ? 0x2ecc71 :
          nome === 'Administracao' ? 0xe74c3c :
          0x5865f2,

        comandos: comandos || []
      });

      console.log('[SISTEMA]', nome, '=>', comandos?.length || 0);

    } catch (e) {
      fail++;
      console.error(`[Loader] Erro ${nome}:`, e.message);
    }
  }

  // ===============================
  // FINAL LOG
  // ===============================
  const dbStatus = isDBConnected()
    ? 'SQLite ativo'
    : 'sem banco de dados';

  console.log(
    `[Loader] FiskBot — ${ok} sistemas ativos${fail ? `, ${fail} erros` : ''}. ${dbStatus}`
  );

  return configs;
  }
