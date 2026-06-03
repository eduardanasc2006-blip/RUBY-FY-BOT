import { EmbedBuilder } from 'discord.js';

export const COR = {
  PRIMARIA: 0xa855f7,
  SUCESSO: 0x2ecc71,
  ERRO: 0xe74c3c,
  AVISO: 0xf39c12,
  INFO: 0x3498db,
  NEUTRO: 0x95a5a6,
};

export function embedSucesso(titulo, descricao) {
  return new EmbedBuilder().setColor(COR.SUCESSO).setTitle(`✅ ${titulo}`).setDescription(descricao).setTimestamp();
}

export function embedErro(descricao) {
  return new EmbedBuilder().setColor(COR.ERRO).setDescription(`❌ ${descricao}`);
}

export function embedAviso(descricao) {
  return new EmbedBuilder().setColor(COR.AVISO).setDescription(`⚠️ ${descricao}`);
}

export function embedInfo(titulo, descricao) {
  return new EmbedBuilder().setColor(COR.PRIMARIA).setTitle(titulo).setDescription(descricao).setTimestamp();
}
