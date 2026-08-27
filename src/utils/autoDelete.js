// Remove uma mensagem de confirmação após alguns segundos para não poluir o canal.
// A deleção exige permissão de "Gerenciar Mensagens" no servidor; quando o bot
// não tem essa permissão (ou está em DM), cai para editar o conteúdo para um
// único espaço invisível (o texto e o embed somem de vista), em vez de deixar a
// mensagem inteira visível. Nunca lança erro.
function autoDelete(mensagem, ms = 5000) {
  if (!mensagem || typeof mensagem.delete !== 'function') return;
  setTimeout(async () => {
    try {
      await mensagem.delete();
    } catch {
      try {
        // Edita para uma string apenas com espaço de largura zero: o conteúdo
        // antigo (texto, embed, botões) desaparece mesmo sem permissão de delete.
        await mensagem.edit({ content: '\u200b', embeds: [], components: [] });
      } catch {
        // Sem permissão para editar/apagar: silenciosamente mantém a mensagem.
      }
    }
  }, ms);
}

module.exports = { autoDelete };