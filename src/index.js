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
    GatewayIntentBits.MessageContent,
  ],
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
  robux: { titulo: '🎮 Robux → R$', label: 'Quantidade de Robux', placeholder: '500' },
  reais: { titulo: '💵 R$ → Robux', label: 'Valor em reais (R$)', placeholder: '10,00' },
  gamepass: { titulo: '🎟️ Game Pass', label: 'Robux que deseja receber', placeholder: '1000' },
};

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton() && interaction.customId.startsWith('panel:')) {
    const acao = interaction.customId.split(':')[1];

    if (acao === 'taxas') {
      const taxa = Math.round(rates.GAMEPASS_FEE * 100);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📊 Taxas atuais')
        .addFields(
          {
            name: `${formatRobux(rates.MIN_ROBUX)}–${formatRobux(rates.TIER1_MAX_ROBUX)} Robux`,
            value: `${formatBRL(rates.TIER1_PRICE_PER_100)} / 100 Robux`,
          },
          {
            name: `${formatRobux(rates.TIER1_MAX_ROBUX + 1)}+ Robux`,
            value: `${formatBRL(rates.TIER2_PRICE_PER_1000)} / 1.000 Robux`,
          },
          { name: '🎮 Game Pass', value: `Roblox desconta ${taxa}% — você recebe ${100 - taxa}%` }
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
        .setColor(0x9b59b6)
        .setTitle('💜 CONVERSÃO')
        .setDescription(`🎮 ${formatRobux(robux)} Robux\n💵 **${formatBRL(robuxToReais(robux))}**`);
      return respostaPrivada({ embeds: [embed] });
    }

    if (acao === 'reais') {
      if (numero < rates.TIER1_PRICE_PER_100) {
        return respostaPrivada({ content: `❌ O valor mínimo é **${formatBRL(rates.TIER1_PRICE_PER_100)}**.` });
      }
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('💜 CONVERSÃO')
        .setDescription(`💵 ${formatBRL(numero)}\n🎮 **${formatRobux(reaisToRobux(numero))} Robux**`);
      return respostaPrivada({ embeds: [embed] });
    }

    if (acao === 'gamepass') {
      const robux = Math.floor(numero);
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('💜 CONVERSÃO')
        .setDescription(
          `🎟️ Game Pass de **${formatRobux(gamepassPrice(robux))} Robux**\n🎮 aproximadamente **${formatRobux(robux)} Robux** recebidos`
        )
        .setFooter({ text: 'Roblox desconta 30% — você recebe 70%' });
      return respostaPrivada({ embeds: [embed] });
    }
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
