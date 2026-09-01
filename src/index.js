require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');

// Garante que apenas UMA instância do bot rode por vez (evita duplicação de
// respostas quando o host/Discloud sobe o processo duas vezes, ex.: MAIN +
// START apontando para o mesmo arquivo, ou restart sem matar o processo antigo).
const LOCK_FILE = path.join(__dirname, '..', '.bot.lock');
function tentarObterLock() {
  try {
    const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8'));
    if (pid > 0) {
      try {
        process.kill(pid, 0); // só checa se o processo existe, sem matar
        console.error(`⚠️ Outra instância do bot já está rodando (PID ${pid}). Encerrando para evitar respostas duplicadas.`);
        return false;
      } catch {
        // PID antigo morto → pode assumir o lock
      }
    }
  } catch {}
  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid));
    return true;
  } catch (error) {
    console.error(`⚠️ Não foi possível criar o lock file (${error?.message || error}). Continuando mesmo assim.`);
    return true;
  }
}
if (!tentarObterLock()) {
  process.exit(0);
}
process.on('exit', () => {
  try { fs.unlinkSync(LOCK_FILE); } catch {}
});
process.on('SIGINT', () => {
  try { fs.unlinkSync(LOCK_FILE); } catch {}
  process.exit(0);
});
process.on('SIGTERM', () => {
  try { fs.unlinkSync(LOCK_FILE); } catch {}
  process.exit(0);
});
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Collection,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  MessageFlags,
  PermissionFlagsBits,
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  // Necessário para receber mensagens e interações em DM (canal parcial)
  partials: [Partials.Channel],
});

// O bot registra um listener de interactionCreate por feature (painéis, lock/unlock,
// mensagem, perm, etc.) — mais do que o limite padrão de 10 do Node》。
// Aumenta o limite para evitar o MaxListenersExceededWarning no boot。
client.setMaxListeners(25);

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

// Status do bot com a taxa atual (atualiza sozinho quando muda via !settaxa/!configtaxa)
function atualizarStatus() {
  client.user.setActivity(
    `☁️ Conversor de valores & estoque • criado por Finix.Yin • use !ajuda`,
    { type: 3 } // 3 = Watching
  );
}

client.once(Events.ClientReady, () => {
  atualizarStatus();
  console.log(`✅ Bot online como ${client.user.tag}`);

});

// Evita que o bot morra por erros não tratados (ex: interação expirada após restart)
process.on('unhandledRejection', (error) => {
  console.error('[Erro não tratado]', error?.code || error?.message || error);
});
client.on('error', (error) => {
  console.error('[Erro do client]', error?.message || error);
});

// Responde slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return; // Comandos personalizados agora sao prefixo (!) e nao slash (/)

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const mensagem = { content: '❌ Ocorreu um erro ao executar este comando.', flags: MessageFlags.Ephemeral };
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
        .setColor(0xbeb6ff)
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
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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
    const respostaPrivada = (payload) => interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });

    if (isNaN(numero) || numero <= 0) {
      return respostaPrivada({ content: '❌ Valor inválido. Tente novamente com um número, ex: `500` ou `10,50`.' });
    }

    if (acao === 'robux') {
      const robux = Math.floor(numero);
      if (robux < rates.MIN_ROBUX) {
        return respostaPrivada({ content: `❌ O valor mínimo é **${formatRobux(rates.MIN_ROBUX)} Robux**.` });
      }
      const embed = new EmbedBuilder()
        .setColor(0xbeb6ff)
        .setTitle('Conversão de Robux')
        .setDescription(`**${formatRobux(robux)} Robux**\n= **${formatBRL(robuxToReais(robux))}**`);
      return respostaPrivada({ embeds: [embed] });
    }

    if (acao === 'reais') {
      if (numero < rates.TIER1_PRICE_PER_100) {
        return respostaPrivada({ content: `❌ O valor mínimo é **${formatBRL(rates.TIER1_PRICE_PER_100)}**.` });
      }
      const embed = new EmbedBuilder()
        .setColor(0xbeb6ff)
        .setTitle('Conversão de Reais')
        .setDescription(`**${formatBRL(numero)}**\n= **${formatRobux(reaisToRobux(numero))} Robux**`);
      return respostaPrivada({ embeds: [embed] });
    }

    if (acao === 'gamepass') {
      const robux = Math.floor(numero);
      const embed = new EmbedBuilder()
        .setColor(0xbeb6ff)
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
        await interaction.reply({ content: '❌ Ocorreu um erro. Tente novamente.', flags: MessageFlags.Ephemeral });
      }
    } catch {}
  }
});

// ----- Painel de configuração de taxas (somente admin, sempre privado) -----

const { buildConfigPanel } = require('./utils/configPanel');
const { publishOrUpdatePanel, refreshSavedPanel } = require('./utils/panelStore');
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

      if (!permitido(interaction)) {
        return interaction.reply({
          content: '🔒 Somente administradores podem configurar as taxas.',
          flags: MessageFlags.Ephemeral,
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

      if (!permitido(interaction)) {
        return interaction.reply({
          content: '🔒 Somente administradores podem configurar as taxas.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const bruto = interaction.fields.getTextInputValue('valor').trim();
      let numero = parseFloat(bruto.replace(/\./g, '').replace(',', '.'));

      if (isNaN(numero) || numero <= 0) {
        return interaction.reply({
          content: '❌ Valor inválido. Tente novamente com um número, ex: `3,50` ou `30`.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (config.porcentagem) {
        if (numero >= 100) {
          return interaction.reply({ content: '❌ A porcentagem deve ser menor que 100.', flags: MessageFlags.Ephemeral });
        }
        numero = numero / 100;
      }

      rates.setOverride(config.chave, numero);
      atualizarStatus();
      await refreshSavedPanel(client);

      // Atualiza o proprio painel de taxas com os novos valores
      return interaction.update(buildConfigPanel());
    }
  } catch (error) {
    console.error('[Painel de taxas] Erro na interação:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro. Tente novamente.', flags: MessageFlags.Ephemeral });
      }
    } catch {}
  }
});

// ----- Menu de ajuda: botões de navegação -----

const { buildAjuda } = require('./utils/ajudaPanel');

client.on('interactionCreate', async (interaction) => {
  try {
    // ----- Menu de ajuda: botões de navegação -----
    if (interaction.isButton() && interaction.customId.startsWith('ajuda:')) {
      const partes = interaction.customId.split(':');
      // formatos: ajuda:cat:<pagina> | ajuda:nav:prev:<pagina> | ajuda:nav:home:<pagina>
      const pagina = partes.length >= 3 ? partes[partes.length - 1] : partes[1];
      const admin = interaction.guild ? permitido(interaction) : false;
      const pag = (pagina === 'admin' || pagina === 'painel' || pagina === 'personalizados') && !admin ? 'inicio' : pagina;
      return interaction.update(buildAjuda(pag, admin));
    }
  } catch (error) {
    console.error('[Ajuda] Erro na interação:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro. Tente novamente.', flags: MessageFlags.Ephemeral });
      }
    } catch {}
  }
});

// ----- Estoque: navegação pública e painel admin -----

const estoqueDb = require('./utils/estoque');
const estoquePanel = require('./utils/estoquePanel');
const { publicarOuAtualizar, refreshPainelEstoque } = require('./utils/estoquePanelStore');
const { montarConfirmacao } = require('./utils/confirm');
const painelCategoria = require('./prefixCommands/painelcategoria');
const painelCenter = require('./utils/painelCenter');
const { buildPainelCentral } = painelCenter;
const { avisar } = require('./utils/avisos');

