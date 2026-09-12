const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { comandoPode } = require('../utils/permissions');
const proofStore = require('../utils/proofStore');
const { buildProofModal } = require('../utils/proofModal');

module.exports = {
  name: 'proof',
  description: 'Posta um comprovante (proof) — anexe as imagens e responda o botão para preencher os dados',
  usage: '!proof  — anexe as imagens na mensagem',

  async execute(message, args) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'comprar')) {
      return message.reply('🔒 Somente administradores ou equipe autorizada podem usar este comando.');
    }

    const anexos = [...message.attachments.values()].filter((a) => a.contentType?.startsWith('image/'));
    if (!anexos.length) {
      return message.reply(
        '❌ Anexe pelo menos 1 imagem na mensagem do `!proof`.\n' +
        'Depois clique no botão **✍️ Preencher dados** para informar número, cliente, canal, etc.'
      );
    }
    // Limita ao mesmo máximo do slash (5 imagens)
    const imagens = anexos.slice(0, 5);

    // Pré-preenche o modal com argumentos opcionais:
    // !proof 26 | Testando | 3,00
    const partes = (args.join(' ').split('|') || []).map((s) => s.trim());
    const extras = {
      numero: partes[0] && /^\d+$/.test(partes[0]) ? partes[0] : '',
      produto: partes[1] || '',
      valor: partes[2] || '',
    };

    proofStore.salvarRascunho(message.author.id, {
      urls: imagens.map((a) => a.url),
      nomes: imagens.map((a) => a.name),
      canalPadrao: proofStore.obter(message.guildId),
    });

    const canalAtual = proofStore.obter(message.guildId);
    const embed = new EmbedBuilder()
      .setColor(0xbeb6ff)
      .setTitle('📸 Proof — imagens recebidas')
      .setDescription(
        'Recebi **' + imagens.length + ' imagem(ns)**.\n' +
        'Clique no botão abaixo para preencher os dados do proof.' +
        (canalAtual ? '\n📥 Vai postar em <#' + canalAtual + '>. Você pode mudar o canal no botão.' : '')
      );

    const botao = new ButtonBuilder()
      .setCustomId('proofiniciar')
      .setLabel('✍️ Preencher dados')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝');

    return message.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(botao)],
      allowedMentions: { repliedUser: false },
    });
  },
};