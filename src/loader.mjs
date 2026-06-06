import { initDB, isDBConnected } from './db/sqlite.mjs';
import Config from './db/models/Config.mjs';

// ── Imports — register only ─────────────────────────────
import { register as regAjuda } from './systems/ajuda.mjs';
import { register as regDiversao } from './systems/diversao.mjs';
import { register as regConversao } from './systems/conversao.mjs';
import { register as regRoblox } from './systems/roblox.mjs';
import { register as regRelacionamentos } from './systems/relacionamentos.mjs';
import { register as regAfinidade } from './systems/afinidade.mjs';
import { register as regInteracoes } from './systems/interacoes.mjs';
import { register as regReputacao } from './systems/reputacao.mjs';
import { register as regXpNiveis } from './systems/xpniveis.mjs';
import { register as regQuiz } from './systems/quiz.mjs';
import { register as regForca } from './systems/forca.mjs';
import { register as regConquistas } from './systems/conquistas.mjs';
import { register as regMissoes } from './systems/missoes.mjs';
import { register as regTitulos } from './systems/titulos.mjs';
import { register as regLoja } from './systems/loja.mjs';
import { register as regPerfilVisual } from './systems/perfilvisual.mjs';
import { register as regShip } from './systems/ship.mjs';
import { register as regProdutos } from './systems/produtos.mjs';
import { register as regSuporte } from './systems/suporte.mjs';
import { register as regAtendimento } from './systems/atendimento.mjs';
import { register as regAvaliacoes } from './systems/avaliacoes.mjs';
import { register as regAdministracao } from './systems/administracao.mjs';
import { register as regLogs } from './systems/logs.mjs';
import { register as regAntiAbuso } from './systems/antiabuso.mjs';
import { register as regEstatisticas } from './systems/estatisticas.mjs';
import { register as regGenero } from './systems/genero.mjs';
import { register as regMeuPerfil } from './systems/meuperfil.mjs';

const configs = new Map();

/* =========================
   SAFE EMOJI SYSTEM
========================= */

function safeEmoji(e) {
  if (!e || typeof e !== 'string') return '📦';
  return e;
}

/* =========================
   VISUAL
========================= */

const visual = {
  Ajuda: { emoji: '❓', cor: 0x5865f2 },
  Diversão: { emoji: '🎮', cor: 0xff66cc },
  'Robux & Conversão': { emoji: '💸', cor: 0x00ff99 },
  Roblox: { emoji: '🟥', cor: 0xe74c3c },
  'Perfil Visual': { emoji: '🖼️', cor: 0x6c5ce7 },
  Gênero: { emoji: '⚧️', cor: 0xe056fd },
  'Meu Perfil': { emoji: '👤', cor: 0x5865f2 },
  Relacionamentos: { emoji: '💍', cor: 0xff5fa2 },
  Afinidade: { emoji: '💜', cor: 0x9b59b6 },
  Interações: { emoji: '🤝', cor: 0x3498db },
  Ship: { emoji: '❤️', cor: 0xff4d6d },
  Reputação: { emoji: '🏆', cor: 0xf1c40f },
  Quiz: { emoji: '❓', cor: 0x1abc9c },
  Forca: { emoji: '🎯', cor: 0xe67e22 },
  'XP & Níveis': { emoji: '⭐', cor: 0xf39c12 },
  Conquistas: { emoji: '🏅', cor: 0xf1c40f },
  Missões: { emoji: '📜', cor: 0x2ecc71 },
  Títulos: { emoji: '👑', cor: 0xf39c12 },
  Loja: { emoji: '🛍️', cor: 0x00b894 },
  Produtos: { emoji: '📦', cor: 0x00cec9 },
  Suporte: { emoji: '🎫', cor: 0x3498db },
  Atendimento: { emoji: '📞', cor: 0x2ecc71 },
  Avaliações: { emoji: '⭐', cor: 0xf1c40f },
  Administração: { emoji: '🛠️', cor: 0xe74c3c },
  Logs: { emoji: '📋', cor: 0x95a5a6 },
  'Anti-Abuso': { emoji: '🛡️', cor: 0xc0392b },
  Estatísticas: { emoji: '📊', cor: 0x2980b9 },
};

/* =========================
   CONFIG DB
========================= */

async function carregarConfigs() {
  if (!isDBConnected()) return;

  try {
    const todas = await Config.find({}).lean();
    for (const cfg of todas) configs.set(cfg.guildId, cfg);
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
  client.__systemsLoaded = true;

  await initDB();

  console.log(
    isDBConnected()
      ? '[DB] ✔ SQLite pronto.'
      : '[DB] ✖ Banco não iniciado.'
  );

  await carregarConfigs();

  if (!client.systems) client.systems = new Map();

  const sistemas = [
    ['Ajuda', regAjuda, []],
    ['Diversão', regDiversao, []],
    ['Robux & Conversão', regConversao, []],
    ['Roblox', regRoblox, []],
    ['Relacionamentos', regRelacionamentos, []],
    ['Afinidade', regAfinidade, []],
    ['Interações', regInteracoes, []],
    ['Reputação', regReputacao, []],
    ['XP & Níveis', regXpNiveis, []],
    ['Quiz', regQuiz, []],
    ['Forca', regForca, []],
    ['Conquistas', regConquistas, []],
    ['Missões', regMissoes, []],
    ['Títulos', regTitulos, []],
    ['Loja', regLoja, []],
    ['Perfil Visual', regPerfilVisual, []],
    ['Ship', regShip, []],
    ['Produtos', regProdutos, []],
    ['Suporte', regSuporte, []],
    ['Atendimento', regAtendimento, []],
    ['Avaliações', regAvaliacoes, []],
    ['Administração', regAdministracao, []],
    ['Logs', regLogs, []],
    ['Anti-Abuso', regAntiAbuso, []],
    ['Estatísticas', regEstatisticas, []],
    ['Gênero', regGenero, []],
    ['Meu Perfil', regMeuPerfil, []],
  ];

  let ok = 0;
  let fail = 0;
  let totalCmds = 0;

  for (const [nome, fn, cmds] of sistemas) {
    try {
      fn(client, configs);

      const metaRaw = visual[nome] || { emoji: '📦', cor: 0x5865f2 };

      const meta = {
        emoji: metaRaw.emoji || '📦',
        cor: metaRaw.cor || 0x5865f2,
      };

      const cmdList = Array.isArray(cmds) ? cmds : [];

      client.systems.set(nome, {
        id: nome,
        label: nome,
        emoji: meta.emoji,
        cor: meta.cor,
        comandos: cmdList,
      });

      totalCmds += cmdList.length;
      ok++;

      console.log(`[Loader] ✔ ${nome} — ${cmdList.length} comandos`);
    } catch (e) {
      fail++;
      console.error(`[Loader] ✖ ${nome}`, e.message);
    }
  }

  console.log(
    `[Loader] pronto — ${ok} sistemas — ${fail} erros — ${totalCmds} comandos`
  );

  return configs;
   }