client.on('interactionCreate', async (interaction) => {
  try {
    // ----- painel fixo de estoque: estfixo:cat:<id> e estfixo:voltar -----
    // Clique no PAINEL PUBLICO -> responde ephemeral (so quem clicou ve)
    // Clique DENTRO da resposta ephemeral -> EDITA a mesma mensagem
    if (interaction.isButton() && interaction.customId.startsWith('estfixo:')) {
      const [, acao, catId] = interaction.customId.split(':');
      const dentroDeEphemeral = interaction.message.flags.has('Ephemeral');

      const payload =
        acao === 'voltar'
          ? estoquePanel.publicoCategorias()
          : acao === 'cat'
            ? estoquePanel.publicoProdutos(catId)
            : null;
      if (!payload) return;

      if (dentroDeEphemeral) {
        return interaction.update(payload); // edita a mesma mensagem privada
      }
      return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }); // primeira resposta privada
    }

    // ----- gerenciamento central de paineis (!painel / /painel) -----
    if (interaction.isButton() && interaction.customId.startsWith('painelcenter:')) {
      if (!interaction.guild || !permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      const alvo = interaction.customId.split(':')[1];

      if (alvo === 'conversao' || alvo === 'estoque') {
        // Escolha de canal antes de publicar (sistema comum de seleção de canal).
        const selId = `painelcenter:selcanal:${alvo}`;
        const canais = linhaSelecaoCanalDe(interaction.guild, selId, interaction.channel.id, `📣 Onde publicar o painel de ${alvo}?`);
        if (!canais.canais.length) {
          return interaction.reply({ content: '❌ Não encontrei nenhum canal de texto em que eu possa publicar.', flags: MessageFlags.Ephemeral });
        }
        return interaction.update({
          content: `🗂️ **Onde deseja publicar o painel de ${alvo === 'conversao' ? 'conversão' : 'estoque'}?**\n_Selecione um canal ou use **📌 Canal atual**._`,
          embeds: [],
          components: [canais.row, canais.botoes],
        });
      }

      if (alvo === 'criarcategoria') {
        const selecao = painelCategoria.construirPainelSelecao();
        await interaction.update({ embeds: selecao.embeds, components: selecao.components });
        return;
      }

      if (alvo === 'cat') {
        const catId = interaction.customId.split(':')[2];
        const embed = painelCategoria.buildCategoria(catId);
        if (!embed) {
          return interaction.reply({ content: `❌ Categoria **${catId}** não encontrada.`, flags: MessageFlags.Ephemeral });
        }
        const msg = await interaction.channel.send({ embeds: [embed] });
        painelCategoria.salvar(msg.id, catId, interaction.channel.id);
        await interaction.update(buildPainelCentral());
        return interaction.followUp({
          content: `✅ Painel da categoria **${catId}** publicado no canal atual.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // ----- remover painel fixo (com confirmação) -----
      if (alvo === 'remconversao' || alvo === 'remestoque') {
        const nome = alvo === 'remconversao' ? 'de conversão' : 'de estoque';
        return interaction.update(
          montarConfirmacao(
            `🗑️ **Remover o painel fixo ${nome}?**\n\n_A mensagem fixada será apagada e o registro removido._`,
            `painelcenter:${alvo}-confirm`,
            'painelcenter:remcancel'
          )
        );
      }
      if (alvo === 'remcancel') {
        return interaction.update(buildPainelCentral());
      }
      if (alvo === 'remconversao-confirm' || alvo === 'remestoque-confirm') {
        const ref = alvo.startsWith('remconversao') ? painelCenter.readConversao() : painelCenter.readEstoque();
        if (ref) {
          try {
            const canal = await client.channels.fetch(ref.channelId);
            const msg = await canal.messages.fetch(ref.messageId);
            await msg.delete().catch(() => {});
          } catch {}
        }
        if (alvo.startsWith('remconversao')) painelCenter.salvarConversao(null);
        else painelCenter.salvarEstoque(null);
        await interaction.update(buildPainelCentral());
        return interaction.followUp({
          content: `✅ Painel fixo ${alvo.startsWith('remconversao') ? 'de conversão' : 'de estoque'} removido.`,
          flags: MessageFlags.Ephemeral,
        });
      }
      if (alvo === 'remcategoria') {
        const [, , msgId, catId] = interaction.customId.split(':');
        return interaction.update(
          montarConfirmacao(
            `🗑️ **Remover o painel fixo da categoria **${catId}**?**\n\n_A mensagem fixada será apagada e o registro removido._`,
            `painelcenter:remcategoria-confirm:${msgId}:${catId}`,
            'painelcenter:remcancel'
          )
        );
      }
      if (alvo === 'remcategoria-confirm') {
        const [, , msgId, catId] = interaction.customId.split(':');
        const cats = painelCenter.readCategorias();
        const info = cats[msgId];
        if (info && typeof info === 'object' && info.canal) {
          try {
            const canal = await client.channels.fetch(info.canal || info.channelId);
            const msg = await canal.messages.fetch(msgId);
            await msg.delete().catch(() => {});
          } catch {}
        }
        delete cats[msgId];
        const fsX = require('node:fs');
        const pathX = require('node:path');
        const CATEGORIA_FILE = pathX.join(__dirname, '..', 'data', 'painel_categoria.json');
        fsX.mkdirSync(pathX.dirname(CATEGORIA_FILE), { recursive: true });
        fsX.writeFileSync(CATEGORIA_FILE, JSON.stringify(cats, null, 2));
        await interaction.update(buildPainelCentral());
        return interaction.followUp({
          content: `✅ Painel fixo da categoria **${catId}** removido.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      return interaction.reply({ content: '❌ Ação desconhecida.', flags: MessageFlags.Ephemeral });
    }

    // ----- escolha de canal do gerenciador central de paineis -----
    if ((interaction.isStringSelectMenu() || interaction.isButton()) && interaction.customId.startsWith('painelcenter:selcanal:')) {
      if (!interaction.guild || !permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      const partes = interaction.customId.split(':');
      const tipo = partes[2];

      if (interaction.isButton() && partes[3] === 'cancelar') {
        return interaction.update(buildPainelCentral());
      }

      let canal = null;
      if (interaction.isStringSelectMenu()) {
        canal = interaction.guild?.channels.cache.get(interaction.values[0]) || null;
      } else if (partes[3] === 'atual') {
        canal = interaction.channel;
      }
      if (!canal) {
        return interaction.update(buildPainelCentral());
      }

      if (tipo === 'conversao') {
        const { atualizado } = await publishOrUpdatePanel(canal);
        const embedNovo = new EmbedBuilder()
          .setColor(0xbeb6ff)
          .setDescription(atualizado
            ? `✅ Painel de conversão **atualizado** em <#${canal.id}>.`
            : `✅ Painel de conversão **publicado** em <#${canal.id}>! Qualquer pessoa pode usar os botões.`);
        return interaction.update({ embeds: [embedNovo], components: [] });
      }

      if (tipo === 'estoque') {
        const { atualizado } = await publicarOuAtualizar(canal);
        const embedNovo = new EmbedBuilder()
          .setColor(0xbeb6ff)
          .setDescription(atualizado
            ? `✅ Painel de estoque **atualizado** em <#${canal.id}>.`
            : `✅ Painel de estoque **publicado** em <#${canal.id}>! Qualquer pessoa pode clicar nas categorias — cada um vê de forma privada.`);
        return interaction.update({ embeds: [embedNovo], components: [] });
      }

      return interaction.update({ content: '❌ Tipo desconhecido.', embeds: [], components: [] });
    }

    // ----- fixar painel de categoria (selecao visual do !painelcategoria) -----
    if (interaction.isButton() && interaction.customId.startsWith('painelcat:')) {
      if (!permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      const partes = interaction.customId.split(':');
      const catId = partes[1];
      // Seletor de categorias agora também dá acesso ao gerenciamento (editar emoji/descrição/reordenar)

      if (catId === 'pag') {
        return interaction.update(painelCategoria.construirPainelSelecao(parseInt(partes[2])));
      }
      if (catId === 'gercat') {
        return interaction.update(estoquePanel.adminGerenciarCategorias());
      }
      if (!interaction.channel) {
        return interaction.reply({ content: '❌ Não consegui identificar o canal.', flags: MessageFlags.Ephemeral });
      }
      const embed = painelCategoria.buildCategoria(catId);
      if (!embed) {
        return interaction.reply({ content: '❌ Categoria não encontrada.', flags: MessageFlags.Ephemeral });
      }
      const msg = await interaction.channel.send({ embeds: [embed] });
      painelCategoria.salvar(msg.id, catId, interaction.channel.id);
      return interaction.reply({ content: `✅ Painel da categoria **${catId}** fixado no canal.`, flags: MessageFlags.Ephemeral });
    }

    // ----- admin: estadm:* -----
    if (interaction.isButton() && interaction.customId.startsWith('estadm:')) {
      if (!permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      const partes = interaction.customId.split(':');
      const acao = partes[1];

      if (acao === 'menu') return interaction.update(estoquePanel.adminMenu());
      if (acao === 'lista') return interaction.update(estoquePanel.adminLista());
      if (acao === 'gercatpag') return interaction.update(estoquePanel.adminGerenciarCategorias(parseInt(partes[2])));

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
            new TextInputBuilder().setCustomId('qtd').setLabel('Quantidade (vazio = sem controle)').setStyle(TextInputStyle.Short).setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('descricao').setLabel('Descrição (opcional, ex: entrega imediata)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('imagem').setLabel('Link da imagem (opcional; com http)').setStyle(TextInputStyle.Short).setRequired(false)
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
        if (p) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        if (!p) return interaction.reply({ content: '❌ Produto não encontrado.', flags: MessageFlags.Ephemeral });
        const s = estoqueDb.status(p);
        return interaction.update({
          content: `✅ **${p.nome}** agora está: ${s.emoji} ${s.texto}`,
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('estadm:menu').setLabel('⬅️ Voltar ao menu').setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }
      if (acao === 'remover3') {
        const [, , catId, prodId] = partes;
        const p = estoqueDb.produto(catId, prodId);
        if (!p) return interaction.update({ content: '❌ Produto não encontrado.', embeds: [], components: [] });
        return interaction.update(
          montarConfirmacao(
            `🗑️ **Confirmar exclusão do produto**\n\n${p.nome} — ${formatBRL(p.valor)}?\n\n_Os painéis fixos serão atualizados._`,
            `estadm:remover-confirm:${catId}:${p.id}`,
            `estadm:remover-cancel:${catId}:${p.id}`
          )
        );
      }
      if (acao === 'remover-cancel') {
        const [, , catId, prodId] = partes;
        return interaction.update(estoquePanel.adminProdDetalhe(catId, prodId));
      }
      if (acao === 'remover-confirm') {
        const [, , catId, prodId] = partes;
        const p = estoqueDb.produto(catId, prodId);
        const ok = estoqueDb.removeProduto(catId, prodId);
        if (ok) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return interaction.update({
          content: ok ? `🗑️ Produto **${p?.nome || ''}** removido.` : '❌ Produto não encontrado.',
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('estadm:menu').setLabel('⬅️ Voltar ao menu').setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      // ----- remover categoria -----
      if (acao === 'remcat') return interaction.update(estoquePanel.adminEscolherCategoria('remcat2'));
      if (acao === 'remcat2') {
        const catId = partes[2];
        const cat = estoqueDb.categoria(catId);
        if (!cat) return interaction.update({ content: '❌ Categoria não encontrada.', embeds: [], components: [] });
        return interaction.update(
          montarConfirmacao(
            `🗑️ **Confirmar exclusão da categoria**\n\n${cat.nome} (${cat.produtos.length} produto(s))?\n\n_Os painéis fixos serão atualizados._`,
            `estadm:remcat-confirm:${catId}`,
            `estadm:menu`
          )
        );
      }
      if (acao === 'remcat-confirm') {
        const catId = partes[2];
        const cat = estoqueDb.categoria(catId);
        const ok = estoqueDb.removeCategoria(catId);
        if (ok) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return interaction.update({
          content: ok
            ? `🗑️ Categoria **${cat?.nome || ''}** removida (com ${cat?.produtos?.length || 0} produto(s)).`
            : '❌ Categoria não encontrada.',
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('estadm:menu').setLabel('⬅️ Voltar ao menu').setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      // ----- vender: diminui 1 da quantidade -----
      if (acao === 'vender') return interaction.update(estoquePanel.adminEscolherCategoria('vender2'));
      if (acao === 'vender2') return interaction.update(estoquePanel.adminEscolherProduto('vender3', partes[2]));
      if (acao === 'vender3') {
        const [, , catId, prodId] = partes;
        const atual = estoqueDb.produto(catId, prodId);

        // Defer imediato para ganhar tempo (evita timeout de 3s)
        await interaction.deferUpdate().catch(() => {});

        const responder = async (payload) => {
          try {
            if (interaction.deferred) {
              return await interaction.editReply(payload);
            }
            return await interaction.update(payload);
          } catch {
            try {
              return await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
            } catch {}
          }
        };

        if (!atual) return responder({ content: '❌ Produto não encontrado.', embeds: [], components: [] });
        if (!atual.controlarQtd) return responder({ content: `❌ **${atual.nome}** não tem controle de quantidade.`, embeds: [], components: [] });

        const novaQtd = Math.max(0, atual.quantidade - 1);
        const p = estoqueDb.setQuantidade(catId, prodId, novaQtd);
        if (p) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        // Aviso de esgotado em background (nao trava a resposta)
        if (p && p.quantidade === 0) {
          avisar(client, `⚠️ **${p.nome}** esgotou no estoque!`).catch(() => {});
        }
        return responder({
          content: `📦 Venda registrada: **${p.nome}** agora tem **${p.quantidade}** em estoque.`,
          embeds: [],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('estadm:menu').setLabel('⬅️ Voltar ao menu').setStyle(ButtonStyle.Secondary)
            ),
          ],
        });
      }

      // ----- editar nome produto -----
      if (acao === 'nome') return interaction.update(estoquePanel.adminEscolherCategoria('nome2'));
      if (acao === 'nome2') return interaction.update(estoquePanel.adminEscolherProduto('nome3', partes[2]));
      if (acao === 'nome3') {
        const [, , catId, prodId] = partes;
        const modal = new ModalBuilder().setCustomId(`estmodal:nome:${catId}:${prodId}`).setTitle('Editar nome do produto').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('nome').setLabel('Novo nome').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // ----- renomear categoria -----
      if (acao === 'rencat') return interaction.update(estoquePanel.adminEscolherCategoria('rencat2'));
      if (acao === 'rencat2') {
        const catId = partes[2];
        const modal = new ModalBuilder().setCustomId(`estmodal:rencat:${catId}`).setTitle('Renomear categoria').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('nome').setLabel('Novo nome da categoria').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }

      // ----- gerenciar categorias (emoji, descrição, reordenar) -----
      if (acao === 'gercat') return interaction.update(estoquePanel.adminGerenciarCategorias());
      if (acao === 'gercat2') return interaction.update(estoquePanel.adminGerCatDetalhe(partes[2]));

      if (acao === 'catemoji') {
        const catId = partes[2];
        const modal = new ModalBuilder().setCustomId(`estmodal:catemoji:${catId}`).setTitle('Emoji da categoria').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('emoji').setLabel('Emoji (ex: 🗡️)').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }
      if (acao === 'catdesc') {
        const catId = partes[2];
        const modal = new ModalBuilder().setCustomId(`estmodal:catdesc:${catId}`).setTitle('Descrição da categoria').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('descricao').setLabel('Descrição (máx. 100 caracteres)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)
          )
        );
        return interaction.showModal(modal);
      }
      if (acao === 'catsubir') {
        const catId = partes[2];
        estoqueDb.moverCategoria(catId, -1);
        painelCategoria.refresh(client).catch(() => {});
        return interaction.update(estoquePanel.adminGerCatDetalhe(catId));
      }
      if (acao === 'catdescer') {
        const catId = partes[2];
        estoqueDb.moverCategoria(catId, 1);
        painelCategoria.refresh(client).catch(() => {});
        return interaction.update(estoquePanel.adminGerCatDetalhe(catId));
      }

      // ----- info do produto (descrição, imagem, preço) -----
      if (acao === 'prodinfo') return interaction.update(estoquePanel.adminEscolherCategoria('prodinfo2'));
      if (acao === 'prodinfo2') return interaction.update(estoquePanel.adminEscolherProduto('prodinfo3', partes[2]));
      if (acao === 'prodinfo3') {
        const [, , catId, prodId] = partes;
        return interaction.update(estoquePanel.adminProdDetalhe(catId, prodId));
      }

      if (acao === 'proddtl-desc') {
        const [, , catId, prodId] = partes;
        const modal = new ModalBuilder().setCustomId(`estmodal:proddtl-desc:${catId}:${prodId}`).setTitle('Descrição do produto').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('descricao').setLabel('Descrição (deixe vazio para remover)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)
          )
        );
        return interaction.showModal(modal);
      }
      if (acao === 'proddtl-img') {
        const [, , catId, prodId] = partes;
        const modal = new ModalBuilder().setCustomId(`estmodal:proddtl-img:${catId}:${prodId}`).setTitle('Imagem do produto').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('imagem').setLabel('Link da imagem (vazio = remove)').setStyle(TextInputStyle.Short).setRequired(false)
          )
        );
        return interaction.showModal(modal);
      }
      if (acao === 'proddtl-valor') {
        const [, , catId, prodId] = partes;
        const modal = new ModalBuilder().setCustomId(`estmodal:proddtl-valor:${catId}:${prodId}`).setTitle('Preço do produto').addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('valor').setLabel('Valor em R$ (ex: 15,00)').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return interaction.showModal(modal);
      }
      return;
    }

    // ----- modais do estoque -----
    if (interaction.isModalSubmit() && interaction.customId.startsWith('estmodal:')) {
      if (!permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
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
        if (cat) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
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

        const descricao = (interaction.fields.getTextInputValue('descricao') || '').trim();
        const imagem = (interaction.fields.getTextInputValue('imagem') || '').trim();
        if (imagem && !imagem.startsWith('http')) {
          return voltarMenu('❌ Link de imagem inválido. Use um link começando com http.');
        }
        const p = estoqueDb.addProduto(catId, { nome, valor, controlarQtd, quantidade, descricao, imagem });
        if (p) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
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
        if (p) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        // Avisa quando o produto esgota
        if (p && p.quantidade === 0) {
          avisar(client, `⚠️ **${p.nome}** esgotou no estoque!`).catch(() => {});
        }
        return voltarMenu(
          p ? `✅ **${p.nome}** agora tem **${p.quantidade}** em estoque.` : '❌ Produto não encontrado ou sem controle de quantidade.'
        );
      }

      if (acao === 'nome') {
        const [, , catId, prodId] = partes;
        const novoNome = interaction.fields.getTextInputValue('nome').trim();
        if (!novoNome) return voltarMenu('❌ Nome inválido.');
        const antes = estoqueDb.produto(catId, prodId)?.nome;
        const p = estoqueDb.setNome(catId, prodId, novoNome);
        if (p) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return voltarMenu(
          p ? `✅ Produto renomeado: **${antes}** → **${novoNome}**` : '❌ Produto não encontrado.'
        );
      }

      if (acao === 'rencat') {
        const catId = partes[2];
        const novoNome = interaction.fields.getTextInputValue('nome').trim();
        if (!novoNome) return voltarMenu('❌ Nome inválido.');
        const cat = estoqueDb.renomearCategoria(catId, novoNome);
        if (cat) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return voltarMenu(
          cat ? `✅ Categoria renomeada para **${novoNome}**` : '❌ Categoria não encontrada.'
        );
      }

      if (acao === 'catemoji') {
        const catId = partes[2];
        const { sanitizarEmoji } = require('./utils/sanitizarEmoji');
        const emoji = sanitizarEmoji(interaction.fields.getTextInputValue('emoji'));
        const cat = estoqueDb.setEmojiCategoria(catId, emoji);
        if (cat) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return voltarMenu(
          cat ? `✅ Emoji da categoria **${cat.nome}** definido para ${emoji || 'nenhum'}.` : '❌ Categoria não encontrada.'
        );
      }

      if (acao === 'catdesc') {
        const catId = partes[2];
        const descricao = (interaction.fields.getTextInputValue('descricao') || '').trim();
        const cat = estoqueDb.setDescricaoCategoria(catId, descricao);
        if (cat) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return voltarMenu(
          cat ? `✅ Descrição de **${cat.nome}** ${descricao ? `definida: _${descricao}_` : 'removida'}.` : '❌ Categoria não encontrada.'
        );
      }

      if (acao === 'proddtl-desc') {
        const [, , catId, prodId] = partes;
        const descricao = (interaction.fields.getTextInputValue('descricao') || '').trim();
        const p = estoqueDb.setDescricaoProduto(catId, prodId, descricao);
        if (p) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return voltarMenu(
          p ? `✅ Descrição de **${p.nome}** ${descricao ? `definida: _${descricao}_` : 'removida'}.` : '❌ Produto não encontrado.'
        );
      }

      if (acao === 'proddtl-img') {
        const [, , catId, prodId] = partes;
        const imagem = (interaction.fields.getTextInputValue('imagem') || '').trim();
        if (imagem && !imagem.startsWith('http')) {
          return voltarMenu('❌ Link de imagem inválido. Use um link começando com http.');
        }
        const p = estoqueDb.setImagemProduto(catId, prodId, imagem);
        if (p) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return voltarMenu(
          p ? `✅ Imagem de **${p.nome}** ${imagem ? 'atualizada.' : 'removida.'}` : '❌ Produto não encontrado.'
        );
      }

      if (acao === 'proddtl-valor') {
        const [, , catId, prodId] = partes;
        const valor = parseFloat(interaction.fields.getTextInputValue('valor').trim().replace(/\./g, '').replace(',', '.'));
        if (isNaN(valor) || valor <= 0) {
          return voltarMenu('❌ Valor inválido.');
        }
        const p = estoqueDb.setValor(catId, prodId, valor);
        if (p) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return voltarMenu(
          p ? `✅ Preço de **${p.nome}** atualizado para ${formatBRL(valor)}.` : '❌ Produto não encontrado.'
        );
      }
      return;
    }
  } catch (error) {
    console.error('[Estoque] Erro na interação:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro. Tente novamente.', flags: MessageFlags.Ephemeral });
      }
    } catch {}
  }
});

// ----- Botões de conteúdo copiável (comandos personalizados) -----

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith('custom:copy:')) {
      const custom = require('./utils/customCommands');
      const partes = interaction.customId.split(':');
      const nomeCmd = partes[2];
      const idx = parseInt(partes[3], 10);

      const cmd = custom.obter(nomeCmd);
      if (!cmd || !cmd.copiaveis[idx]) {
        return interaction.reply({ content: '❌ Conteúdo não encontrado.', flags: MessageFlags.Ephemeral });
      }

      const item = cmd.copiaveis[idx];
      // Resposta ephemeral com o valor em texto puro (sem rotulo/backticks)
      return interaction.reply({
        content: item.valor,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error('[Copiar]', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Erro ao copiar.', flags: MessageFlags.Ephemeral });
      }
    } catch {}
  }
});
// ----- Excluir comando personalizado via caixinha (select) do /gerenciarcomandos -----
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isAnySelectMenu && interaction.isAnySelectMenu() && interaction.customId === 'gerencmd:excluir') {
      const custom = require('./utils/customCommands');
      const nome = interaction.values[0];
      return interaction.update(
        montarConfirmacao(
          `🗑️ **Confirmar exclusão do comando_**/**${nome}**?`,
          `gerencmd:confirm:${nome}`,
          'gerencmd:cancel'
        )
      );
    }

    // Confirmação de exclusão do comando personalizado
    if (interaction.isButton() && interaction.customId.startsWith('gerencmd:confirm:')) {
      const custom = require('./utils/customCommands');
      const nome = (interaction.customId.split(':')[2] || '' ).trim();
      const ok = custom.excluir(nome);
      return interaction.update({
        content: ok ? '✅ Comando !' + nome + ' excluído.' : '❌ Comando !' + nome + ' não encontrado.',
        components: [],
      });
    }
    if (interaction.isButton() && interaction.customId === 'gerencmd:cancel') {
      return interaction.update({
        content: '✅ Exclusão cancelada.',
        components: [],
      });
    }
  } catch (error) {
    console.error('[Excluir custom]', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Erro ao excluir.', flags: MessageFlags.Ephemeral });
      }
    } catch {}
  }
});

