// Remove uma mensagem de confirmação após alguns segundos para não poluir o canal.
// A deleção exige permissão de "Gerenciar Mensagens" no servidor; quando o bot
// não tem essa permissão (ou está em DM), cai para editar o conteúdo para um
// texto discreto em vez de deixar a mensagem inteira visível. Nunca lança erro.
function autoDelete(mensagem, ms = 5000) {
  if (!mensagem || typeof mensagem.delete !== 'function') return;
  setTimeout(async () => {
    try {
      await mensagem.delete();
    } catch {
      try {
        await mensagem.edit('✅');
      } catch {
        // Sem permissão para editar/apagar: silenciosamente mantém a mensagem.
      }
    }
  }, ms);
}

module.exports = { autoDelete };