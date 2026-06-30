import Usuario from '../db/models/Usuario.mjs';
import { gerarPerfil } from '../systems/perfilCanvas.mjs';
import { getDB } from '../db/sqlite.mjs';

export async function meuperfil(message) {
  const userId = message.author.id, guildId = message.guild.id;

  let user = await Usuario.findOne({ userId, guildId });

  if (!user) {
    // cria perfil básico automaticamente
    user = await Usuario.findOneAndUpdate(
      { userId, guildId },
      { $set: { userId, guildId } },
      { upsert: true, new: true }
    );
    if (!user) return message.reply('❌ Não foi possível criar seu perfil. Tente novamente.');
  }

  // busca parceiro (tabela casamentos)
  let casadoCom = 'Nenhum';
  try {
    const db = getDB();
    if (db) {
      const row = db.prepare(
        `SELECT userId1, userId2 FROM casamentos WHERE guildId=? AND ativo=1 AND (userId1=? OR userId2=?) LIMIT 1`
      ).get(guildId, userId, userId);
      if (row) {
        const parcId = row.userId1 === userId ? row.userId2 : row.userId1;
        const member = await message.guild.members.fetch(parcId).catch(() => null);
        casadoCom = member?.user.username ?? `<@${parcId}>`;
      }
    }
  } catch {}

  // data de entrada no servidor
  let membroDesde = '—';
  try {
    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (member?.joinedAt) {
      membroDesde = member.joinedAt.toLocaleDateString('pt-BR');
    }
  } catch {}

  const safeUser = {
    ...user,
    avatar:          message.author.displayAvatarURL({ extension: 'png', size: 512 }),
    displayName:     message.member?.displayName ?? message.author.username,
    username:        message.author.username,
    nivel:           user.nivel           ?? 1,
    xpDisponivel:    user.xpDisponivel    ?? 0,
    xpTotal:         user.xpTotal         ?? 0,
    reputacao:       user.reputacao        ?? 0,
    totalMensagens:  user.totalMensagens   ?? 0,
    streak:          user.streak           ?? 0,
    afinidade:       user.afinidade        ?? 0,
    moldura:         user.moldura          ?? 'padrao',
    fundo:           user.fundo            ?? 'escuro',
    efeitoEquipado:  user.efeitoEquipado   ?? null,
    badgeEquipado:   user.badgeEquipado    ?? null,
    titulo:          user.tituloEquipado   ?? 'Sem título',
    casadoCom,
    membroDesde,
    badges:          user.inventario?.badges ?? [],
  };

  const img = await gerarPerfil(safeUser);

  return message.channel.send({ files: [{ attachment: img, name: 'perfil.png' }] });
}

export const comandos = [{ cmd: '!meuperfil', desc: 'Mostra seu perfil visual' }];

export function register(client, configs) {
  if (client.__meuPerfilRegistrado) return;
  client.__meuPerfilRegistrado = true;

  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    const cfg = configs.get(message.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!message.content.startsWith(prefixo)) return;
    const cmd = message.content.slice(prefixo.length).trim().split(/\s+/)[0].toLowerCase();
    if (cmd === 'meuperfil') {
      try { await meuperfil(message); }
      catch (e) { console.error('[meuperfil]', e); message.reply('❌ Erro ao gerar perfil.').catch(() => null); }
    }
  });
}