// ----- Permissões por cargo (!permissoes / /permissoes) -----
const { buildPermissionsPanel, buildGrupoPanel, buildRemoverPanel } = require('./utils/permissionsPanel');
const { setCargo, eDono, comandoPode } = require('./utils/permissions');

// Mapeia o customId de uma interação para o comando que ela representa,
// permitindo que o sistema de permissões por cargo restrinja botões/menus.
function comandoDoCustomId(interaction) {
  const id = interaction.customId || '';
  if (id.startsWith('estadm:') || id.startsWith('estmodal:')) return 'configestoque';
  if (id.startsWith('estfixo:')) return 'estoque';
  if (id.startsWith('painelcenter:')) return 'painel';
  if (id.startsWith('painelcat:')) return 'painelcategoria';
  if (id.startsWith('cfg:') || id.startsWith('cfgmodal:')) return 'configtaxa';
  if (id.startsWith('embedpainel:') || id.startsWith('embedmodal:') || id.startsWith('embedcanal:')) return 'embed';
  if (id.startsWith('msgpainel:') || id.startsWith('msgmodal:') || id.startsWith('msgcanal:')) return 'mensagem';
  if (id.startsWith('lockconf:')) return 'lock';
  if (id.startsWith('unlockconf:')) return 'unlock';
  if (id.startsWith('modelos:')) return 'embed';
  if (id.startsWith('gerencmd:')) return 'gerenciarcomandos';
  if (id.startsWith('custom:copy:')) return 'criarcomando';
  return null;
}
function permitido(interaction) {
  const cmd = comandoDoCustomId(interaction);
  if (!cmd) return true;
  return comandoPode(interaction.member, interaction.user.id, cmd);
}


