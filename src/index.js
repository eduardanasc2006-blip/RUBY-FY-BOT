require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const {
  ActionRowBuilder,
  Client,
  Collection,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const rates = require('./config/rates');
const {
  robuxToReais,
  reaisToRobux,
  gamepassPrice,
  formatBRL,
  formatRobux,
} = require('./utils/robuxConverter');

const PREFIX = process.env.PREFIX || '!';

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN não definido. Crie um arquivo .env baseado no .env.example.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  // Necessário para receber mensagens e interações em DM (canal parcial)
  partials: [Partials.Channel],
});

// Slash commands (/)
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// Comandos de prefixo (!)
client.prefixCommands = new Collection();
const prefixPath = path.join(__dirname, 'prefixCommands');
for (const file of fs.readdirSync(prefixPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(prefixPath, file));
  client.prefixCommands.set(command.name, command);
  for (const alias of command.aliases || []) {
    client.prefixCommands.set(alias, command);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// Responde slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;


  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const mensagem = { content: '❌ Ocorreu um erro ao executar este comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(mensagem);
    } else {
      await interaction.reply(mensagem);
    }
  }
});

// ----- Painel de conversão: botões abrem modais, respostas sempre privadas -----

const MODAIS = {
  robux: { titulo: 'Robux para Reais', label: 'Quantidade de Robux', placeholder: '500' },
  reais: { titulo: 'Reais para Robux', label: 'Valor em reais (R$)', placeholder: '10,00' },
  gamepass: { titulo: 'Calcular Game Pass', label: 'Robux que deseja receber', placeholder: '1000' },
};

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith('panel:')) {
      const acao = interaction.customId.split(':')[1];

    if (acao === 'taxas') {
      const taxa = Math.round(rates.GAMEPASS_FEE * 100);
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('Taxas atuais')
        .addFields(
          {
            name: '100 a 999 Robux',
            value: `**${formatBRL(rates.TIER1_PRICE_PER_100)}** a cada 100 Robux`,
          },
          {
            name: '1.000 Robux ou mais',
            value: `**${formatBRL(rates.TIER2_PRICE_PER_1000)}** a cada 1.000 Robux`,
          },
          { name: 'Game Pass', value: `Roblox desconta **${taxa}%** (você recebe ${100 - taxa}%)` }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const config = MODAIS[acao];
    if (!config) return;

    const modal = new ModalBuilder()
      .setCustomId(`modal:${acao}`)
      .setTitle(config.titulo)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('valor')
            .setLabel(config.label)
            .setPlaceholder(config.placeholder)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal:')) {
    const acao = interaction.customId.split(':')[1];
    const bruto = interaction.fields.getTextInputValue('valor').trim();
    const numero = parseFloat(bruto.replace(/\./g, '').replace(',', '.'));
    const respostaPrivada = (payload) => interaction.reply({ ...payload, ephemeral: true });

    if (isNaN(numero) || numero <= 0) {
      return respostaPrivada({ content: '❌ Valor inválido. Tente novamente com um número, ex: `500` ou `10,50`.' });
    }

    if (acao === 'robux') {
      const robux = Math.floor(numero);
      if (robux < rates.MIN_ROBUX) {
        return respostaPrivada({ content: `❌ O valor mínimo é **${formatRobux(rates.MIN_ROBUX)} Robux**.` });
      }
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('Conversão de Robux')
        .setDescription(`**${formatRobux(robux)} Robux**\n= **${formatBRL(robuxToReais(robux))}**`);
      return respostaPrivada({ embeds: [embed] });
    }

    if (acao === 'reais') {
      if (numero < rates.TIER1_PRICE_PER_100) {
        return respostaPrivada({ content: `❌ O valor mínimo é **${formatBRL(rates.TIER1_PRICE_PER_100)}**.` });
      }
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('Conversão de Reais')
        .setDescription(`**${formatBRL(numero)}**\n= **${formatRobux(reaisToRobux(numero))} Robux**`);
      return respostaPrivada({ embeds: [embed] });
    }

    if (acao === 'gamepass') {
      const robux = Math.floor(numero);
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('Cálculo de Game Pass')
        .setDescription(
          `Para receber **${formatRobux(robux)} Robux**, crie o Game Pass por\n**${formatRobux(gamepassPrice(robux))} Robux**`
        )
        .setFooter({ text: 'O Roblox desconta 30% • você recebe 70%' });
      return respostaPrivada({ embeds: [embed] });
    }
    }
  } catch (error) {
    console.error('[Painel de conversão] Erro na interação:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true });
      }
    } catch {}
  }
});

// ----- Painel de configuração de taxas (somente admin, sempre privado) -----

const { buildConfigPanel } = require('./utils/configPanel');
const { refreshSavedPanel } = require('./utils/panelStore');
const { isAdmin } = require('./prefixCommands/settaxa');

