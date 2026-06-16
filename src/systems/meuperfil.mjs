import Usuario from '../db/models/Usuario.mjs';
import { gerarPerfil } from '../systems/perfilCanvas.mjs';

export async function meuperfil(message) {
  // 🔹 1. Busca usuário no banco
  const user = await Usuario.findOne({
    userId: message.author.id,
    guildId: message.guild.id
  });

  // 🔴 Usuário não existe
  if (!user) {
    return message.reply('❌ Usuário não encontrado.');
  }

  // 🔹 2. Monta objeto completo para o canvas
  const safeUser = {
    // dados brutos do banco
    ...user.toObject?.() || user,

    // 🎯 identidade visual
    avatar: message.author.displayAvatarURL({ extension: 'png', size: 256 }),

    // 🎮 economia / level
    nivel: user.nivel ?? 1,
    xpDisponivel: user.xpDisponivel ?? 0,
    xpTotal: user.xpTotal ?? 0,
    reputacoes: user.reputacoes ?? 0,

    // 🎨 cosméticos
    moldura: user.moldura ?? 'padrao',
    fundo: user.fundo ?? 'padrao',
    efeitoEquipado: user.efeitoEquipado ?? null,
    badgeEquipado: user.badgeEquipado ?? null,
    titulo: user.tituloEquipado ?? 'Sem título',

    // 💞 social
    casadoCom: user.casadoCom ?? 'Nenhum',

    // 🏅 conquistas
    badges: user.inventario?.badges || []
  };

  // 🔹 3. Gera imagem do perfil
  const img = await gerarPerfil(safeUser);

  // 🔹 4. Envia no canal
  return message.channel.send({
    files: [
      {
        attachment: img,
        name: 'perfil.png'
      }
    ]
  });
}