client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith('perm:')) {
      const partes = interaction.customId.split(':');
      const acao = partes[1];
      const donoId = partes[partes.length - 1];

      if (interaction.user.id !== donoId) {
        return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
      }
      if (!isAdmin(interaction.member, interaction.user.id) && !eDono(interaction.user.id)) {
        return interaction.reply({ content: '🔒 Somente administradores podem gerenciar permissões.', flags: MessageFlags.Ephemeral });
      }
      if (!interaction.guild) {
        return interaction.reply({ content: '🔒 Isso só funciona no servidor.', flags: MessageFlags.Ephemeral });
      }

      if (acao === 'voltar') {
        return interaction.update(buildPermissionsPanel(interaction.guild, donoId));
      }

      if (acao === 'grupo') {
        const grupoId = partes[2];
        return interaction.update(buildGrupoPanel(interaction.guild, grupoId, donoId));
      }

      if (acao === 'remover') {
        const grupoId = partes[2];
        return interaction.update(buildRemoverPanel(interaction.guild, grupoId, donoId));
      }

      if (acao === 'remover2') {
        const grupoId = partes[2];
        const roleId = partes[3];
        setCargo(grupoId, roleId, false);
        return interaction.update(buildGrupoPanel(interaction.guild, grupoId, donoId));
      }

      return interaction.reply({ content: '❌ Ação desconhecida.', flags: MessageFlags.Ephemeral });
    }

    // Seletor de cargos para adicionar ao grupo
    if (interaction.isRoleSelectMenu() && interaction.customId.startsWith('perm:cargos:')) {
      const partes = interaction.customId.split(':');
      const grupoId = partes[2];
      const donoId = partes[3];

      if (interaction.user.id !== donoId) {
        return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
      }
      if (!isAdmin(interaction.member, interaction.user.id) && !eDono(interaction.user.id)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }

      for (const roleId of interaction.values) {
        setCargo(grupoId, roleId, true);
      }
      return interaction.update(buildGrupoPanel(interaction.guild, grupoId, donoId));
    }
  } catch (error) {
    console.error('[Permissões] Erro:', error?.message || error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro.', flags: MessageFlags.Ephemeral });
      }
    } catch {}
  }
});
// ----- Painel visual de embed -----

