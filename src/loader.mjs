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

// ===============================
// CONFIG CACHE
// ===============================
const configs = new Map();

// ===============================
// LOAD CONFIGS FROM DB
// ===============================
async function carregarConfigs() {
  if (!isDBConnected()) return;

  try {
    const todas = await Config.find({}).lean();
    for (const cfg of todas) configs.set(cfg.guildId, cfg);

    console.log(`[Loader] ${todas.length} configurações carregadas.`);
  } catch (e) {
    console.warn('[Loader] Erro ao carregar configs:', e.message);
  }
}

// ===============================
// MAIN LOADER
// ===============================
export async function loadSystems(client) {
  // 🔥 cria registry global de sistemas
  client.systems = new Map();

  // ===========================
  // INIT DB
  // ===========================
  const dbOk = initDB();
  console.log(dbOk ? '[DB] SQLite pronto.' : '[DB] Banco não iniciado.');

  await carregarConfigs();

  // ===========================
  // AUTO CONFIG GUILD
  // ===========================
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

  // ===========================
  // SYSTEMS REGISTRY
  // ===========================
  const sistemas = [
    ['Conversao', regConversao],
    ['Roblox', regRoblox],
    ['Relacionamentos', regRelacionamentos],
    ['Afinidade', regAfinidade],
    ['Interacoes', regInteracoes],
    ['Reputacao', regReputacao],
    ['XP & Niveis', regXpNiveis],
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

  let ok = 0, fail = 0;

  // ===========================
  // REGISTER SYSTEMS
  // ===========================
  for (const [nome, fn] of sistemas) {
    try {
      fn(client, configs);
      ok++;
// 🔥 REGISTRY AUTOMÁTICO PARA !AJUDA
client.systems.set(nome, {
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
    '📦',

  cor:
    nome === 'XP & Niveis' ? 0xf1c40f :
    nome === 'Relacionamentos' ? 0xff69b4 :
    nome === 'Afinidade' ? 0xa855f7 :
    nome === 'Reputacao' ? 0xffd700 :
    nome === 'Conquistas' ? 0x2ecc71 :
    nome === 'Administracao' ? 0xe74c3c :
    0x5865f2,

  comandos:

    nome === 'XP & Niveis' ? [
      { cmd: '!xp', desc: 'Mostra seu XP e nível' },
      { cmd: '!rank', desc: 'Ranking de XP do servidor' },
      { cmd: '!xplogs', desc: 'Histórico de XP' }
    ] :

    nome === 'Relacionamentos' ? [
      { cmd: '!casar @usuario', desc: 'Pedir alguém em casamento' },
      { cmd: '!parceiro', desc: 'Ver seu parceiro atual' }
    ] :

    nome === 'Afinidade' ? [
      { cmd: '!afinidade @usuario', desc: 'Ver compatibilidade' },
      { cmd: '!topafinidade', desc: 'Ranking dos casais' }
    ] :

    nome === 'Reputacao' ? [
      { cmd: '!rep @usuario', desc: 'Dar reputação' },
      { cmd: '!ranking', desc: 'Ranking de reputação' }
    ] :

    nome === 'MeuPerfil' ? [
      { cmd: '!meuperfil', desc: 'Perfil completo do usuário' }
    ] :

    nome === 'Ship' ? [
      { cmd: '!ship @usuario', desc: 'Calcular compatibilidade' },
      { cmd: '!ship @user1 @user2', desc: 'Ship entre duas pessoas' }
    ] :

    nome === 'Conquistas' ? [
      { cmd: '!conquistas', desc: 'Ver conquistas desbloqueadas' }
    ] :

    nome === 'Missoes' ? [
      { cmd: '!missoes', desc: 'Missões diárias e semanais' }
    ] :

    nome === 'Titulos' ? [
      { cmd: '!titulos', desc: 'Ver títulos obtidos' }
    ] :

    nome === 'Perfil Visual' ? [
      { cmd: '!perfilvisual', desc: 'Editar aparência do perfil' }
    ] :

    nome === 'Diversao' ? [
      { cmd: '!8ball', desc: 'Pergunte à bola mágica' },
      { cmd: '!piada', desc: 'Receber uma piada' }
    ] :

    nome === 'Quiz' ? [
      { cmd: '!quiz', desc: 'Responder perguntas' }
    ] :

    nome === 'Forca' ? [
      { cmd: '!forca', desc: 'Jogar forca' }
    ] :

    nome === 'Suporte' ? [
      { cmd: '!ticket', desc: 'Abrir ticket de suporte' }
    ] :

    nome === 'Denuncias' ? [
      { cmd: '!denunciar', desc: 'Enviar denúncia' }
    ] :

    nome === 'Avaliacoes' ? [
      { cmd: '!avaliar', desc: 'Avaliar atendimento' }
    ] :

    nome === 'Administracao' ? [
      { cmd: '!config', desc: 'Configurações do servidor' }
    ] :

    nome === 'Logs' ? [
      { cmd: '!logs', desc: 'Configuração de logs' }
    ] :

    nome === 'Anti-Abuso' ? [
      { cmd: '!antiabuso', desc: 'Configurar proteção' }
    ] :

    nome === 'Estatisticas' ? [
      { cmd: '!stats', desc: 'Estatísticas do servidor' }
    ] :

    nome === 'Genero' ? [
      { cmd: '!genero', desc: 'Definir gênero do perfil' }
    ] :

    nome === 'Roblox' ? [
      { cmd: '!roblox', desc: 'Ferramentas Roblox' }
    ] :

    nome === 'Conversao' ? [
      { cmd: '!converter', desc: 'Conversão de unidades' }
    ] :

    nome === 'Interacoes' ? [
      { cmd: '!abracar', desc: 'Abraçar alguém' },
      { cmd: '!beijar', desc: 'Beijar alguém' },
      { cmd: '!cafune', desc: 'Fazer carinho' }
    ] :

    nome === 'Produtos' ? [
      { cmd: '!loja', desc: 'Abrir loja de XP' }
    ] :

    nome === 'Ajuda' ? [
      { cmd: '!ajuda', desc: 'Central de ajuda do FiskBot' }
    ] :
    []
});

    } catch (e) {
      fail++;
      console.error(`[Loader] Erro ${nome}:`, e.message);
    }
  }

  // ===========================
  // FINAL LOG
  // ===========================
  const dbStatus = isDBConnected() ? 'SQLite ativo' : 'sem banco de dados';

  console.log(
    `[Loader] FiskBot — ${ok} sistemas ativos${fail ? `, ${fail} erros` : ''}. ${dbStatus}`
  );

  return configs;
  } 
