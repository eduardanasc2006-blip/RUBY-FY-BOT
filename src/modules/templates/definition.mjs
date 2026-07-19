/**
 * Módulo de Modelos — Definição do Editor de Template de Embed.
 *
 * Cria uma `definition` compatível com o Editor Visual Universal,
 * sem o campo `canal_id` (modelos não publicam diretamente).
 *
 * O botão "✅ Confirmar" é intencionalmente bloqueado pelo validate():
 * o admin deve usar "💾 Salvar como Modelo" (extraActions).
 *
 * O gerenciamento de Fields reutiliza o namespace 'embed' já registrado.
 */

import { EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../../config/bot.mjs';
import { build } from '../../utils/customId.mjs';

// ── Constantes ────────────────────────────────────────────────────────────────

const EMBED_CHAR_LIMIT = 6000;

const COR_OPTIONS = [
  { label: 'Azul Discord', value: '#5865F2', emoji: '🔵' },
  { label: 'Verde',        value: '#57F287', emoji: '🟢' },
  { label: 'Vermelho',     value: '#ED4245', emoji: '🔴' },
  { label: 'Amarelo',      value: '#FEE75C', emoji: '🟡' },
  { label: 'Branco',       value: '#FFFFFF', emoji: '⚪' },
  { label: 'Escuro',       value: '#23272A', emoji: '⚫' },
  { label: 'Azul Claro',   value: '#0099FF', emoji: '🔷' },
  { label: 'Laranja',      value: '#E67E22', emoji: '🟠' },
];

// ── Validadores ───────────────────────────────────────────────────────────────

function isValidUrl(value) {
  try { const u = new URL(value); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

function isValidHttpsUrl(value) {
  try { return new URL(value).protocol === 'https:'; }
  catch { return false; }
}

function isValidHex(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function calcEmbedLength(data) {
  let len = [data.titulo, data.descricao, data.autor_nome, data.rodape_texto]
    .filter(Boolean).reduce((acc, v) => acc + String(v).length, 0);
  if (Array.isArray(data.fields)) {
    for (const f of data.fields) len += (f.name?.length ?? 0) + (f.value?.length ?? 0);
  }
  return len;
}

// ── Fábrica ───────────────────────────────────────────────────────────────────

/**
 * Cria a definição do Editor de Template de Embed.
 * Compatível com openEditor() e com renderPanel() diretamente.
 *
 * @returns {object} definition
 */
export function createEmbedTemplateDefinition() {
  return {
    editorType: 'embed_template',
    name:       'Editor de Modelo — Embed',

    // ── Campos (idênticos ao embed, sem canal_id) ──────────────────────────
    fields: [
      { key: 'titulo',        label: 'Título',          emoji: '📝', type: 'text',      maxLength: 256,  placeholder: 'Ex: Proof de Venda' },
      { key: 'descricao',     label: 'Descrição',        emoji: '📄', type: 'paragraph', maxLength: 4000, placeholder: 'Ex: Cliente: {cliente}' },
      { key: 'url_embed',     label: 'URL da Embed',     emoji: '🔗', type: 'text',      maxLength: 512,  placeholder: 'https://exemplo.com' },
      { key: 'cor',           label: 'Cor Predefinida',  emoji: '🎨', type: 'color',     options: COR_OPTIONS },
      { key: 'cor_hex',       label: 'Cor HEX',          emoji: '🖌️', type: 'text',      maxLength: 7,    placeholder: '#FF5733' },
      { key: 'autor_nome',    label: 'Autor — Nome',     emoji: '👤', type: 'text',      maxLength: 256,  placeholder: 'Ex: Ruby FY' },
      { key: 'autor_url',     label: 'Autor — URL',      emoji: '🌐', type: 'text',      maxLength: 512,  placeholder: 'https://exemplo.com' },
      { key: 'autor_icone',   label: 'Autor — Ícone',    emoji: '🖼️', type: 'text',      maxLength: 512,  placeholder: 'https://... (HTTPS)' },
      { key: 'imagem_url',    label: 'Imagem Principal', emoji: '🖼️', type: 'text',      maxLength: 512,  placeholder: 'https://... (HTTPS)' },
      { key: 'thumbnail_url', label: 'Thumbnail',        emoji: '🔲', type: 'text',      maxLength: 512,  placeholder: 'https://... (HTTPS)' },
      { key: 'rodape_texto',  label: 'Rodapé — Texto',   emoji: '📌', type: 'text',      maxLength: 2048, placeholder: 'Ex: Ruby FY Bot' },
      { key: 'rodape_icone',  label: 'Rodapé — Ícone',   emoji: '📎', type: 'text',      maxLength: 512,  placeholder: 'https://... (HTTPS)' },
      { key: 'timestamp',     label: 'Timestamp',        emoji: '🕐', type: 'toggle' },
    ],

    // ── Botões extras ──────────────────────────────────────────────────────
    /**
     * Adiciona "Gerenciar Fields" e "Salvar como Modelo" à linha de ações.
     * O gerenciamento de fields reutiliza o namespace 'embed' já registrado.
     *
     * @param {string} sessionId
     * @returns {ButtonBuilder[]}
     */
    extraActions(sessionId) {
      return [
        new ButtonBuilder()
          .setCustomId(build('embed', 'fields_open', sessionId))
          .setLabel('Gerenciar Fields')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(build('templates', 'save_modal', sessionId))
          .setLabel('Salvar como Modelo')
          .setEmoji('💾')
          .setStyle(ButtonStyle.Success),
      ];
    },

    // ── Validação ──────────────────────────────────────────────────────────
    /**
     * Bloqueia o botão "Confirmar" com uma mensagem orientativa.
     * Valida também os dados do conteúdo.
     */
    validate(data) {
      // Verifica conteúdo mínimo
      if (!data.titulo?.trim() && !data.descricao?.trim()) {
        return { ok: false, reason: 'Preencha pelo menos o **Título** ou a **Descrição** do modelo.' };
      }

      // Validações de formato
      if (data.url_embed?.trim() && !isValidUrl(data.url_embed.trim())) {
        return { ok: false, reason: 'A **URL da Embed** é inválida.' };
      }
      if (data.cor_hex?.trim() && !isValidHex(data.cor_hex.trim())) {
        return { ok: false, reason: 'A **Cor HEX** é inválida. Use o formato `#RRGGBB`.' };
      }
      if ((data.autor_url?.trim() || data.autor_icone?.trim()) && !data.autor_nome?.trim()) {
        return { ok: false, reason: 'O **Autor — URL** e o **Ícone** requerem o **Autor — Nome**.' };
      }
      if (data.autor_url?.trim()    && !isValidUrl(data.autor_url.trim()))         return { ok: false, reason: 'O **Autor — URL** é inválido.' };
      if (data.autor_icone?.trim()  && !isValidHttpsUrl(data.autor_icone.trim()))  return { ok: false, reason: 'O **Autor — Ícone** deve ser HTTPS.' };
      if (data.imagem_url?.trim()   && !isValidHttpsUrl(data.imagem_url.trim()))   return { ok: false, reason: 'A **Imagem Principal** deve ser HTTPS.' };
      if (data.thumbnail_url?.trim()&& !isValidHttpsUrl(data.thumbnail_url.trim()))return { ok: false, reason: 'A **Thumbnail** deve ser HTTPS.' };
      if (data.rodape_icone?.trim() && !data.rodape_texto?.trim()) return { ok: false, reason: 'O **Rodapé — Ícone** requer o **Rodapé — Texto**.' };
      if (data.rodape_icone?.trim() && !isValidHttpsUrl(data.rodape_icone.trim())) return { ok: false, reason: 'O **Rodapé — Ícone** deve ser HTTPS.' };
      if (Array.isArray(data.fields) && data.fields.length > 25) return { ok: false, reason: 'Máximo de **25 fields** por embed.' };

      if (calcEmbedLength(data) > EMBED_CHAR_LIMIT) {
        return { ok: false, reason: `A embed ultrapassa o limite de **${EMBED_CHAR_LIMIT} caracteres**.` };
      }

      // Bloqueia o botão Confirmar — admin deve usar "💾 Salvar como Modelo"
      return {
        ok:     false,
        reason: 'Para salvar o modelo, use o botão **💾 Salvar como Modelo**.',
      };
    },

    // ── Prévia ─────────────────────────────────────────────────────────────
    renderPreview(data) {
      const embed = buildEmbed(data, { footerText: '👁️ Prévia do Modelo — nada foi publicado' });

      if (Array.isArray(data.fields) && data.fields.length > 0) {
        for (const f of data.fields) {
          embed.addFields({ name: f.name, value: f.value, inline: f.inline ?? false });
        }
      }

      return { embeds: [embed] };
    },

    // ── Confirmação bloqueada ──────────────────────────────────────────────
    async onConfirm() {
      // Nunca deve ser chamado graças ao validate() — mas por segurança:
      throw new Error('Use o botão 💾 Salvar como Modelo para salvar este modelo.');
    },
  };
}

// ── Construtor de embed ───────────────────────────────────────────────────────

export function buildEmbed(data, { footerText, footerIcon, forceTimestamp } = {}) {
  let corFinal = config.embedColor;
  if (data.cor_hex?.trim() && isValidHex(data.cor_hex.trim())) corFinal = data.cor_hex.trim();
  else if (data.cor) corFinal = data.cor;

  const embed = new EmbedBuilder().setColor(corFinal);

  if (data.titulo?.trim())    embed.setTitle(data.titulo.trim());
  if (data.url_embed?.trim()) embed.setURL(data.url_embed.trim());
  if (data.descricao?.trim()) embed.setDescription(data.descricao.trim());

  if (data.autor_nome?.trim()) {
    embed.setAuthor({
      name:    data.autor_nome.trim(),
      url:     data.autor_url?.trim()   || undefined,
      iconURL: data.autor_icone?.trim() || undefined,
    });
  }

  if (data.imagem_url?.trim())    embed.setImage(data.imagem_url.trim());
  if (data.thumbnail_url?.trim()) embed.setThumbnail(data.thumbnail_url.trim());

  if (footerText) {
    embed.setFooter({ text: footerText, iconURL: footerIcon || undefined });
  }

  if (forceTimestamp || data.timestamp === true) embed.setTimestamp();

  return embed;
}