const { getSessao, limparSessao, buildEmbed, buildPainel, buildPreview, buildFieldsPainel, buildConteudoPrivado, urlValida, botoesEmLinhas } = require('./utils/embedPainel');
const { buildBotoesPainel, buildBotaoModal, buildBotaoPrivadoPainel } = require('./utils/botoesPainel');
const { buildModelosPainel, buildCategoriaPainel } = require('./utils/modelosPainel');
const modelosStore = require('./utils/embedModelos');
const welcomeStore = require('./utils/welcomeStore');
const welcomeVars = require('./utils/welcomeVars');
const welcomePainel = require('./utils/welcomePainel');
const { interpolar, interpolarEmbed } = require('./utils/interpolar');
const cttStore = require('./utils/cttStore');
const { linhaSelecaoCanalDe } = require('./utils/channelPicker');
const extrasHandlers = require('./utils/extras');

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId.startsWith('embedpainel:')) {
      const partes = interaction.customId.split(':');
      const acao = partes[1];
      const donoId = partes[2];

      // So o dono do painel pode usar
      if (interaction.user.id !== donoId) {
        return interaction.reply({ content: '🔒 Este painel não é seu. Use `!embed` para criar o seu.', flags: MessageFlags.Ephemeral });
      }
      if (!permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }

      const estado = getSessao(donoId);

      // Abre modal para editar um campo
      const abrirModal = (campo, titulo, label, multiline = false) => {
        const atual = estado[campo] || '';
        const valorStr = multiline ? String(atual).slice(0, 4000) : String(atual).slice(0, 1024);
        const modal = new ModalBuilder()
          .setCustomId(`embedmodal:${campo}:${donoId}`)
          .setTitle(titulo)
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('valor')
                .setLabel(label)
                .setStyle(multiline ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(campo !== 'titulo' && campo !== 'imagem' && campo !== 'thumbnail' && campo !== 'autor' && campo !== 'rodape' && campo !== 'textofora' && campo !== 'fields' && campo !== 'cargos')
                .setValue(valorStr)
            )
          );
        return interaction.showModal(modal);
      };

      const abrirPaginaModal = (idx, pi = -1) => {
        const atual = pi >= 0 ? (estado.botoes[idx].paginas[pi] || {}) : {};
        const modalPag = new ModalBuilder()
          .setCustomId(pi >= 0 ? `embedmodal:botpagedit:${donoId}:${idx}:${pi}` : `embedmodal:botpagnew:${donoId}:${idx}`)
          .setTitle(pi >= 0 ? `✏️ Editar pagina ${pi + 1}` : '➕ Nova pagina do botao privado')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('ptitulo')
                .setLabel('Titulo da pagina (opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(256)
                .setValue(String(atual.titulo || '').slice(0, 256))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('pdescricao')
                .setLabel('Descricao da pagina (opcional)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(4000)
                .setValue(String(atual.descricao || '').slice(0, 4000))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('pimagem')
                .setLabel('Link da imagem (opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(1024)
                .setValue(String(atual.imagem || '').slice(0, 1024))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('pthumb')
                .setLabel('Link do thumbnail (opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(1024)
                .setValue(String(atual.thumbnail || '').slice(0, 1024))
            )
        );
        return interaction.showModal(modalPag);
      };

      if (acao === 'titulo') return abrirModal('titulo', '📝 Título', 'Título da embed');
      if (acao === 'descricao') return abrirModal('descricao', '📄 Descrição', 'Texto da embed', true);
      if (acao === 'cor') return abrirModal('cor', '🎨 Cor', 'Nome ou #hex (ex: lilas ou #beb6ff)');
      // Dica: upload por anexo e aceito ao chamar '!embed' com uma foto na mensagem
      if (acao === 'imagem') return abrirModal('imagem', '🖼️ Imagem', 'Link da imagem (ou anexe a foto no !embed)');
      if (acao === 'thumbnail') return abrirModal('thumbnail', '🔳 Thumbnail', 'Link da thumbnail (opcional)');
      if (acao === 'autor') return abrirModal('autor', '👤 Autor', 'Nome do autor (opcional)');
      if (acao === 'rodape') return abrirModal('rodape', '📝 Rodapé', 'Texto do rodapé (opcional)');
      if (acao === 'textofora') return abrirModal('textofora', '💬 Texto fora', 'Mensagem fora da embed (opcional)');
      if (acao === 'botoes') return interaction.update(buildBotoesPainel(donoId, interaction.guildId));
      if (acao === 'botaoadd') return interaction.showModal(buildBotaoModal(donoId));
      if (acao === 'botaoed') {
        const bts = Array.isArray(estado.botoes) ? estado.botoes : [];
        if (!bts.length) return interaction.reply({ content: '❌ Nenhum botão para editar.', flags: MessageFlags.Ephemeral });
        const sel = buildBotoesPainel(donoId, interaction.guildId);
        const linhas = Array.isArray(sel.components) ? [...sel.components] : [];
        // Reexibe a tela de botões destacando o select de escolha
        return interaction.update({
          content: '✏️ **Escolha o botão que deseja editar no menu abaixo:**',
          embeds: sel.embeds,
          components: linhas,
        });
      }
      if (acao === 'botaorem') {
        const bts = Array.isArray(estado.botoes) ? estado.botoes : [];
        if (!bts.length) return interaction.reply({ content: '❌ Nenhum botão para remover.', flags: MessageFlags.Ephemeral });
        bts.pop();
        estado.botoes = bts;
        return interaction.update(buildBotoesPainel(donoId, interaction.guildId));
      }
      if (acao === 'botpagadd') return abrirPaginaModal(Number(partes[3]));
      if (acao === 'botpaglimpar') {
        const bts = Array.isArray(estado.botoes) ? estado.botoes : [];
        const bi = Number(partes[3]);
        if (!bts[bi]) return interaction.reply({ content: '❌ Botão inválido.', flags: MessageFlags.Ephemeral });
        bts[bi].paginas = [];
        return interaction.update(buildBotaoPrivadoPainel(donoId, bi));
      }


      if (acao === 'salvar') {
        if (!interaction.guild) {
          return interaction.reply({ content: '❌ Só funciona no servidor.', flags: MessageFlags.Ephemeral });
        }
        const modalSalvar = new ModalBuilder()
          .setCustomId(`embedmodal:salvar:${donoId}`)
          .setTitle('💾 Salvar modelo')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('mnome')
                .setLabel('Nome do modelo')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(80)
                .setPlaceholder('Ex: Promoção de 500 Robux')
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('mcategoria')
                .setLabel('Categoria da guild (e.g.: Boas-vindas, Loja)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(24)
                .setValue('outros')
            )
          );
        return interaction.showModal(modalSalvar);
      }

      if (acao === 'fields') return interaction.update(buildFieldsPainel(donoId));
        if (acao === 'fieldsadd') {
          const modal = new ModalBuilder()
            .setCustomId(`embedmodal:fieldnew:${donoId}`)
            .setTitle('➕ Novo Field')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('fname')
                  .setLabel('Nome do campo')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
                  .setMaxLength(256)
                  .setPlaceholder('Ex: Preço')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('fvalue')
                  .setLabel('Valor do campo')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
                  .setMaxLength(1024)
                  .setPlaceholder('Ex: R$ 10,00')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('finline')
                  .setLabel('Em linha? (sim ou não)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setMaxLength(3)
                  .setValue('sim')
              )
            );
          return interaction.showModal(modal);
        }
        if (acao === 'fieldsclear') {
          estado.fields = [];
          return interaction.update(buildFieldsPainel(donoId));
        }
      if (acao === 'cargos') {
        // Botao legado: nao faz nada (a selecao agora e pelo menu nativo abaixo)
        return interaction.reply({ content: '👥 Use o **menu de seleção de cargos** abaixo dos botões para escolher.', flags: MessageFlags.Ephemeral });
      }

      if (acao === 'preview') {
        // Preview real: mostra apenas a embed final (sem o editor) com opções
        // de voltar a editar, enviar ou cancelar.

        return interaction.reply({ ...buildPreview(donoId, interaction.guildId), flags: MessageFlags.Ephemeral });
      }

      if (acao === 'voltar') {
        return interaction.update(buildPainel(donoId, interaction.guildId));
      }

      if (acao === 'enviar') {
        if (!buildEmbed(estado)) {
          return interaction.reply({ content: '❌ Preencha algo válido antes de enviar: **descrição**, **fields**, **imagem**, **thumbnail**, **rodapé**, **autor** ou **botões**. O **título** é opcional.', flags: MessageFlags.Ephemeral });
        }
        if (!interaction.guild) {
          return interaction.reply({ content: '❌ Não dá para publicar no servidor pela DM. Use o comando no servidor.', flags: MessageFlags.Ephemeral });
        }
        const canais = linhaSelecaoCanalDe(interaction.guild, `embedcanal:${donoId}`, interaction.channel.id, '📣 Escolha o canal para publicar…');
        if (!canais.canais.length) {
          return interaction.reply({ content: '❌ Não encontrei nenhum canal de texto em que eu possa publicar.', flags: MessageFlags.Ephemeral });
        }
        return interaction.update({
          content: '🗂️ **Onde deseja publicar a embed?**\n_Selecione um canal abaixo ou use **📌 Canal atual**._',
          embeds: [new EmbedBuilder().setColor(0xbeb6ff).setDescription('👁️ Esta é a embed que será enviada:') , buildEmbed(estado)].filter(Boolean),
          components: [canais.row, canais.botoes],
        });
      }

      if (acao === 'cancelar') {
        limparSessao(donoId);
        return interaction.update({ content: '❌ Montagem cancelada.', embeds: [], components: [] });
      }
      return;
    }

    // Menu de selecao de cargos (RoleSelectMenu nativo)
    if (interaction.isRoleSelectMenu() && interaction.customId.startsWith('embedpainel:selcargos:')) {
      const donoId = interaction.customId.split(':')[2];
      if (interaction.user.id !== donoId) {
        return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
      }
      if (!permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      const estado = getSessao(donoId);
      estado.cargos = [...interaction.values]; // IDs dos cargos selecionados
      return interaction.update(buildPainel(donoId, interaction.guildId));
    }

    // Select menu para editar um field da embed
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('embedpainel:fieldsel:')) {
      const donoId = interaction.customId.split(':')[2];
      if (interaction.user.id !== donoId) {

        return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
      }
      if (!permitido(interaction)) {

        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      const estado = getSessao(donoId);
      const idx = parseInt(interaction.values[0], 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= (estado.fields || []).length) {

        return interaction.reply({ content: '❌ Field inválido.', flags: MessageFlags.Ephemeral });
      }
      const f = estado.fields[idx];
      const modal = new ModalBuilder()
        .setCustomId(`embedmodal:fieldedit:${donoId}:${idx}`)
        .setTitle(`✏️ Editar Field ${idx + 1}`)
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('fname')
              .setLabel('Nome do campo')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(256)
              .setValue(String(f.name || '').slice(0, 256))
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('fvalue')
              .setLabel('Valor do campo')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(1024)
              .setValue(String(f.value || '').slice(0, 1024))
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('finline')
              .setLabel('Em linha? (sim ou não)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(3)
              .setValue(f.inline ? 'sim' : 'não')
          )
        );
      return interaction.showModal(modal);
    }

    // Select menu para escolher um botão (editar/conteúdo privado)
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('embedpainel:botaosel:')) {
      const donoId = interaction.customId.split(':')[2];
      if (interaction.user.id !== donoId) {

        return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
      }
      if (!permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      const estado = getSessao(donoId);
      const idx = parseInt(interaction.values[0], 10);
      const bts = Array.isArray(estado.botoes) ? estado.botoes : [];
      if (Number.isNaN(idx) || idx < 0 || idx >= bts.length) {
        return interaction.reply({ content: '❌ Botão inválido.', flags: MessageFlags.Ephemeral });
      }
      const b = bts[idx];
      if (b && (b.acao === 'privado' || b.paginas || b._privado)) {
        if (!Array.isArray(b.paginas)) b.paginas = [];
        return interaction.update(buildBotaoPrivadoPainel(donoId, idx));
      }
      return interaction.showModal(buildBotaoModal(donoId, idx));
    }

    // Select menu para escolher um conteúdo (página) do botão privado
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('embedpainel:botpagsel:')) {
      const partesSel = interaction.customId.split(':');
      const donoId = partesSel[2];
      const bi = Number(partesSel[3]);
      if (interaction.user.id !== donoId) {

        return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
      }
      if (!permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      const estado = getSessao(donoId);
      const bts = Array.isArray(estado.botoes) ? estado.botoes : [];
      if (!bts[bi] || !Array.isArray(bts[bi].paginas)) {
        return interaction.reply({ content: '❌ Botão inválido.', flags: MessageFlags.Ephemeral });
      }
      const pi = parseInt(interaction.values[0], 10);
      if (Number.isNaN(pi) || pi < 0 || pi >= bts[bi].paginas.length) {

        return interaction.reply({ content: '❌ Conteúdo inválido.', flags: MessageFlags.Ephemeral });
      }
      const atual = bts[bi].paginas[pi] || {};
        const modalPag = new ModalBuilder()
          .setCustomId(`embedmodal:botpagedit:${donoId}:${bi}:${pi}`)
          .setTitle(`✏️ Editar conteúdo ${pi + 1}`)
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('ptitulo')
                .setLabel('Titulo do conteudo (opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(256)
                .setValue(String(atual.titulo || '').slice(0, 256))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('pdescricao')
                .setLabel('Descricao do conteudo (opcional)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(4000)
                .setValue(String(atual.descricao || '').slice(0, 4000))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('pimagem')
                .setLabel('Link da imagem (opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(1024)
                .setValue(String(atual.imagem || '').slice(0, 1024))
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('pthumb')
                .setLabel('Link do thumbnail (opcional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(1024)
                .setValue(String(atual.thumbnail || '').slice(0, 1024))
            )
          );
        return interaction.showModal(modalPag);
    }

    // Modais do painel de embed
    if (interaction.isModalSubmit() && interaction.customId.startsWith('embedmodal:')) {
      const partes = interaction.customId.split(':');
      const campo = partes[1];
      const donoId = partes[2];

      if (interaction.user.id !== donoId) {
        return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
      }
      // ---- Modais dos botões do editor ----
      if (campo === 'botaosave') {
        const estado = getSessao(donoId);
        const botoes = Array.isArray(estado.botoes) ? estado.botoes : [];
        const rotulo = (interaction.fields.getTextInputValue('rotulo') || '').trim();
        const { sanitizarEmoji } = require('./utils/sanitizarEmoji');
        const emoji = sanitizarEmoji(interaction.fields.getTextInputValue('emoji'));
        const estilo = (interaction.fields.getTextInputValue('estilo') || '' ).trim().toLowerCase();
        const acao = ((interaction.fields.getTextInputValue('acao') || '' ).trim().toLowerCase() === 'privado') ? 'privado' : 'link';
        const valor = (interaction.fields.getTextInputValue('valor') || '' ).trim();
        if (!rotulo) return interaction.reply({ content: '❌ Informe o **nome** do botão.', flags: MessageFlags.Ephemeral });
        const estilosValidos = ['primario','secundario','sucesso','perigo','link','primary','secondary','success','danger'];
        const estiloNorm = estilosValidos.includes(estilo) ? estilo : (acao === 'privado' ? 'secundario' : 'link');
        const novo = { rotulo: rotulo.slice(0, 80), emoji, estilo: estiloNorm, acao, valor: valor.slice(0, 4000) };
        const idx = partes[3];
        if (idx !== undefined && Number.isInteger(Number(idx))) {
          const i = Number(idx);
          if (i < 0 || i >= botoes.length) return interaction.reply({ content: '❌ Botão inválido.', flags: MessageFlags.Ephemeral });
          if (acao === 'privado' && !Array.isArray(botoes[i].paginas)) botoes[i].paginas = [];
          botoes[i] = { ...botoes[i], ...novo };
        } else {
          if (acao === 'privado') novo.paginas = [];
          botoes.push(novo);
        }
        estado.botoes = botoes;
        return interaction.update(buildBotoesPainel(donoId, interaction.guildId));
      }

      if (campo === 'botpagnew' || campo === 'botpagedit') {

        const estado = getSessao(donoId);
        const botoes = Array.isArray(estado.botoes) ? estado.botoes : [];
        const i = Number(partes[3]);
        if (!botoes[i]) return interaction.reply({ content: '❌ Botão inválido.', flags: MessageFlags.Ephemeral });
        if (!Array.isArray(botoes[i].paginas)) botoes[i].paginas = [];
        const tituloP = (interaction.fields.getTextInputValue('ptitulo') || '' ).trim();
        const descricaoP = (interaction.fields.getTextInputValue('pdescricao') || '' ).trim();
        const imagemP = (interaction.fields.getTextInputValue('pimagem') || '' ).trim();
        const thumbP = (interaction.fields.getTextInputValue('pthumb') || '' ).trim();
        if (!tituloP && !descricaoP && !imagemP && !thumbP) {
          return interaction.reply({ content: '❌ Preencha ao menos um campo da página.', flags: MessageFlags.Ephemeral });
        }
        const pagina = { titulo: tituloP || null, descricao: descricaoP || null, imagem: imagemP || null, thumbnail: thumbP || null, fields: [] };
        if (campo === 'botpagnew') {
          botoes[i].paginas.push(pagina);
        } else {
          const pi = Number(partes[4]);
          if (Number.isNaN(pi) || pi < 0 || pi >= botoes[i].paginas.length) {
            return interaction.reply({ content: '❌ Página inválida.', flags: MessageFlags.Ephemeral });
          }
          botoes[i].paginas[pi] = pagina;
        }
        return interaction.update(buildBotaoPrivadoPainel(donoId, i));
      }

      if (campo === 'salvar') {
        if (!interaction.guildId) return interaction.reply({ content: '❌ Só funciona no servidor.', flags: MessageFlags.Ephemeral });
        const nomeM = (interaction.fields.getTextInputValue('mnome') || '' ).trim();
        const catM = (interaction.fields.getTextInputValue('mcategoria') || '' ).trim().toLowerCase();
        const sessao = getSessao(donoId);
        const dadosModelo = JSON.parse(JSON.stringify({ ...sessao, botoes: sessao.botoes || [], fields: sessao.fields || [], cargos: sessao.cargos || [], paginas: undefined }));
        const res = modelosStore.criar(interaction.guildId, { nome: nomeM, categoria: catM, dados: dadosModelo });
        if (!res.ok) return interaction.reply({ content: '❌ ' + (res.msg || 'Erro ao salvar.'), flags: MessageFlags.Ephemeral });
        return interaction.update({ content: '💾 Modelo **' + res.modelo.nome + '** salvo! Use `!modelos` para ver e usar.', embeds: [], components: [] });
      }

      if (campo === 'modeloed') {
        if (!interaction.guildId) return interaction.reply({ content: '❌ Só funciona no servidor.', flags: MessageFlags.Ephemeral });
        const mid = partes[2] || partes[3];
        const m = modelosStore.obter(interaction.guildId, mid);
        if (!m) return interaction.reply({ content: '❌ Modelo não encontrado.', flags: MessageFlags.Ephemeral });
        const nomeM = (interaction.fields.getTextInputValue('mnome') || '' ).trim();
        const catM = (interaction.fields.getTextInputValue('mcategoria') || '' ).trim().toLowerCase();
        const res = modelosStore.atualizar(interaction.guildId, mid, { nome: nomeM, categoria: catM });
        if (!res.ok) return interaction.reply({ content: '❌ ' + (res.msg || 'Erro.'), flags: MessageFlags.Ephemeral });
        return interaction.update({ content: '✅ Modelo **' + res.modelo.nome + '** atualizado.', embeds: [], components: [] });
      }

// Modais visuais de fields (sem o separador "|": campos separados Nome/Valor/Em linha)
      if (campo === 'fieldnew' || campo === 'fieldedit') {
        const estado = getSessao(donoId);
        const fname = (interaction.fields.getTextInputValue('fname') || '').trim();
        const fvalue = (interaction.fields.getTextInputValue('fvalue') || '').trim();
        const finline = (interaction.fields.getTextInputValue('finline') || 'sim').trim().toLowerCase();
        if (!fname || !fvalue) {
          return interaction.reply({ content: '❌ Preencha o **nome** e o **valor** do campo.', flags: MessageFlags.Ephemeral });
        }
        const novo = { name: fname.slice(0, 256), value: fvalue.slice(0, 1024), inline: !['não','nao','false','0','off'].includes(finline) };
        if (campo === 'fieldnew') {
          estado.fields = [...(estado.fields || []), novo];
        } else {
          const idxEdit = parseInt(partes[3], 10);
          if (Number.isNaN(idxEdit) || idxEdit < 0 || idxEdit >= (estado.fields || []).length) {
            return interaction.reply({ content: '❌ Field inválido.', flags: MessageFlags.Ephemeral });
          }
          estado.fields[idxEdit] = novo;
        }
        return interaction.update(buildFieldsPainel(donoId));
      }

      const estado = getSessao(donoId);
      const valor = interaction.fields.getTextInputValue('valor').trim();

      if (campo === 'cargos') {
        // Parse IDs de cargo separados por virgula
        estado.cargos = valor
          ? valor.split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s))
          : [];
      } else if (campo === 'fields') {
        // Formato: "Titulo | valor" por linha (robusto: ignora linhas invalidas,
        // trunca para os limites da API e nunca deixa name/value vazios).
        const { camposValidos } = require('./utils/embedPainel');
        const parseados = valor
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            const [name, ...v] = l.split('|');
            return { name: name.trim(), value: v.join('|').trim(), inline: true };
          });
        const fields = camposValidos(parseados);
        estado.fields = fields;
        if (!fields.length) {
          return interaction.reply({
            content: '❌ Nenhum field válido. Use o formato: `Título | valor` por linha.',
            flags: MessageFlags.Ephemeral,
          });
        }
        return interaction.update(buildPainel(donoId, interaction.guildId));
      } else if (campo === 'imagem' || campo === 'thumbnail') {
        const url = valor || null;
        if (url && !urlValida(url)) {

          return interaction.reply({
            content: `❌ Link de **${campo === 'imagem' ? 'imagem' : 'thumbnail'}** inválido. Use um link completo começando com \`http(s)://\` (ex: \`https://...png\`). Deixe vazio para remover.`,
            flags: MessageFlags.Ephemeral,
          });
        }
        estado[campo] = url;
      } else {
        estado[campo] = valor || null;
      }

      return interaction.update(buildPainel(donoId, interaction.guildId));
    }

    // Seleção de canal para publicar a embed (fluxo do botão "Enviar")
    if ((interaction.isStringSelectMenu() || interaction.isButton()) && interaction.customId.startsWith('embedcanal:')) {
      const partes = interaction.customId.split(':');
      const donoId = partes[1];

      if (interaction.user.id !== donoId) {
        return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
      }
      if (!permitido(interaction)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }

      if (interaction.isButton() && partes[2] === 'cancelar') {
        return interaction.reply({ content: '❌ Envio cancelado.', flags: MessageFlags.Ephemeral });
      }

      // Defer imediato: o envio no canal pode demorar>3s e o interaction expirar
      // (erro "não respondeu a tempo") sem ack antecipado.

      await interaction.deferUpdate().catch(() => {});
      const responder = async (payload) => {
        try {
          if (interaction.deferred) {
            return await interaction.editReply(payload);
          }
          return await interaction.update(payload);
        } catch {}
      };

      // Canais: seleção (select) ou botão "canal atual"
      let canal = null;
      if (interaction.isStringSelectMenu()) {
        canal = interaction.guild?.channels.cache.get(interaction.values[0]) || null;
      } else if (partes[2] === 'atual') {
        canal = interaction.channel;
      }
      if (!canal) {
        return responder({ content: '❌ Canal não encontrado.', embeds: [], components: [] });
      }

      const estado = getSessao(donoId);
      const embed = buildEmbed(estado);
      const mencoes = estado.cargos.map((c) => `<@&${c}>`).join(' ');
      const conteudo = [estado.textoFora, mencoes].filter(Boolean).join(' ') || null;
      try {
        await canal.send({
          content: conteudo,
          embeds: [embed],
          components: (linhasBotoes = botoesEmLinhas(estado.botoes, interaction.guildId || '', true)).length ? linhasBotoes : [],
          allowedMentions: estado.cargos.length ? { roles: estado.cargos } : { parse: [] },
        });
      } catch (sendError) {
        console.error('[Embed] Falha ao enviar no canal:', sendError?.message || sendError);
        return responder({ content: `❌ Não consegui enviar em <#${canal.id}>. Verifique minha permissão nesse canal.`, embeds: [], components: [] });
      }
      limparSessao(donoId);
      return responder({
        content: `✅ Embed enviada em <#${canal.id}>!`,
        embeds: [],
        components: [],
      });
    }
  } catch (error) {
    console.error('[Embed painel] Erro:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro.', flags: MessageFlags.Ephemeral });
      }
    } catch {}
  }
});


