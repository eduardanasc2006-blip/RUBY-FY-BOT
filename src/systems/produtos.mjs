import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Produto from '../db/models/Produto.mjs';
import { embedErro, embedSucesso } from '../utils/embeds.mjs';
import { isAdmin, isVendedor } from '../utils/permissions.mjs';
import { registrarLog } from '../utils/logger.mjs';

const STATUS_EMOJI = { disponivel: '🟢', poucas: '🟡', fechado: '🔴' };
const STATUS_TEXTO = { disponivel: 'Disponível', poucas: 'Poucas Vagas', fechado: 'Fechado' };

const sessoesCriacao = new Map();

export const comandos = [
  { cmd: '!catalogo / !servicos', desc: 'Ver catálogo de produtos/serviços.' },
  { cmd: '!preco <nome>',         desc: 'Ver preço de um produto.' },
];

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    if (cmd === 'catalogo' || cmd === 'servicos') {
      const produtos = await Produto.find({ guildId }).lean();
      if (!produtos.length) return msg.reply({ embeds: [embedErro('Nenhum produto cadastrado.')] });

      const porCategoria = {};
      for (const p of produtos) {
        if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
        porCategoria[p.categoria].push(p);
      }

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🛍️ Catálogo de Produtos')
        .setTimestamp();

      for (const [cat, prods] of Object.entries(porCategoria)) {
        const linhas = prods.map(p =>
          `${STATUS_EMOJI[p.status]} **${p.nome}** — ${STATUS_TEXTO[p.status]}`
        );
        embed.addFields({ name: `📦 ${cat}`, value: linhas.join('\n'), inline: false });
      }

      embed.setFooter({ text: `Use !preco <nome> para ver os preços detalhados` });
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'preco') {
      const nome = args.join(' ');
      if (!nome) return msg.reply({ embeds: [embedErro('Use: `!preco <nome do produto>`')] });

      const produto = await Produto.findOne({ guildId, nome: { $regex: nome, $options: 'i' } });
      if (!produto) return msg.reply({ embeds: [embedErro('Produto não encontrado.')] });

      const tabela = produto.tabela.map(t => `• **${t.quantidade}** — ${t.preco}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle(`${STATUS_EMOJI[produto.status]} ${produto.nome}`)
        .setDescription(produto.descricao || 'Sem descrição.')
        .addFields(
          { name: '📊 Tabela de Preços', value: tabela || 'Sem tabela de preços.', inline: false },
          { name: '📦 Categoria', value: produto.categoria, inline: true },
          { name: '🔘 Status', value: `${STATUS_EMOJI[produto.status]} ${STATUS_TEXTO[produto.status]}`, inline: true },
        )
        .setTimestamp();
      if (produto.imagem) embed.setThumbnail(produto.imagem);
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'addproduto' || cmd === 'addservico') {
      if (!isVendedor(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Sem permissão para adicionar produtos.')] });

      const sessaoKey = `prod:${msg.author.id}:${guildId}`;
      sessoesCriacao.set(sessaoKey, { etapa: 'nome', dados: {}, mensagens: [] });

      const instrucao = await msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xf39c12)
          .setTitle('➕ Adicionar Produto — Passo 1/5')
          .setDescription('Digite o **nome** do produto:\n*(ou `cancelar` para abortar)*')
          .setFooter({ text: 'Você tem 2 minutos para completar.' })]
      });
      sessoesCriacao.get(sessaoKey).mensagens.push(instrucao.id);

      setTimeout(() => sessoesCriacao.delete(sessaoKey), 120_000);
      return;
    }

    if (cmd === 'addtabela') {
      if (!isVendedor(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      const nomeProd = args.join(' ');
      if (!nomeProd) return msg.reply({ embeds: [embedErro('Use: `!addtabela <nome do produto>`')] });

      const produto = await Produto.findOne({ guildId, nome: { $regex: nomeProd, $options: 'i' } });
      if (!produto) return msg.reply({ embeds: [embedErro('Produto não encontrado.')] });

      const sessaoKey = `tab:${msg.author.id}:${guildId}`;
      sessoesCriacao.set(sessaoKey, { etapa: 'tabela', produtoId: produto._id, mensagens: [] });

      await msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xf39c12)
          .setTitle(`📊 Tabela para: ${produto.nome}`)
          .setDescription('Envie as entradas da tabela, uma por linha:\n```\n100 Robux = R$4,00\n500 Robux = R$18,00\n```\nDigite `salvar` quando terminar.')
          .setFooter({ text: 'Você tem 5 minutos.' })]
      });
      setTimeout(() => sessoesCriacao.delete(sessaoKey), 300_000);
      return;
    }

    if (cmd === 'delproduto') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores podem remover produtos.')] });
      const nome = args.join(' ');
      const produto = await Produto.findOneAndDelete({ guildId, nome: { $regex: nome, $options: 'i' } });
      if (!produto) return msg.reply({ embeds: [embedErro('Produto não encontrado.')] });
      await registrarLog(client, guildId, 'produto', msg.author.id, { descricao: `<@${msg.author.id}> removeu o produto **${produto.nome}**.` }, configs);
      return msg.reply({ embeds: [embedSucesso('Produto Removido', `**${produto.nome}** foi removido do catálogo.`)] });
    }

    const sessaoKey = `prod:${msg.author.id}:${guildId}`;
    const sessaoTab = `tab:${msg.author.id}:${guildId}`;

    if (sessoesCriacao.has(sessaoTab)) {
      const s = sessoesCriacao.get(sessaoTab);
      if (msg.content.toLowerCase() === 'salvar') {
        sessoesCriacao.delete(sessaoTab);
        return msg.reply({ embeds: [embedSucesso('Tabela salva!', 'A tabela de preços foi atualizada.')] });
      }
      const linhas = msg.content.split('\n').map(l => {
        const [qtd, preco] = l.split('=').map(x => x.trim());
        return qtd && preco ? { quantidade: qtd, preco } : null;
      }).filter(Boolean);
      if (linhas.length) {
        await Produto.findByIdAndUpdate(s.produtoId, { $push: { tabela: { $each: linhas } } });
        await msg.react('✅').catch(() => {});
      }
      return;
    }

    if (sessoesCriacao.has(sessaoKey)) {
      const s = sessoesCriacao.get(sessaoKey);
      if (msg.content.toLowerCase() === 'cancelar') {
        sessoesCriacao.delete(sessaoKey);
        return msg.reply({ embeds: [embedErro('Criação de produto cancelada.')] });
      }

      const etapas = {
        nome: async () => {
          s.dados.nome = msg.content.trim().slice(0, 50);
          s.etapa = 'categoria';
          await msg.reply({ embeds: [new EmbedBuilder().setColor(0xf39c12).setTitle('➕ Passo 2/5').setDescription(`**Categoria** do produto:\n(ex: Robux, Genshin, Free Fire, Minecraft, Outro)`)] });
        },
        categoria: async () => {
          s.dados.categoria = msg.content.trim().slice(0, 30);
          s.etapa = 'descricao';
          await msg.reply({ embeds: [new EmbedBuilder().setColor(0xf39c12).setTitle('➕ Passo 3/5').setDescription('**Descrição** do produto (ou `pular` para deixar em branco):')] });
        },
        descricao: async () => {
          s.dados.descricao = msg.content.toLowerCase() === 'pular' ? '' : msg.content.trim().slice(0, 200);
          s.etapa = 'imagem';
          await msg.reply({ embeds: [new EmbedBuilder().setColor(0xf39c12).setTitle('➕ Passo 4/5').setDescription('URL da **imagem** do produto (ou `pular`):')] });
        },
        imagem: async () => {
          s.dados.imagem = msg.content.toLowerCase() === 'pular' ? null : msg.content.trim();
          s.etapa = 'status';
          await msg.reply({ embeds: [new EmbedBuilder().setColor(0xf39c12).setTitle('➕ Passo 5/5').setDescription('**Status** do produto:\n`disponivel` | `poucas` | `fechado`')] });
        },
        status: async () => {
          const statusValidos = ['disponivel', 'poucas', 'fechado'];
          s.dados.status = statusValidos.includes(msg.content.toLowerCase()) ? msg.content.toLowerCase() : 'disponivel';
          const produto = await Produto.create({ guildId, ...s.dados });
          sessoesCriacao.delete(sessaoKey);
          await registrarLog(client, guildId, 'produto', msg.author.id, { descricao: `<@${msg.author.id}> adicionou o produto **${produto.nome}**.` }, configs);
          await msg.reply({ embeds: [embedSucesso('Produto Adicionado!', `**${produto.nome}** foi adicionado ao catálogo. Use \`!addtabela ${produto.nome}\` para adicionar preços.`)] });
        },
      };

      await etapas[s.etapa]?.();
    }
  });
}
