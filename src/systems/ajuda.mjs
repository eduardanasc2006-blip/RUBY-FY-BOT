import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

const EXPIRACAO_MS = 5 * 60 * 1000;

const CATEGORIAS = {
  robux: {
    emoji: '💸', label: 'Robux & Conversão', cor: 0x00a2ff,
    comandos: [
      { cmd: '!robux <valor>',      desc: 'Converte BRL → Robux.' },
      { cmd: '!brl <valor>',        desc: 'Converte Robux → BRL.' },
      { cmd: '!taxa',               desc: 'Taxa atual de conversão.' },
      { cmd: '!simular <min> <max>',desc: 'Tabela de preços.' },
      { cmd: '!historico',          desc: 'Histórico de taxa.' },
      { cmd: '!comparar <robux>',   desc: 'Valor bruto vs líquido.' },
      { cmd: '!meta <robux>',       desc: 'Calculadora de meta.' },
    ],
  },
  roblox: {
    emoji: '🎮', label: 'Roblox', cor: 0x00c8ff,
    comandos: [
      { cmd: '!perfil <usuário>', desc: 'Perfil Roblox.' },
      { cmd: '!avatar <usuário>', desc: 'Avatar 2D/3D.' },
      { cmd: '!grupo <id>',      desc: 'Informações do grupo.' },
      { cmd: '!gamepass <id>',   desc: 'Informações de gamepass.' },
    ],
  },
  perfil: {
    emoji: '🖼️', label: 'Perfil & XP', cor: 0xa855f7,
    comandos: [
      { cmd: '!meuperfil [@user]', desc: 'Perfil completo (nível, conquistas, casamento...).' },
      { cmd: '!xp [@user]',        desc: 'XP e faixa atual.' },
      { cmd: '!rank [@user]',      desc: 'Nível e posição no ranking.' },
      { cmd: '!topxp',             desc: 'Top 10 XP do servidor.' },
      { cmd: '!topnivel',          desc: 'Top 10 por faixa de nível.' },
    ],
  },
  interacoes: {
    emoji: '🤝', label: 'Interações Sociais', cor: 0xa855f7,
    comandos: [
      { cmd: '!beijar @user',   desc: 'Beija alguém (+3 afinidade).' },
      { cmd: '!abracar @user',  desc: 'Abraça (+1 afinidade).' },
      { cmd: '!cafune @user',   desc: 'Cafuné (+2 afinidade).' },
      { cmd: '!acariciar @user',desc: 'Carinho (+2 afinidade).' },
      { cmd: '!dancar @user',   desc: 'Dança juntos (+1 afinidade).' },
      { cmd: '!elogiar @user',  desc: 'Elogia alguém.' },
      { cmd: '!proteger @user', desc: 'Protege alguém.' },
      { cmd: '!atacar @user',   desc: 'Ataca alguém.' },
      { cmd: '!tocaaqui @user', desc: 'High five!' },
      { cmd: '!bofetada @user', desc: 'Bofetada! 😤' },
      { cmd: '!xingar @user',   desc: 'Xinga alguém (diversão).' },
    ],
  },
  relacionamentos: {
    emoji: '💑', label: 'Relacionamentos', cor: 0xff69b4,
    comandos: [
      { cmd: '!casar @user',         desc: 'Pedido de casamento.' },
      { cmd: '!divorciar',           desc: 'Pedido de divórcio.' },
      { cmd: '!parceiro [@user]',    desc: 'Ver parceiro(a).' },
      { cmd: '!ship @u1 @u2',        desc: 'Compatibilidade entre dois usuários.' },
      { cmd: '!afinidade @user',     desc: 'Afinidade + classificação.' },
      { cmd: '!topafinidade',        desc: 'Ranking de casais por afinidade.' },
      { cmd: '!topcasais',           desc: 'Ranking de casais.' },
    ],
  },
  reputacao: {
    emoji: '⭐', label: 'Reputação', cor: 0xffd700,
    comandos: [
      { cmd: '!rep @user', desc: 'Dá +1 rep (1x por dia).' },
      { cmd: '!ranking',   desc: 'Top 10 reputação.' },
    ],
  },
  conquistas: {
    emoji: '🏆', label: 'Conquistas & Títulos', cor: 0xf1c40f,
    comandos: [
      { cmd: '!conquistas [@user]',    desc: 'Conquistas desbloqueadas (com progresso).' },
      { cmd: '!titulos',               desc: 'Títulos por raridade.' },
      { cmd: '!equipartitulo <nome>',  desc: 'Equipar título.' },
      { cmd: '!missoes',               desc: 'Missões diárias e semanais.' },
    ],
  },
  jogos: {
    emoji: '🎲', label: 'Jogos & Diversão', cor: 0x9b59b6,
    comandos: [
      { cmd: '!quiz [categoria]', desc: 'Quiz (+30 XP por acerto).' },
      { cmd: '!quizstats [@user]',desc: 'Estatísticas de quiz.' },
      { cmd: '!topquiz',          desc: 'Ranking quiz.' },
      { cmd: '!forca [categoria]',desc: 'Jogo da forca (+50 XP).' },
      { cmd: '!forcaranking',     desc: 'Ranking forca.' },
      { cmd: '!8ball <pergunta>', desc: 'Bola mágica.' },
      { cmd: '!dado [faces]',     desc: 'Rolar dado.' },
      { cmd: '!coinflip',         desc: 'Cara ou coroa.' },
      { cmd: '!ppt',              desc: 'Pedra, papel ou tesoura.' },
      { cmd: '!verdade / !desafio', desc: 'Verdade ou desafio.' },
    ],
  },
  admin: {
    emoji: '⚙️', label: 'Administração', cor: 0xe74c3c,
    comandos: [
      { cmd: '!config',                  desc: 'Painel de configurações do servidor.' },
      { cmd: '!setconfig <chave> <val>', desc: 'Alterar configuração.' },
      { cmd: '!setwelcome #canal',       desc: 'Canal de boas-vindas.' },
      { cmd: '!setwelcomemsg <texto>',   desc: 'Mensagem de boas-vindas ({user} {server} {count}).' },
      { cmd: '!setautorole @cargo',      desc: 'Cargo automático ao entrar.' },
      { cmd: '!setlevelrole <nv> @cargo',desc: 'Cargo por nível.' },
      { cmd: '!levelroles',              desc: 'Ver cargos por nível.' },
      { cmd: '!removelevelrole <nv>',    desc: 'Remover cargo de nível.' },
      { cmd: '!settaxa <valor>',         desc: 'Alterar taxa Robux.' },
      { cmd: '!anuncio <texto>',         desc: 'Fazer anúncio.' },
      { cmd: '!embed <titulo>|<desc>',   desc: 'Criar embed.' },
      { cmd: '!enquete <pergunta>',      desc: 'Criar enquete.' },
      { cmd: '!sorteio <min> <prêmio>',  desc: 'Criar sorteio.' },
      { cmd: '!limpar <qtd>',            desc: 'Apagar mensagens.' },
      { cmd: '!testwelcome',             desc: 'Testar boas-vindas.' },
    ],
  },
  servicos: {
    emoji: '🛍️', label: 'Serviços & Suporte', cor: 0xf39c12,
    comandos: [
      { cmd: '!catalogo / !servicos', desc: 'Ver catálogo.' },
      { cmd: '!preco <nome>',         desc: 'Preço do produto.' },
      { cmd: '!suporte / !ticket',    desc: 'Abrir ticket.' },
      { cmd: '!fecharticket',         desc: 'Fechar ticket.' },
      { cmd: '!denunciar @user',      desc: 'Denunciar usuário.' },
      { cmd: '!sugerir <texto>',      desc: 'Enviar sugestão.' },
    ],
  },
  stats: {
    emoji: '📊', label: 'Estatísticas', cor: 0xa855f7,
    comandos: [
      { cmd: '!stats',       desc: 'Estatísticas do servidor.' },
      { cmd: '!botinfo',     desc: 'Informações do FiskBot.' },
      { cmd: '!logs [tipo]', desc: 'Últimos logs (admin).' },
      { cmd: '!versao',      desc: 'Versão atual.' },
    ],
  },
};

