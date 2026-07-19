/**
 * Módulo de Embeds — Ponto de entrada público.
 *
 * Quem usa o módulo importa daqui, sem acoplar ao caminho interno.
 *
 * Uso:
 *   import { createDefinition }     from '../modules/embed/index.mjs';
 *   import { registerEmbedHandler } from '../modules/embed/index.mjs';
 *   import { openEmbedPanel }       from '../modules/embed/index.mjs';
 */

import { MessageFlags }  from 'discord.js';
import { createDefinition } from './definition.mjs';
import { openEditor }    from '../editor/index.mjs';
import { getAllSettings } from '../../database/repositories/GuildConfig.mjs';

export { createDefinition }    from './definition.mjs';
export { registerEmbedHandler } from './register.mjs';

/**
 * Abre o editor visual de embeds para o servidor.
 * Wrapper do /embed para uso pelo painel central.
 *
 * @param {import('discord.js').Interaction} interaction
 */
export async function openEmbedPanel(interaction) {
  const definition  = createDefinition();
  const dadosAtuais = getAllSettings(interaction.guildId, 'embed');
  await openEditor(interaction, definition, dadosAtuais);
}
