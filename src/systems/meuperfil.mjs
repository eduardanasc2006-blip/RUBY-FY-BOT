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

  // 🔹 2. Garante valores padrão (evita crash no canvas)
  const safeUser = {
    ...user,
    moldura: user.moldura ?? 'padrao',
    fundo: user.fundo ?? 'padrao',
    efeitoEquipado: user.efeitoEquipado ?? null,
    badgeEquipado: user.badgeEquipado ?? null,
    nivel: user.nivel ?? 1,
    xpDisponivel: user.xpDisponivel ?? 0,
    xpTotal: user.xpTotal ?? 0,
    reputacoes: user.reputacoes ?? 0
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
