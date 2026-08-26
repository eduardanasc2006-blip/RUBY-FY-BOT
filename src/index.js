require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
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

// Status do bot com a taxa atual (atualiza sozinho quando muda via !settaxa/!configtaxa)
function atualizarStatus() {
  client.user.setActivity(
    `☁️ ${formatBRL(rates.TIER1_PRICE_PER_100)} / 100 Robux | !ajuda`,
    { type: 3 } // 3 = Watching
  );
}

client.once(Events.ClientReady, () => {
  atualizarStatus();
  console.log(`✅ Bot online como ${client.user.tag}`);

  // Garante que os comandos personalizados salvos estejam registrados no Discord
  const { registrarTodos } = require('./utils/customSync');
  registrarTodos(client).then((res) => {
    const ok = res.filter((r) => r.ok).length;
    const falha = res.length - ok;
    if (falha > 0) {
      console.log(`[CustomSync] ${ok} comando(s) verificado(s), ${falha} com falha.`);
    }
  }).catch((error) => {
    console.error('[CustomSync] Erro ao sincronizar comandos no boot:', error?.message || error);
  });
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

  // Comandos personalizados (criados pelo /criarcomando)
  if (!command) {
    const custom = require('./utils/customCommands');
    const { buildResposta } = require('./utils/customCommandsPanel');
    const cmdCustom = custom.obter(interaction.commandName);
    if (cmdCustom) {
      try {
        const payload = buildResposta(cmdCustom);
        return await interaction.reply({ ...payload, flags: cmdCustom.ephemeral ? MessageFlags.Ephemeral : undefined });
      } catch (error) {
        console.error('[Comando custom]', error);
        return interaction.reply({ content: '❌ Erro ao executar o comando.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
    return;
  }

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

      if (!isAdmin(interaction.member, interaction.user.id)) {
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
      const admin = interaction.guild ? isAdmin(interaction.member, interaction.user.id) : false;
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
const { refreshPainelEstoque } = require('./utils/estoquePanelStore');
const painelCategoria = require('./prefixCommands/painelcategoria');
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

    // ----- admin: estadm:* -----
    if (interaction.isButton() && interaction.customId.startsWith('estadm:')) {
      if (!isAdmin(interaction.member, interaction.user.id)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
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
        const ok = estoqueDb.removeProduto(catId, prodId);
        if (ok) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return interaction.update({
          content: ok ? '🗑️ Produto removido.' : '❌ Produto não encontrado.',
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
        const ok = estoqueDb.removeCategoria(catId);
        if (ok) refreshPainelEstoque(client).catch(() => {});
        painelCategoria.refresh(client).catch(() => {});
        return interaction.update({
          content: ok
            ? `🗑️ Categoria **${cat.nome}** removida (com ${cat.produtos.length} produto(s)).`
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
      return;
    }

    // ----- modais do estoque -----
    if (interaction.isModalSubmit() && interaction.customId.startsWith('estmodal:')) {
      if (!isAdmin(interaction.member, interaction.user.id)) {
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

        const p = estoqueDb.addProduto(catId, { nome, valor, controlarQtd, quantidade });
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
      // Resposta ephemeral com o valor isolado em code block (facil de selecionar e copiar)
      return interaction.reply({
        content: `📋 **${item.nome}:**\n\`\`\`\n${item.valor}\n\`\`\`\n*Selecione o valor acima para copiar.*`,
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

// ----- Painel visual de embed -----

const { getSessao, limparSessao, buildEmbed, buildPainel } = require('./utils/embedPainel');

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
      if (!isAdmin(interaction.member, interaction.user.id)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }

      const estado = getSessao(donoId);

      // Abre modal para editar um campo
      const abrirModal = (campo, titulo, label, multiline = false) => {
        const modal = new ModalBuilder()
          .setCustomId(`embedmodal:${campo}:${donoId}`)
          .setTitle(titulo)
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('valor')
                .setLabel(label)
                .setStyle(multiline ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(campo !== 'imagem' && campo !== 'thumbnail' && campo !== 'autor' && campo !== 'rodape' && campo !== 'textofora' && campo !== 'fields' && campo !== 'cargos')
                .setValue(estado[campo] || '')
            )
          );
        return interaction.showModal(modal);
      };

      if (acao === 'titulo') return abrirModal('titulo', '📝 Título', 'Título da embed');
      if (acao === 'descricao') return abrirModal('descricao', '📄 Descrição', 'Texto da embed', true);
      if (acao === 'cor') return abrirModal('cor', '🎨 Cor', 'Nome ou #hex (ex: lilas ou #beb6ff)');
      if (acao === 'imagem') return abrirModal('imagem', '🖼️ Imagem', 'Link da imagem (opcional)');
      if (acao === 'thumbnail') return abrirModal('thumbnail', '🔳 Thumbnail', 'Link da thumbnail (opcional)');
      if (acao === 'autor') return abrirModal('autor', '👤 Autor', 'Nome do autor (opcional)');
      if (acao === 'rodape') return abrirModal('rodape', '📝 Rodapé', 'Texto do rodapé (opcional)');
      if (acao === 'textofora') return abrirModal('textofora', '💬 Texto fora', 'Mensagem fora da embed (opcional)');
      if (acao === 'fields') return abrirModal('fields', '➕ Adicionar Field', 'Título | valor (um por linha)');
      if (acao === 'cargos') {
        // Botao legado: nao faz nada (a selecao agora e pelo menu nativo abaixo)
        return interaction.reply({ content: '👥 Use o **menu de seleção de cargos** abaixo dos botões para escolher.', flags: MessageFlags.Ephemeral });
      }

      if (acao === 'preview') {
        return interaction.reply({ ...buildPainel(donoId), flags: MessageFlags.Ephemeral });
      }

      if (acao === 'enviar') {
        if (!estado.titulo && !estado.descricao) {
          return interaction.reply({ content: '❌ Preencha pelo menos o **título** ou a **descrição** antes de enviar.', flags: MessageFlags.Ephemeral });
        }
        const embed = buildEmbed(estado);
        const mencoes = estado.cargos.map((c) => `<@&${c}>`).join(' ');
        const conteudo = [estado.textoFora, mencoes].filter(Boolean).join(' ') || null;
        await interaction.channel.send({
          content: conteudo,
          embeds: [embed],
          allowedMentions: estado.cargos.length ? { roles: estado.cargos } : { parse: [] },
        });
        limparSessao(donoId);
        return interaction.update({ content: '✅ Embed enviada!', embeds: [], components: [] });
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
      if (!isAdmin(interaction.member, interaction.user.id)) {
        return interaction.reply({ content: '🔒 Somente administradores.', flags: MessageFlags.Ephemeral });
      }
      const estado = getSessao(donoId);
      estado.cargos = [...interaction.values]; // IDs dos cargos selecionados
      return interaction.update(buildPainel(donoId));
    }

    // Modais do painel de embed
    if (interaction.isModalSubmit() && interaction.customId.startsWith('embedmodal:')) {
      const partes = interaction.customId.split(':');
      const campo = partes[1];
      const donoId = partes[2];

      if (interaction.user.id !== donoId) {
        return interaction.reply({ content: '🔒 Este painel não é seu.', flags: MessageFlags.Ephemeral });
      }

      const estado = getSessao(donoId);
      const valor = interaction.fields.getTextInputValue('valor').trim();

      if (campo === 'cargos') {
        // Parse IDs de cargo separados por virgula
        estado.cargos = valor
          ? valor.split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s))
          : [];
      } else if (campo === 'fields') {
        // Formato: "Titulo | valor" por linha
        estado.fields = valor
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            const [name, ...v] = l.split('|');
            return { name: name.trim(), value: v.join('|').trim() || '\u200b', inline: true };
          })
          .slice(0, 25);
      } else {
        estado[campo] = valor || null;
      }

      return interaction.update(buildPainel(donoId));
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