function embedPrincipal() {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✨ FiskBot — Central de Comandos')
    .setDescription(
      '**Criado por Finix Yin**\n\n' +
      'Selecione uma categoria abaixo para ver os comandos.\n\n' +
      Object.values(CATEGORIAS).map(c => `${c.emoji} **${c.label}**`).join('\n')
    )
    .setFooter({ text: 'FiskBot • Selecione uma categoria no menu abaixo' })
    .setTimestamp();
}

function embedCategoria(id) {
  const cat = CATEGORIAS[id];
  if (!cat) return null;
  const linhas = cat.comandos.map(c => `\`${c.cmd}\`\n┗ ${c.desc}`).join('\n\n');
  const embed = new EmbedBuilder()
    .setColor(cat.cor)
    .setTitle(`${cat.emoji} ${cat.label}`)
    .setDescription(linhas || 'Nenhum comando disponível.')
    .setFooter({ text: 'FiskBot • Clique em ⬅ Voltar para o menu principal' })
    .setTimestamp();
  if (cat.extra) embed.addFields({ name: '\u200b', value: cat.extra });
  return embed;
}

function menuPrincipal(userId) {
  const opcoes = Object.entries(CATEGORIAS).map(([id, cat]) =>
    new StringSelectMenuOptionBuilder()
      .setValue(`ajuda_cat:${id}:${userId}`)
      .setLabel(cat.label)
      .setEmoji(cat.emoji)
  );
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ajuda_menu:${userId}`)
      .setPlaceholder('📂 Selecione uma categoria...')
      .addOptions(opcoes)
  );
}

function botaoVoltar(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ajuda_voltar:${userId}`)
      .setLabel('⬅ Voltar ao Menu Principal')
      .setStyle(ButtonStyle.Secondary)
  );
}