// ----- Botões de conteúdo privado (cttopen) -----
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() || !interaction.customId.startsWith('cttopen:')) return;
  try {
    const partesCtt = interaction.customId.split(':');
    const guildId = partesCtt[1];
    const token = partesCtt[2];
    if (!guildId || !token) {
      return interaction.reply({ content: '❌ Botão inválido.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
    if (interaction.guild && interaction.guild.id !== guildId) {

      return interaction.reply({ content: '❌ Este conteúdo não pode ser aberto neste servidor.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
    const dados = cttStore.obter(token);
    if (!dados) return interaction.reply({ content: '❌ Conteúdo expirado ou inválido.', flags: MessageFlags.Ephemeral });
    const conteudoPrivado = buildConteudoPrivado(dados.paginas || [], 0, interaction.user.id, guildId, token);
    return interaction.reply(conteudoPrivado).catch(() => {});
  } catch (error) {
    console.error('[cttopen] Erro:', error);
   try {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({ content: '❌ Erro ao abrir este conteúdo. Tente novamente.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
   } catch {}
  }
});



// ----- Painel de modelos de embed (!modelos ///modelos) -----
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() || !interaction.customId.startsWith('modelos:')) return;
  try {
    const partes = interaction.customId.split(':');
    const acao = partes[1];
    const guildId = partes[2];
    const uid = partes[3];
    if (!interaction.guild || interaction.guild.id !== guildId) return;
    if (interaction.user.id !== uid) return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
    const mId = partes[4];
    if (acao === 'voltar') return interaction.update(buildModelosPainel(guildId, uid));
    if (acao === 'cat') return interaction.update(buildCategoriaPainel(guildId, mId, uid));
    if (acao === 'novacat') {
      const modalNova = new ModalBuilder()
        .setCustomId(`modeloscat:nova:${guildId}:${uid}`)
        .setTitle('➕ Nova categoria')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('cname')
              .setLabel('Nome da categoria')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(24)
          )
        );
      return interaction.showModal(modalNova);
    }
    if (acao === 'catedit') {
      const cat = modelosStore.obterCategoria(guildId, mId);
      if (!cat) return interaction.reply({ content: '❌ Categoria não encontrada.', flags: MessageFlags.Ephemeral });
      const modalEdit = new ModalBuilder()
        .setCustomId(`modeloscat:edit:${guildId}:${uid}:${mId}`)
        .setTitle('✏️ Renomear categoria')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('cname')
              .setLabel('Nome da categoria')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(24)
              .setValue(String(cat.nome || '').slice(0, 24))
          )
        );
      return interaction.showModal(modalEdit);
    }
    if (acao === 'catexcluir') {
      const res2 = modelosStore.excluirCategoria(guildId, mId);
      return interaction.update({ content: res2.ok ? '🗑️ Categoria excluída. Modelos movidos para **Sem categoria**.' : '❌ ' + (res2.msg || 'Erro.'), embeds: [], components: [] });
    }
    const modelo = modelosStore.obter(guildId, mId);
    if (!modelo) return interaction.reply({ content: '❌ Modelo não encontrado.', flags: MessageFlags.Ephemeral });
    if (acao === 'ver') {
      const dados = modelo.dados || {};
      const embedVer = buildEmbed(JSON.parse(JSON.stringify(dados)));
      return interaction.reply({ embeds: embedVer ? [embedVer] : [], content: embedVer ? null : '⚠️ Modelo sem conteúdo visível.', components: [], flags: MessageFlags.Ephemeral });
    }
    if (acao === 'usar') {
      const sessao = getSessao(uid);
      const carregado = JSON.parse(JSON.stringify(modelo.dados || {}));
      carregado.botoes = Array.isArray(carregado.botoes) ? carregado.botoes : [];
      carregado.fields = Array.isArray(carregado.fields) ? carregado.fields : [];
      Object.assign(sessao, carregado);
      return interaction.update(buildPainel(uid, interaction.guildId));
    }
    if (acao === 'editar') {
      const modalEd = new ModalBuilder()
        .setCustomId(`embedmodal:modeloed:${mId}:${guildId}:${uid}`)
        .setTitle('✏️ Editar modelo')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('mnome')
              .setLabel('Nome do modelo')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(80)
              .setValue(String(modelo.nome || '').slice(0, 80))
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('mcategoria')
              .setLabel('Categoria da guild (e.g.: Boas-vindas, Loja)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(24)
              .setValue(String(modelo.categoria || 'outros'))
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('mdesc')
              .setLabel('Descrição interna (opcional)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(1024)
              .setValue(String(modelo.descricao || '').slice(0, 1024))
          ),
        );
      return interaction.showModal(modalEd);
    }
    if (acao === 'excluir') {
      modelosStore.excluir(guildId, mId);
      return interaction.update({ content: `🗑️ Modelo **${modelo.nome}** excluído.`, embeds: [], components: [] });
    }

  } catch (error) {
    console.error('[modelos] Erro:', error);
  }
});