const MODAIS_CFG = {
  tier1: {
    titulo: 'Alterar Faixa 1',
    label: 'R$ a cada 100 Robux (ex: 3,50)',
    placeholder: '3,50',
    chave: 'TIER1_PRICE_PER_100',
    resumo: (v) => `Faixa 1 (100 a 999 Robux) → **${formatBRL(v)}** a cada 100 Robux`,
  },
  tier2: {
    titulo: 'Alterar Faixa 2',
    label: 'R$ a cada 1.000 Robux (ex: 34,99)',
    placeholder: '34,99',
    chave: 'TIER2_PRICE_PER_1000',
    resumo: (v) => `Faixa 2 (1.000+ Robux) → **${formatBRL(v)}** a cada 1.000 Robux`,
  },
  gamepass: {
    titulo: 'Alterar Game Pass',
    label: 'Desconto do Roblox em % (ex: 30)',
    placeholder: '30',
    chave: 'GAMEPASS_FEE',
    porcentagem: true,
    resumo: (v) => `Game Pass → **${Math.round(v * 100)}%** de desconto`,
  },
};

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith('cfg:')) {
      const acao = interaction.customId.split(':')[1];

      if (!isAdmin(interaction.member, interaction.user.id)) {
        return interaction.reply({
          content: '🔒 Somente administradores podem configurar as taxas.',
          ephemeral: true,
        });
      }

      if (acao === 'refresh') {
        return await interaction.update(buildConfigPanel());
      }

      if (acao === 'close') {
        return await interaction.update({ content: '✅ Painel de configuração fechado.', embeds: [], components: [] });
      }

      const config = MODAIS_CFG[acao];
      if (!config) return;

      const modal = new ModalBuilder()
        .setCustomId(`cfgmodal:${acao}`)
        .setTitle(config.titulo)
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('valor')
              .setLabel(config.label)
              .setPlaceholder(config.placeholder)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

      return await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('cfgmodal:')) {
      const acao = interaction.customId.split(':')[1];
      const config = MODAIS_CFG[acao];
      if (!config) return;

      if (!isAdmin(interaction.member, interaction.user.id)) {
        return interaction.reply({
          content: '🔒 Somente administradores podem configurar as taxas.',
          ephemeral: true,
        });
      }

      const bruto = interaction.fields.getTextInputValue('valor').trim();
      let numero = parseFloat(bruto.replace(/\./g, '').replace(',', '.'));

      if (isNaN(numero) || numero <= 0) {
        return interaction.reply({
          content: '❌ Valor inválido. Tente novamente com um número, ex: `3,50` ou `30`.',
          ephemeral: true,
        });
      }

      if (config.porcentagem) {
        if (numero >= 100) {
          return interaction.reply({ content: '❌ A porcentagem deve ser menor que 100.', ephemeral: true });
        }
        numero = numero / 100;
      }

      rates.setOverride(config.chave, numero);
      await refreshSavedPanel(client);

      // Atualiza o proprio painel de taxas com os novos valores
      return interaction.update(buildConfigPanel());
    }
  } catch (error) {
    console.error('[Painel de taxas] Erro na interação:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true });
      }
    } catch {}
  }
});

// ----- Estoque: navegação pública e painel admin -----

const estoqueDb = require('./utils/estoque');
const estoquePanel = require('./utils/estoquePanel');

