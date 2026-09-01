// Valida/sanitiza um emoji antes de usá-lo em componentes do Discord (botões).
// O Discord rejeita com COMPONENT_INVALID_EMOJI se o valor não for um emoji válido.

function sanitizarEmoji(valor) {
  if (typeof valor !== 'string') return null;
  const v = valor.trim().slice(0, 64);
  if (!v) return null;
  // Emoji customizado no formato <:nome:123456> ou <a:nome:123456>
  if (/^<a?:\w+:\d{15,25}>$/.test(v)) return v;
  // ID puro de emoji customizado
  if (/^\d{15,25}$/.test(v)) return v;
  // Emoji Unicode: exige que todo code point seja pictográfico (ou ZWJ/VS16)
  const soBase = [...v].filter((ch) => ch !== '\u200d' && !/[\ufe0e-\ufe0f]/.test(ch));
  if (!soBase.length) return null;
  const todosValidos = soBase.every((ch) => /\p{Extended_Pictographic}/u.test(ch));
  if (!todosValidos) return null;
  return [...v].slice(0, 32).join('');
}

module.exports = { sanitizarEmoji };