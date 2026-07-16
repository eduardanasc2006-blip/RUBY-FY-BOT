/**
 * Editor Visual Privado Universal — ponto de entrada público.
 *
 * Uso por um módulo externo:
 *
 *   import { openEditor } from '../../modules/editor/index.mjs';
 *
 *   const definition = {
 *     editorType:    'embed',
 *     name:          'Editor de Embed',
 *     fields:        [ { key, label, emoji, type, ... }, ... ],
 *     renderPreview: (data) => ({ embeds: [new EmbedBuilder()...] }),
 *     onConfirm:     async (interaction, data) => { // salva no banco },
 *     validate:      (data) => ({ ok: true }),   // opcional
 *   };
 *
 *   await openEditor(interaction, definition, dadosIniciais);
 */

import { MessageFlags } from 'discord.js';
import { createSession } from '../../core/sessionManager.mjs';
import { register } from '../../handlers/componentHandler.mjs';
import { handleComponent, setDefinition } from './actions.mjs';
import { renderPanel } from './renderer.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Registro no componentHandler ──────────────────────────────────────────────

/**
 * Registra o namespace 'editor' no componentHandler.
 * Deve ser chamado uma única vez no boot do bot (src/index.mjs).
 */
export function registerEditorHandler() {
  register('editor', handleComponent);
  logger.info('[Editor] Handler registrado no namespace "editor".');
}

// ── Abertura do editor ────────────────────────────────────────────────────────

/**
 * Abre o Editor Visual para um administrador.
 *
 * @param {import('discord.js').Interaction} interaction - Interação que originou a abertura
 * @param {object} definition  - Definição do editor (fornecida pelo módulo)
 * @param {object} initialData - Dados iniciais dos campos (opcional)
 */
export async function openEditor(interaction, definition, initialData = {}) {
  // Valida definição mínima
  if (!definition?.editorType || !definition?.name || !Array.isArray(definition?.fields)) {
    logger.error('[Editor] openEditor chamado com definição inválida:', definition);
    const payload = { content: '❌ Erro interno: definição do editor inválida.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp(payload);
    }
    return interaction.reply(payload);
  }

  // Cria sessão temporária
  const session = createSession(
    interaction.user.id,
    interaction.guildId,
    definition.editorType,
    initialData,
  );

  // Armazena a definição associada à sessão
  setDefinition(session.sessionId, definition);

  // Renderiza e envia o painel (ephemeral — visível só para o admin)
  const panel = renderPanel(session, definition);

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ ...panel, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    logger.error('[Editor] Erro ao enviar painel inicial:', err);
  }
}