// ----- Modais de categorias de modelos -----
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit() || !interaction.customId.startsWith('modeloscat:')) return;
  try {
    const partes = interaction.customId.split(':');
    const modo = partes[1];
    const guildId = partes[2];
    const uid = partes[3];
    if (interaction.user.id !== uid) return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
    const nome = (interaction.fields.getTextInputValue('cname') || '' ).trim();
    if (!nome) return interaction.reply({ content: '❌ Informe um nome para a categoria.', flags: MessageFlags.Ephemeral });
    if (modo === 'nova') {
      const res = modelosStore.criarCategoria(guildId, nome);
      if (!res.ok) return interaction.reply({ content: '❌ ' + (res.msg || 'Erro ao criar.'), flags: MessageFlags.Ephemeral });
      return interaction.update(buildModelosPainel(guildId, uid));
    }
    if (modo === 'edit') {
      const catId = partes[4];
      const res = modelosStore.editarCategoria(guildId, catId, nome)
      if (!res.ok) return interaction.reply({ content: '❌ ' + (res.msg || 'Erro ao renomear.'), flags: MessageFlags.Ephemeral });
      return interaction.update(buildCategoriaPainel(guildId, catId, uid));
    }
  } catch (error) {
    console.error('[modeloscat] Erro:', error);
  }
});


// Responde comandos de prefixo
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;


  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  const command = client.prefixCommands.get(commandName);
  // Comandos personalizados: respondem por prefixo (!) e a resposta e publica;
  // apenas o botao copiavel e ephemeral. A descricao curta e so para o menu de ajuda.
  if (!command) {
    const custom = require('./utils/customCommands');
    const { buildResposta } = require('./utils/customCommandsPanel');
    const cmdCustom = custom.obter(commandName);
    if (cmdCustom) {
      try {
        const payload = buildResposta(cmdCustom);
        return await message.reply(payload);
      } catch (error) {
        console.error('[Comando custom !]', error);
        return message.reply('❌ Erro ao executar o comando.');
      }
    }
    return;
  }

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(error);
    await message.reply('❌ Ocorreu um erro ao executar este comando.');
  }
});


// ----- Boas-vindas ao entrar no servidor -----
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const conf = welcomeStore.obter(member.guild.id);
    if (!conf) return;
    if (!conf.ativo) return;
    if (!conf.canalId) return;
    const canal = await client.channels.fetch(conf.canalId).catch(() => null);
    if (!canal) return;
    if (!canal.isTextBased()) return;
    const botMembro = canal.guild?.members?.me;
    const permissoes = canal.permissionsFor(botMembro);
    if (!permissoes || !permissoes.has(PermissionFlagsBits.SendMessages)) return;

    const conteudo = conf.tipo === 'embed' ? null : welcomeVars.interpolar(conf.mensagem || '', member, member.guild);
    const embed = conf.tipo === 'embed' ? welcomePainel.buildWelcomeEmbed(conf, member.displayAvatarURL()) : null;
    if (embed) welcomeVars.interpolarEmbed(embed, member, member.guild);

    await canal.send({
      content: conteudo || undefined,
      embeds: embed ? [embed] : [],
      allowedMentions: { parse: ['users', 'roles', 'everyone'] },
    });
  } catch (error) {
    console.error('[Welcome] Erro:', error);
  }
});