export const comandos = [
  { cmd: '!ajuda / !help / !comandos', desc: 'Menu interativo de todos os comandos.' },
];

export function register(client, configs) {
  const sessoes = new Map();

  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    if (cmd !== 'ajuda' && cmd !== 'help' && cmd !== 'comandos') return;

    try {
      const sent = await msg.reply({
        embeds: [embedPrincipal()],
        components: [menuPrincipal(msg.author.id)],
      });

      sessoes.set(sent.id, {
        userId: msg.author.id,
        timer: setTimeout(() => {
          sent.edit({ components: [] }).catch(() => {});
          sessoes.delete(sent.id);
        }, EXPIRACAO_MS),
      });
    } catch (e) {
      // Fallback: embed simples sem select menu
      const linhasSimples = Object.values(CATEGORIAS)
        .map(c => `${c.emoji} **${c.label}**: ${c.comandos.slice(0, 2).map(x => `\`${x.cmd.split(' ')[0]}\``).join(', ')}...`)
        .join('\n');
      await msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('✨ FiskBot — Comandos')
          .setDescription('**Criado por Finix Yin**\n\n' + linhasSimples)
          .setFooter({ text: 'Use !ajuda para o menu interativo completo' })
          .setTimestamp()],
      }).catch(() => {});
    }
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;
      const { customId } = interaction;

      if (interaction.isStringSelectMenu() && customId.startsWith('ajuda_menu:')) {
        const userId = customId.split(':')[1];
        if (interaction.user.id !== userId)
          return interaction.reply({ content: '❌ Este menu não é seu.', ephemeral: true });

        const [, catId] = interaction.values[0].split(':');
        const embed = embedCategoria(catId);
        if (!embed) return interaction.reply({ content: '❌ Categoria inválida.', ephemeral: true });

        const sessao = sessoes.get(interaction.message.id);
        if (sessao) clearTimeout(sessao.timer);
        sessoes.set(interaction.message.id, {
          userId,
          timer: setTimeout(() => {
            interaction.message.edit({ components: [] }).catch(() => {});
            sessoes.delete(interaction.message.id);
          }, EXPIRACAO_MS),
        });

        await interaction.update({ embeds: [embed], components: [botaoVoltar(userId)] });
      }

      if (interaction.isButton() && customId.startsWith('ajuda_voltar:')) {
        const userId = customId.split(':')[1];
        if (interaction.user.id !== userId)
          return interaction.reply({ content: '❌ Este menu não é seu.', ephemeral: true });

        const sessao = sessoes.get(interaction.message.id);
        if (sessao) clearTimeout(sessao.timer);
        sessoes.set(interaction.message.id, {
          userId,
          timer: setTimeout(() => {
            interaction.message.edit({ components: [] }).catch(() => {});
            sessoes.delete(interaction.message.id);
          }, EXPIRACAO_MS),
        });

        await interaction.update({ embeds: [embedPrincipal()], components: [menuPrincipal(userId)] });
      }
    } catch (e) {
      interaction.reply({ content: '❌ Ocorreu um erro. Tente novamente.', ephemeral: true }).catch(() => {});
    }
  });
}
