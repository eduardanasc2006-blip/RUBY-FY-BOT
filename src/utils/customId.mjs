/**
 * Utilitário para construção e leitura de customIds de componentes.
 *
 * Formato padrão (usado em TODO o projeto):
 *   namespace:action:parte1:parte2:...
 *
 * Exemplos:
 *   editor:confirm:abc123
 *   ticket:close:987654321
 *   cargo:assign:987654321
 *   form:submit:contato:abc123
 *
 * Limite do Discord: 100 caracteres por customId.
 */

const SEPARATOR = ':';
const MAX_LENGTH = 100;

/**
 * Constrói um customId no formato padrão.
 *
 * @param {string} namespace  - Identificador do módulo (ex: 'editor', 'ticket')
 * @param {string} action     - Ação dentro do módulo (ex: 'confirm', 'close')
 * @param {...string} partes  - Dados adicionais opcionais (ex: sessionId, userId)
 * @returns {string}
 * @throws {Error} Se o resultado ultrapassar 100 caracteres
 */
export function build(namespace, action, ...partes) {
  if (!namespace || !action) {
    throw new Error('[customId] namespace e action são obrigatórios.');
  }

  const id = [namespace, action, ...partes].join(SEPARATOR);

  if (id.length > MAX_LENGTH) {
    throw new Error(
      `[customId] customId gerado tem ${id.length} caracteres, limite é ${MAX_LENGTH}: "${id}"`
    );
  }

  return id;
}

/**
 * Faz o parse de um customId no formato padrão.
 *
 * @param {string} customId
 * @returns {{ valid: boolean, namespace: string, action: string, partes: string[] }}
 */
export function parse(customId) {
  if (!customId || typeof customId !== 'string') {
    return { valid: false, namespace: '', action: '', partes: [] };
  }

  const partes = customId.split(SEPARATOR);

  if (partes.length < 2 || !partes[0] || !partes[1]) {
    return { valid: false, namespace: '', action: '', partes: [] };
  }

  return {
    valid:     true,
    namespace: partes[0],
    action:    partes[1],
    partes:    partes.slice(2),
  };
}