client.on('interactionCreate', async (interaction) => {
  try {
    // ----- público: est:cat:<id> e est:voltar -----
    if (interaction.isButton() && interaction.customId.startsWith('est:')) {
      const [, acao, catId] = interaction.customId.split(':');
      if (acao === 'voltar') return interaction.update(estoquePanel.publicoCategorias());
      if (acao === 'cat') return interaction.update(estoquePanel.publicoProdutos(catId));
      return;
    }

    // ----- admin: estadm:* -----
    if (interaction.isButton() && interaction.customId.startsWith('estadm:')) {
      if (!isAdmin(interaction.member, interaction.user.id)) {
        return interaction.reply({ content: '🔒 Somente administradores.', ephemeral: true });
      }
      const partes = interaction.customId.split(':');
      const acao = partes[1];

      if (acao === 'menu') return interaction.update(estoquePanel.adminMenu());
      if (acao === 'lista') return interaction.update(estoquePanel.adminLista());

      if (acao === 'addcat') {
        const modal = new ModalBuilder().setCustomId('estmodal:addcat').setTitle('Nova categoria').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('nome').setLabel('Nome da categoria (ex: MM2)')
              .setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      if (acao === 'addprod') return interaction.update(estoquePanel.adminEscolherCategoria('addprod2'));
      if (acao === 'addprod2') {
        const catId = partes[2];
        const modal = new ModalBuilder().setCustomId(`estmodal:addprod:${catId}`).setTitle('Novo produto').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('nome').setLabel('Nome do produto').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('valor').setLabel('Valor em R$ (ex: 15,00)').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('qtd').setLabel('Quantidade (deixe vazio = sem controle)').setStyle(TextInputStyle.Short).setRequired(false)
          )
        );
        return interaction.showModal(modal);
      }

      if (acao === 'qtd') return interaction.update(estoquePanel.adminEscolherCategoria('qtd2'));
      if (acao === 'toggle') return interaction.update(estoquePanel.adminEscolherCategoria('toggle2'));
      if (acao === 'remover') return interaction.update(estoquePanel.adminEscolherCategoria('remover2'));

      if (acao === 'qtd2') return interaction.update(estoquePanel.adminEscolherProduto('qtd3', partes[2]));
      if (acao === 'toggle2') return interaction.update(estoquePanel.adminEscolherProduto('toggle3', partes[2]));
      if (acao === 'remover2') return interaction.update(estoquePanel.adminEscolherProduto('remover3', partes[2]));

      if (acao === 'qtd3') {
        const [, , catId, prodId] = partes;
        const modal = new ModalBuilder().setCustomId(`estmodal:qtd:${catId}:${prodId}`).setTitle('Alterar quantidade').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('qtd').setLabel('Nova quantidade').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }
      if (acao === 'toggle3') {
        const [, , catId, prodId] = partes;
        const p = estoqueDb.toggleAtivo(catId, prodId);
        if (!p) return interaction.reply({ content: '❌ Produto não encontrado.', ephemeral: true });
        const s = estoqueDb.status(p);
        return interaction.update({
          content: `✅ **${p.nome}** agora está: ${s.emoji} ${s.texto}`,
          embeds: [],
          components: [new ActionRowBuilder().addComponents(
            new (require('discord.js').ButtonBuilder)().setCustomId('estadm:menu').setLabel('⬅️ Voltar ao menu').setStyle(2)
          )],
        });
      }
      if (acao === 'remover3') {
        const [, , catId, prodId] = partes;
        const ok = estoqueDb.removeProduto(catId, prodId);
        return interaction.update({
          content: ok ? '🗑️ Produto removido.' : '❌ Produto não encontrado.',
          embeds: [],
          components: [new ActionRowBuilder().addComponents(
            new (require('discord.js').ButtonBuilder)().setCustomId('estadm:menu').setLabel('⬅️ Voltar ao menu').setStyle(2)
          )],
        });
      }
      return;
    }

    // ----- modais do estoque -----
    if (interaction.isModalSubmit() && interaction.customId.startsWith('estmodal:')) {
      if (!isAdmin(interaction.member, interaction.user.id)) {
        return interaction.reply({ content: '🔒 Somente administradores.', ephemeral: true });
      }
      const partes = interaction.customId.split(':');
      const acao = partes[1];

      // Edita o proprio painel com o resultado, em vez de criar mensagem nova
      const voltarMenu = (texto) =>
        interaction.update({
          content: texto,
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('estadm:menu').setLabel('⬅️ Voltar ao menu').setStyle(ButtonStyle.Secondary)
            ),
          ],
        });

      if (acao === 'addcat') {
        const nome = interaction.fields.getTextInputValue('nome').trim();
        const cat = estoqueDb.addCategoria(nome);
        return voltarMenu(cat ? `✅ Categoria **${nome}** criada.` : `❌ A categoria **${nome}** já existe.`);
      }

      if (acao === 'addprod') {
        const catId = partes[2];
        const nome = interaction.fields.getTextInputValue('nome').trim();
        const valor = parseFloat(interaction.fields.getTextInputValue('valor').trim().replace(/\./g, '').replace(',', '.'));
        const qtdBruta = (interaction.fields.getTextInputValue('qtd') || '').trim();
        const controlarQtd = qtdBruta !== '';
        const quantidade = controlarQtd ? parseInt(qtdBruta, 10) : null;

        if (isNaN(valor) || valor <= 0) {
          return voltarMenu('❌ Valor inválido.');
        }
        if (controlarQtd && (isNaN(quantidade) || quantidade < 0)) {
          return voltarMenu('❌ Quantidade inválida.');
        }

        const p = estoqueDb.addProduto(catId, { nome, valor, controlarQtd, quantidade });
        return voltarMenu(
          p
            ? `✅ Produto **${nome}** adicionado por ${formatBRL(valor)}${controlarQtd ? ` (estoque: ${quantidade})` : ' (sem controle de quantidade)'}.`
            : '❌ Já existe um produto com esse nome nessa categoria.'
        );
      }

      if (acao === 'qtd') {
        const [, , catId, prodId] = partes;
        const qtd = parseInt(interaction.fields.getTextInputValue('qtd').trim(), 10);
        if (isNaN(qtd) || qtd < 0) {
          return voltarMenu('❌ Quantidade inválida.');
        }
        const p = estoqueDb.setQuantidade(catId, prodId, qtd);
        return voltarMenu(
          p ? `✅ **${p.nome}** agora tem **${p.quantidade}** em estoque.` : '❌ Produto não encontrado ou sem controle de quantidade.'
        );
      }
      return;
    }
  } catch (error) {
    console.error('[Estoque] Erro na interação:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true });
      }
    } catch {}
  }
});

// Responde comandos de prefixo
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;


  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  const command = client.prefixCommands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(error);
    await message.reply('❌ Ocorreu um erro ao executar este comando.');
  }
});

client.login(process.env.DISCORD_TOKEN);
