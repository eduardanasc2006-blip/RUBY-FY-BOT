/**
 * Módulo de Embeds — Definição do Editor.
 *
 * Fornece a `definition` compatível com openEditor() do Editor Visual Universal.
 * Este arquivo contém toda a lógica de negócio do módulo de embeds:
 * campos, validação, prévia e confirmação.
 *
 * O Editor Visual (src/modules/editor/) não é alterado por este módulo.
 *
 * Histórico:
 *   Etapa 5        — campos originais: titulo, descricao, cor, canal_id
 *   Etapa 6 Fase A — campos expandidos: url_embed, cor_hex, autor_*, imagem_url,
 *                    thumbnail_url, rodape_*, timestamp
 *   Etapa 6 Fase B — canal_id migrado de 'text' para 'channel' (seletor nativo)
 */

import { EmbedBuilder } from 'discord.js';
import { setSetting } from '../../database/repositories/GuildConfig.mjs';
import { config } from '../../config/bot.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Constantes ────────────────────────────────────────────────────────────────

/** Limite total de caracteres da embed (Discord) */
const EMBED_CHAR_LIMIT = 6000;

/** Opções de cor predefinidas para o campo de cor */
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

// ── Validadores auxiliares ────────────────────────────────────────────────────

/** Valida URL genérica (http ou https) */
function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Valida URL obrigatoriamente HTTPS (para imagens e ícones) */
function isValidHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Valida cor HEX no formato #RRGGBB (exatamente 6 dígitos, maiúsculas ou minúsculas) */
function isValidHex(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

/**
 * Calcula o total de caracteres que a embed teria,
 * considerando apenas os campos de texto relevantes para o limite do Discord.
 */
function calcEmbedLength(data) {
  return [
    data.titulo,
    data.descricao,
    data.autor_nome,
    data.rodape_texto,
  ]
    .filter(Boolean)
    .reduce((acc, v) => acc + String(v).length, 0);
}

// ── Fábrica da definição ──────────────────────────────────────────────────────

/**
 * Cria a definição do Editor de Embeds.
 * Retorna um objeto `definition` compatível com openEditor().
 *
 * @returns {object} definition
 */
export function createDefinition() {
  return {
    editorType: 'embed',
    name:       'Editor de Embed',

    // ── Campos ──────────────────────────────────────────────────────────────
    fields: [
      // ── Conteúdo principal ────────────────────────────────────────────────
      {
        key:         'titulo',
        label:       'Título',
        emoji:       '📝',
        type:        'text',
        maxLength:   256,
        required:    false,
        placeholder: 'Ex: Bem-vindo ao servidor!',
      },
      {
        key:         'descricao',
        label:       'Descrição',
        emoji:       '📄',
        type:        'paragraph',
        maxLength:   4000,
        required:    false,
        placeholder: 'Ex: Aqui você encontra tudo sobre...',
      },
      {
        key:         'url_embed',
        label:       'URL da Embed',
        emoji:       '🔗',
        type:        'text',
        maxLength:   512,
        required:    false,
        placeholder: 'https://exemplo.com (torna o título clicável)',
      },

      // ── Cores ─────────────────────────────────────────────────────────────
      {
        key:     'cor',
        label:   'Cor Predefinida',
        emoji:   '🎨',
        type:    'color',
        options: COR_OPTIONS,
      },
      {
        key:         'cor_hex',
        label:       'Cor HEX',
        emoji:       '🖌️',
        type:        'text',
        maxLength:   7,
        required:    false,
        placeholder: '#FF5733 (tem prioridade sobre a cor predefinida)',
      },

      // ── Autor ─────────────────────────────────────────────────────────────
      {
        key:         'autor_nome',
        label:       'Autor — Nome',
        emoji:       '👤',
        type:        'text',
        maxLength:   256,
        required:    false,
        placeholder: 'Ex: Equipe Ruby FY',
      },
      {
        key:         'autor_url',
        label:       'Autor — URL',
        emoji:       '🌐',
        type:        'text',
        maxLength:   512,
        required:    false,
        placeholder: 'https://exemplo.com (requer Nome do Autor)',
      },
      {
        key:         'autor_icone',
        label:       'Autor — Ícone',
        emoji:       '🖼️',
        type:        'text',
        maxLength:   512,
        required:    false,
        placeholder: 'https://... (URL HTTPS da imagem — requer Nome do Autor)',
      },

      // ── Imagens ───────────────────────────────────────────────────────────
      {
        key:         'imagem_url',
        label:       'Imagem Principal',
        emoji:       '🖼️',
        type:        'text',
        maxLength:   512,
        required:    false,
        placeholder: 'https://... (URL HTTPS da imagem)',
      },
      {
        key:         'thumbnail_url',
        label:       'Thumbnail',
        emoji:       '🔲',
        type:        'text',
        maxLength:   512,
        required:    false,
        placeholder: 'https://... (URL HTTPS da miniatura)',
      },

      // ── Rodapé ────────────────────────────────────────────────────────────
      {
        key:         'rodape_texto',
        label:       'Rodapé — Texto',
        emoji:       '📌',
        type:        'text',
        maxLength:   2048,
        required:    false,
        placeholder: 'Ex: Ruby FY Bot',
      },
      {
        key:         'rodape_icone',
        label:       'Rodapé — Ícone',
        emoji:       '📎',
        type:        'text',
        maxLength:   512,
        required:    false,
        placeholder: 'https://... (URL HTTPS — requer Texto do Rodapé)',
      },

      // ── Timestamp ─────────────────────────────────────────────────────────
      {
        key:   'timestamp',
        label: 'Timestamp',
        emoji: '🕐',
        type:  'toggle',
      },

      // ── Canal de destino (Fase B — seletor nativo) ────────────────────────
      {
        key:   'canal_id',
        label: 'Canal de Destino',
        emoji: '📢',
        type:  'channel',
      },
    ],

    // ── Prévia ───────────────────────────────────────────────────────────────
    /**
     * Constrói uma prévia da embed com os dados atuais da sessão.
     * Chamado pelo editor quando o admin clica em "Prévia".
     *
     * @param {object} data - Dados atuais da sessão
     * @returns {{ embeds: EmbedBuilder[] }}
     */
    renderPreview(data) {
      const embed = buildEmbed(data, {
        footerText:  '👁️ Esta é uma prévia — nada foi publicado ainda',
        footerIcon:  undefined,
        forceTimestamp: false,
      });

      // Informa canal de destino na prévia, se selecionado
      if (data.canal_id) {
        embed.addFields({
          name:   '📢 Canal de destino',
          value:  `<#${data.canal_id}>`,
          inline: false,
        });
      }

      return { embeds: [embed] };
    },

    // ── Validação ────────────────────────────────────────────────────────────
    /**
     * Valida os dados da sessão antes de confirmar.
     * Síncrona — não faz chamadas de rede.
     *
     * @param {object} data - Dados atuais da sessão
     * @returns {{ ok: boolean, reason?: string }}
     */
    validate(data) {
      // Pelo menos título ou descrição deve estar preenchido
      const temConteudo = data.titulo?.trim() || data.descricao?.trim();
      if (!temConteudo) {
        return { ok: false, reason: 'Preencha pelo menos o **Título** ou a **Descrição**.' };
      }

      // Canal de destino é obrigatório
      if (!data.canal_id) {
        return { ok: false, reason: 'Selecione o **canal de destino** usando o botão "Canal de Destino".' };
      }

      // Validação de URL da embed
      if (data.url_embed?.trim() && !isValidUrl(data.url_embed.trim())) {
        return { ok: false, reason: 'A **URL da Embed** é inválida. Use o formato `https://exemplo.com`.' };
      }

      // Validação de cor HEX
      if (data.cor_hex?.trim() && !isValidHex(data.cor_hex.trim())) {
        return {
          ok:     false,
          reason: 'A **Cor HEX** é inválida. Use o formato `#RRGGBB` com exatamente 6 dígitos hexadecimais (ex: `#FF5733`).',
        };
      }

      // Validação de autor — URL e ícone requerem nome
      if ((data.autor_url?.trim() || data.autor_icone?.trim()) && !data.autor_nome?.trim()) {
        return {
          ok:     false,
          reason: 'O **Autor — URL** e o **Autor — Ícone** requerem que o **Autor — Nome** esteja preenchido.',
        };
      }

      // Validação de URL do autor
      if (data.autor_url?.trim() && !isValidUrl(data.autor_url.trim())) {
        return { ok: false, reason: 'O **Autor — URL** é inválido. Use o formato `https://exemplo.com`.' };
      }

      // Validação de ícone do autor (deve ser HTTPS)
      if (data.autor_icone?.trim() && !isValidHttpsUrl(data.autor_icone.trim())) {
        return { ok: false, reason: 'O **Autor — Ícone** deve ser uma URL HTTPS válida.' };
      }

      // Validação de imagem principal (deve ser HTTPS)
      if (data.imagem_url?.trim() && !isValidHttpsUrl(data.imagem_url.trim())) {
        return { ok: false, reason: 'A **Imagem Principal** deve ser uma URL HTTPS válida.' };
      }

      // Validação de thumbnail (deve ser HTTPS)
      if (data.thumbnail_url?.trim() && !isValidHttpsUrl(data.thumbnail_url.trim())) {
        return { ok: false, reason: 'A **Thumbnail** deve ser uma URL HTTPS válida.' };
      }

      // Validação de rodapé — ícone requer texto
      if (data.rodape_icone?.trim() && !data.rodape_texto?.trim()) {
        return {
          ok:     false,
          reason: 'O **Rodapé — Ícone** requer que o **Rodapé — Texto** esteja preenchido.',
        };
      }

      // Validação de ícone do rodapé (deve ser HTTPS)
      if (data.rodape_icone?.trim() && !isValidHttpsUrl(data.rodape_icone.trim())) {
        return { ok: false, reason: 'O **Rodapé — Ícone** deve ser uma URL HTTPS válida.' };
      }

      // Limite total de 6000 caracteres
      const totalChars = calcEmbedLength(data);
      if (totalChars > EMBED_CHAR_LIMIT) {
        return {
          ok:     false,
          reason: `A embed ultrapassa o limite de **${EMBED_CHAR_LIMIT} caracteres** (total atual: ${totalChars}). Reduza o conteúdo dos campos de texto.`,
        };
      }

      return { ok: true };
    },

    // ── Confirmação ──────────────────────────────────────────────────────────
    /**
     * Executado pelo editor após validação bem-sucedida.
     *
     * Ordem deliberada:
     *   1. Busca e valida o canal → sem efeito colateral
     *   2. Publica a embed no canal → se falhar, nada é salvo
     *   3. Salva configuração no banco → só após publicação bem-sucedida
     *
     * @param {import('discord.js').Interaction} interaction
     * @param {object} data - Cópia dos dados da sessão (spread pelo editor)
     */
    async onConfirm(interaction, data) {
      const { guildId } = interaction;
      const canalId = data.canal_id;

      // ── Passo 1: Busca e valida o canal ────────────────────────────────────
      let channel;
      try {
        channel = await interaction.client.channels.fetch(canalId);
      } catch {
        throw new Error(`Canal <#${canalId}> não encontrado. Verifique se o bot tem acesso ao servidor.`);
      }

      if (!channel?.isTextBased()) {
        throw new Error(`O canal <#${canalId}> não é um canal de texto. Selecione um canal de texto.`);
      }

      // ── Passo 2: Constrói e publica a embed ────────────────────────────────
      const embed = buildEmbed(data, {
        footerText:     data.rodape_texto?.trim() || `Configurado por ${interaction.user.username}`,
        footerIcon:     data.rodape_icone?.trim() || undefined,
        forceTimestamp: data.timestamp === true,
      });

      try {
        await channel.send({ embeds: [embed] });
      } catch (err) {
        logger.error(`[Embed] Falha ao publicar no canal ${canalId}:`, err);
        throw new Error(
          `Não foi possível publicar no canal <#${canalId}>. ` +
          'Verifique se o bot tem permissão para enviar mensagens neste canal.',
        );
      }

      // ── Passo 3: Salva configuração no banco (pós-publicação) ──────────────
      const campos = [
        'titulo', 'descricao', 'url_embed',
        'cor', 'cor_hex',
        'autor_nome', 'autor_url', 'autor_icone',
        'imagem_url', 'thumbnail_url',
        'rodape_texto', 'rodape_icone',
        'timestamp', 'canal_id',
      ];

      for (const campo of campos) {
        setSetting(guildId, 'embed', campo, data[campo] ?? null);
      }

      logger.info(`[Embed] Embed publicada e configuração salva — guild: ${guildId} | canal: ${canalId}`);
    },
  };
}

// ── Construtor interno da embed ───────────────────────────────────────────────

/**
 * Constrói um EmbedBuilder com todos os campos da Fase A + Fase B.
 *
 * @param {object} data
 * @param {{ footerText?: string, footerIcon?: string, forceTimestamp?: boolean }} opts
 * @returns {EmbedBuilder}
 */
function buildEmbed(data, { footerText, footerIcon, forceTimestamp } = {}) {
  // Prioridade de cor: cor_hex → cor predefinida → padrão do bot
  let corFinal = config.embedColor;
  if (data.cor_hex?.trim() && isValidHex(data.cor_hex.trim())) {
    corFinal = data.cor_hex.trim();
  } else if (data.cor) {
    corFinal = data.cor;
  }

  const embed = new EmbedBuilder().setColor(corFinal);

  // Título e URL
  if (data.titulo?.trim()) embed.setTitle(data.titulo.trim());
  if (data.url_embed?.trim()) embed.setURL(data.url_embed.trim());

  // Descrição
  if (data.descricao?.trim()) embed.setDescription(data.descricao.trim());

  // Autor
  if (data.autor_nome?.trim()) {
    embed.setAuthor({
      name:    data.autor_nome.trim(),
      url:     data.autor_url?.trim()    || undefined,
      iconURL: data.autor_icone?.trim()  || undefined,
    });
  }

  // Imagens
  if (data.imagem_url?.trim())    embed.setImage(data.imagem_url.trim());
  if (data.thumbnail_url?.trim()) embed.setThumbnail(data.thumbnail_url.trim());

  // Rodapé
  if (footerText) {
    embed.setFooter({
      text:    footerText,
      iconURL: footerIcon || undefined,
    });
  }

  // Timestamp
  if (forceTimestamp) embed.setTimestamp();

  return embed;
}
