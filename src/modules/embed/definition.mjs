/**
 * Módulo de Embeds — Definição do Editor.
 *
 * Fornece a `definition` compatível com openEditor() do Editor Visual Universal.
 * Este arquivo contém toda a lógica de negócio do módulo de embeds:
 * campos, validação, prévia e confirmação.
 *
 * O Editor Visual (src/modules/editor/) não é alterado por este módulo.
 */

import { EmbedBuilder } from 'discord.js';
import { setSetting } from '../../database/repositories/GuildConfig.mjs';
import { config } from '../../config/bot.mjs';
import { logger } from '../../utils/logger.mjs';

// ── Constantes ────────────────────────────────────────────────────────────────

/** Comprimento mínimo de um Discord Snowflake válido */
const SNOWFLAKE_MIN_LENGTH = 17;

/** Comprimento máximo de um Discord Snowflake válido */
const SNOWFLAKE_MAX_LENGTH = 20;

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
        key:     'cor',
        label:   'Cor',
        emoji:   '🎨',
        type:    'color',
        options: COR_OPTIONS,
      },
      {
        key:         'canal_id',
        label:       'Canal (ID)',
        emoji:       '📢',
        type:        'text',
        maxLength:   SNOWFLAKE_MAX_LENGTH,
        placeholder: 'Cole o ID do canal aqui',
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
      const embed = new EmbedBuilder()
        .setColor(data.cor ?? config.embedColor)
        .setTitle(data.titulo?.trim()    || '(sem título)')
        .setDescription(data.descricao?.trim() || '(sem descrição)')
        .setFooter({ text: '👁️ Esta é uma prévia — nada foi publicado ainda' });

      return { embeds: [embed] };
    },

    // ── Validação ────────────────────────────────────────────────────────────
    /**
     * Valida os dados da sessão antes de confirmar.
     * Síncrona — não faz chamadas de rede.
     * O resultado de `reason` é exibido diretamente ao admin pelo editor.
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
      const canalId = data.canal_id?.trim();
      if (!canalId) {
        return { ok: false, reason: 'Informe o **ID do canal** de destino.' };
      }

      // canal_id deve ser numérico (Discord Snowflake)
      if (!/^\d+$/.test(canalId)) {
        return {
          ok:     false,
          reason: 'O ID do canal deve conter **apenas números**. Ative o Modo Desenvolvedor nas configurações do Discord para copiar IDs.',
        };
      }

      // Snowflake tem entre 17 e 20 dígitos
      if (canalId.length < SNOWFLAKE_MIN_LENGTH || canalId.length > SNOWFLAKE_MAX_LENGTH) {
        return { ok: false, reason: 'O ID do canal parece inválido. Verifique se copiou corretamente.' };
      }

      return { ok: true };
    },

    // ── Confirmação ──────────────────────────────────────────────────────────
    /**
     * Executado pelo editor após validação bem-sucedida.
     *
     * Ordem deliberada (Etapa 5 — decisão de arquitetura):
     *   1. Busca e valida o canal → sem efeito colateral
     *   2. Publica a embed no canal → se falhar, nada é salvo
     *   3. Salva configuração no banco → só após publicação bem-sucedida
     *
     * Isso garante que uma configuração no banco sempre corresponde a
     * uma embed que foi publicada com sucesso pelo menos uma vez.
     * Se este método lançar erro, o editor mantém a sessão aberta
     * para o admin corrigir e tentar novamente.
     *
     * @param {import('discord.js').Interaction} interaction
     * @param {object} data - Cópia dos dados da sessão (spread pelo editor)
     */
    async onConfirm(interaction, data) {
      const { guildId } = interaction;
      const canalId = data.canal_id.trim();

      // ── Passo 1: Busca e valida o canal ────────────────────────────────────
      let channel;
      try {
        channel = await interaction.client.channels.fetch(canalId);
      } catch {
        throw new Error(`Canal ${canalId} não encontrado. Verifique o ID e se o bot tem acesso ao servidor.`);
      }

      if (!channel?.isTextBased()) {
        throw new Error(`O canal <#${canalId}> não é um canal de texto. Informe o ID de um canal de texto.`);
      }

      // ── Passo 2: Constrói e publica a embed ────────────────────────────────
      const embed = new EmbedBuilder()
        .setColor(data.cor ?? config.embedColor)
        .setFooter({ text: `Configurado por ${interaction.user.username}` })
        .setTimestamp();

      if (data.titulo?.trim())    embed.setTitle(data.titulo.trim());
      if (data.descricao?.trim()) embed.setDescription(data.descricao.trim());

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
      setSetting(guildId, 'embed', 'titulo',    data.titulo    ?? null);
      setSetting(guildId, 'embed', 'descricao', data.descricao ?? null);
      setSetting(guildId, 'embed', 'cor',       data.cor       ?? null);
      setSetting(guildId, 'embed', 'canal_id',  canalId);

      logger.info(`[Embed] Embed publicada e configuração salva — guild: ${guildId} | canal: ${canalId}`);
    },
  };
}
