import Usuario from '../db/models/Usuario.mjs';
import ConquistaModel from '../db/models/Conquista.mjs';
import { LISTA_CONQUISTAS } from './conquistasBase.mjs';
import { getDB } from '../db/sqlite.mjs';
import { gerarPerfil } from '../canvas/perfilCanvas.mjs';

const LABEL_GENERO = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  outro: 'Outro'
};

async function buscarCasadoCom(guildId, userId, guild) {
  const db = getDB();
  if (!db) return null;

  const row = db
    .prepare(
      `SELECT userId1, userId2 FROM casamentos WHERE guildId=? AND ativo=1 AND (userId1=? OR userId2=?)`
    )
    .get(guildId, userId, userId);

  if (!row) return null;

  const alvoId = row.userId1 === userId ? row.userId2 : row.userId1;

  try {
    const membro = await guild.members.fetch(alvoId);
    return membro.user.username;
  } catch {
    return 'Alguém';
  }
}

export async function meuperfil(message) {
  // 🔹 1. Busca usuário no banco
  const userId = message.author.id;
  const guildId = message.guild.id;

  const user = await Usuario.findOne({ userId, guildId });

  // 🔴 Usuário não existe
  if (!user) {
    return message.reply('❌ Usuário não encontrado.');
  }

  // 🔹 2. Busca dados complementares (conquistas + casamento)
  const conquistaDoc = await ConquistaModel.findOne({ userId, guildId });
  const conquistadas = conquistaDoc?.conquistas ?? [];

  const casadoCom = await buscarCasadoCom(guildId, userId, message.guild);

  // 🔹 3. Monta objeto para o canvas
  const dadosPerfil = {
    avatar: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
    nome: message.member?.displayName || message.author.username,
    tag: `@${message.author.username}`,

    nivel: user.nivel ?? 1,
    xpDisponivel: user.xpDisponivel ?? 0,
    xpTotal: user.xpTotal ?? 0,
    reputacao: user.reputacao ?? 0,

    casadoCom: casadoCom || 'Ninguém',
    titulo: user.tituloEquipado || 'Sem título',
    genero: LABEL_GENERO[user.genero] || 'Não informado',
    dataEntrada: message.member?.joinedAt || null,

    conquistasTotal: conquistadas.length,
    conquistasMax: LISTA_CONQUISTAS.length
  };

  // 🔹 4. Gera imagem única do perfil
  const img = await gerarPerfil(dadosPerfil);

  // 🔹 5. Envia no canal
  return message.channel.send({
    files: [
      {
        attachment: img,
        name: 'perfil.png'
      }
    ]
  });
}

// ✅ Comandos e registro
export const comandos = [
  {
    cmd: '!meuperfil',
    desc: 'Mostra seu perfil visual'
  }
];

export function register(client, configs) {
  if (client.__meuPerfilRegistrado) return;
  client.__meuPerfilRegistrado = true;

  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    const cfg = configs.get(message.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!message.content.startsWith(prefixo)) return;

    const cmd = message.content
      .slice(prefixo.length)
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();

    if (cmd === 'meuperfil') {
      return meuperfil(message);
    }
  });
}