// ----- Painel de configuracao de boas-vindas -----
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    const id = interaction.customId || '';
    if (!id.startsWith('welcome:')) return;

    const partes = id.split(':');
    const acao = partes[1];
    const donoId = partes[partes.length - 1];
    if (interaction.user.id !== donoId) return;

    const sessao = welcomePainel.getSessaoWelcome(
      donoId,
      interaction.guildId
    );
    const conf = sessao.config;
    const responderPainel = () => {
      const painel = welcomePainel.buildWelcomePainel(
        donoId,
        interaction.guildId
      );
      return interaction.update({
        embeds: painel.embeds,
        components: painel.components
      });
    };

    if (interaction.isButton()) {
      if (acao === 'ativar' || acao === 'desativar') {
        conf.ativo = acao === 'ativar';
        return responderPainel();
      }
      if (acao === 'tipo') {
        conf.tipo = conf.tipo === 'embed' ? 'mensagem' : 'embed';
        if (!conf.mensagem) conf.mensagem = welcomeStore.padrao().mensagem;
        return responderPainel();
      }
      if (acao === 'canal') {
        const sel = welcomePainel.canalSelecao(
          interaction.guildId,
          `welcome:canalsel:${donoId}`,
          conf.canalId
        );
        return interaction.update({
          components: [sel.row, sel.botoes]
        });
      }
      if (acao === 'variaveis') {
        return interaction.reply({
          content: welcomeVars.listarVariaveis().join('\\n'),
          flags: MessageFlags.Ephemeral
        });
      }
      if (acao === 'salvar') {
        welcomeStore.salvar(
          interaction.guildId,
          conf
        );
        welcomePainel.limparSessaoWelcome(
          donoId
        );
        return interaction.reply({
          content: 'Salvo com sucesso.',
          flags: MessageFlags.Ephemeral
        });
      }
      if (acao === 'padrao') {
        const padrao = welcomeStore.padrao(
          conf.canalId
        );
        Object.assign(conf, padrao);
        return responderPainel();
      }
      if (acao === 'preview') {
        const memberExemplo = {
          id: interaction.user.id,
          username: interaction.user.username,
          displayName: interaction.member?.displayName || interaction.user.username,
          displayAvatarURL: () => interaction.user.displayAvatarURL(),
        };
        const conteudo = conf.tipo === 'embed'
          ? null
          : welcomeVars.interpolar(
              conf.mensagem || '',
              memberExemplo,
              interaction.guild
            );
        const embed = conf.tipo === 'embed'
          ? welcomePainel.buildWelcomeEmbed(
              conf,
              interaction.user.displayAvatarURL()
            )
          : null;
        if (embed) {
          welcomeVars.interpolarEmbed(
            embed,
            memberExemplo,
            interaction.guild
          );
        }
        return interaction.reply({
          content: conteudo || 'Pre-visualizacao:',
          embeds: embed ? [embed] : [],
          ephemeral: true,
          allowedMentions: { parse: [] }
        });
      }

if (acao === 'editar') {
        const alvo = partes[2];
        if (alvo === 'mensagem') {
          const modal = welcomePainel.modalCampo(
            donoId,
            'mensagem',
            'Editar mensagem',
            'Mensagem',
            true,
            conf.mensagem || '',
            'Ola, <@user>! Bem-vinda ao <@server>.'
          );
          return interaction.showModal(modal);
        }
        if (alvo === 'embed') {
          const painel = welcomePainel.buildWelcomeEmbedEdit(
            donoId,
            interaction.guildId
          );
          return interaction.update({
            embeds: painel.embeds,
            components: painel.components
          });
        }
      }
      if (acao === 'embed') {
        const campoEd = partes[2];
        if (campoEd === 'voltar') {
          return responderPainel();
        }
        if (campoEd === 'fields') {
          const painel = welcomePainel.buildWelcomeFieldsPainel(
            donoId,
            interaction.guildId
          );
          return interaction.update({
            embeds: painel.embeds,
            components: painel.components
          });
        }
        if (campoEd === 'timestamp') {
          conf.embed.timestamp = !conf.embed.timestamp;
          const painel = welcomePainel.buildWelcomeEmbedEdit(
            donoId,
            interaction.guildId
          );
          return interaction.update({
            embeds: painel.embeds,
            components: painel.components
          });
        }
        const rotulos = {
          titulo: ['Titulo da embed', 'Titulo'],
          descricao: ['Descricao da embed', 'Descricao'],
          cor: ['Cor da embed', 'Cor'],
          imagem: ['URL da imagem', 'Imagem'],
          thumbnail: ['Thumbnail', 'Thumbnail'],
          rodape: ['Texto do rodape', 'Rodape'],
        };
        const confEd = rotulos[campoEd];
        if (!confEd) return;
        const atual = campoEd === 'cor'
          ? (conf.embed.cor || '#beb6ff')
          : (conf.embed[campoEd] || '');
        const placeholder = campoEd === 'cor'
          ? 'Ex: #beb6ff'
          : (campoEd === 'imagem' || campoEd === 'thumbnail')
            ? 'Ex: https://...'
            : 'Aceita variaveis como <user>';
        const modal = welcomePainel.modalCampo(
          donoId,
          campoEd,
          confEd[0],
          confEd[1],
          campoEd === 'descricao' || campoEd === 'mensagem',
          atual,
          placeholder
        );
        return interaction.showModal(modal);
      }
      if (acao === 'fieldadd') {
        return interaction.showModal(
          welcomePainel.modalField(
            donoId
          )
        );
      }
      if (acao === 'fieldclear') {
        conf.embed.fields = [];
        const painel = welcomePainel.buildWelcomeFieldsPainel(
          donoId,
          interaction.guildId
        );
        return interaction.update({
          embeds: painel.embeds,
          components: painel.components
        });
      }
    }

if (interaction.isStringSelectMenu() || interaction.isButton()) {
      if (id.startsWith('welcome:canalsel:')) {
        if (interaction.isButton() && partes[3] === 'cancelar') {
          return responderPainel();
        }
        let canal = null;
        if (interaction.isStringSelectMenu()) {
          canal = interaction.guild?.channels.cache.get(interaction.values[0]) || null;
        } else if (interaction.isButton() && partes[3] === 'atual') {
          canal = interaction.channel;
        }
        if (!canal) {
          return interaction.reply({
            content: 'Canal nao encontrado.',
            flags: MessageFlags.Ephemeral
          });
        }
        conf.canalId = canal.id;
        return responderPainel();
      }
      if (interaction.isStringSelectMenu() && id.startsWith('welcome:fieldsel:')) {
        const idx = parseInt(
          interaction.values[0],
          10
        );
        const campos = (conf.embed.fields || []).filter(
          (f) => f && f.name && f.value
        );
        const campo = campos[idx] || null;
        return interaction.showModal(
          welcomePainel.modalField(
            donoId,
            idx,
            campo
          )
        );
      }
    }

    if (interaction.isModalSubmit() && id.startsWith('welcome:modal:')) {
      const alvo = partes[2];

      if (alvo === 'mensagem') {
        conf.mensagem = interaction.fields.getTextInputValue(
          'valor'
        );
        return responderPainel();
      }

      if (alvo === 'titulo' || alvo === 'descricao' || alvo === 'cor' || alvo === 'imagem' || alvo === 'thumbnail' || alvo === 'rodape') {
        const valor = interaction.fields.getTextInputValue(
          'valor'
        ).trim();
        if (alvo === 'cor' && valor && !/^#?[0-9a-fA-F]{6}$/.test(
          valor
        )) {
          return interaction.reply({
            content: 'Cor invalida.',
            flags: MessageFlags.Ephemeral
          });
        }
        if ((alvo === 'imagem' || alvo === 'thumbnail') && valor && !(valor.startsWith('http://') || valor.startsWith('https://'))) {
          return interaction.reply({
            content: 'URL invalida.',
            flags: MessageFlags.Ephemeral
          });
        }
        conf.embed[alvo] = valor || null;
        const painel = welcomePainel.buildWelcomeEmbedEdit(
          donoId,
          interaction.guildId
        );
        return interaction.update({
          embeds: painel.embeds,
          components: painel.components
        });
      }

      if (alvo === 'fieldnew' || alvo === 'fieldedit') {
        const nome = interaction.fields.getTextInputValue(
          'fname'
        ).trim();
        const valor = interaction.fields.getTextInputValue(
          'fvalue'
        ).trim();
        const inlineL = interaction.fields.getTextInputValue(
          'finline'
        ).trim().toLowerCase();
        if (!nome || !valor) {
          return interaction.reply({
            content: 'Nome e valor obrigatorios.',
            flags: MessageFlags.Ephemeral
          });
        }
        const novoCampo = {
          name: nome,
          value: valor,
          inline: inlineL === 'sim',
        };
        if (alvo === 'fieldnew') {
          conf.embed.fields.push(
            novoCampo
          );
        } else {
          const idx = parseInt(
            partes[4],
            10
          );
          if (idx >=   0 && idx < conf.embed.fields.length) {
            conf.embed.fields[idx] = novoCampo;
          }
        }
        const painel = welcomePainel.buildWelcomeFieldsPainel(
          donoId,
          interaction.guildId
        );
        return interaction.update({
          embeds: painel.embeds,
          components: painel.components
        });
      }
    }
  } catch (error) {
    console.error('[Welcome Painel] Erro:', error);
    try {
      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) return;
        return interaction.reply({
          content: 'Erro ao processar o painel.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch {}
  }
});


extrasHandlers.registrar(client);
const customEditHandlers = require('./utils/customEditHandler');
customEditHandlers.registrar(client);

client.login(process.env.DISCORD_TOKEN);
