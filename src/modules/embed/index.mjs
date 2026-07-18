/**
 * Módulo de Embeds — Ponto de entrada público.
 *
 * Quem usa o módulo importa daqui, sem acoplar ao caminho interno.
 *
 * Uso:
 *   import { createDefinition }    from '../modules/embed/index.mjs';
 *   import { registerEmbedHandler } from '../modules/embed/index.mjs';
 */

export { createDefinition }    from './definition.mjs';
export { registerEmbedHandler } from './register.mjs';
