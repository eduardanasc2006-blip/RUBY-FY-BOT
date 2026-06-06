import { EmbedBuilder } from 'discord.js';
import Config from '../db/models/Config.mjs';
import { embedErro, embedSucesso } from '../utils/embeds.mjs';
import { isAdmin, isEquipe } from '../utils/permissions.mjs';
import { registrarLog } from '../utils/logger.mjs';
import { semBanco } from '../utils/dbGuard.mjs';

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    const guildId = msg.guild.id;

    // ─────────────────────────────
    // 📢 ANÚNCIO
    // ─────────────────────────────
    if (cmd === 'anuncio') {
      if (!isEquipe(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Sem permissão.')] });

      const texto = args.join(' ');
      if (!texto)
        return msg.reply({ embeds: [embedErro('Use: `!anuncio <texto>`')] });

      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('📢 Anúncio Oficial')
        .setDescription(texto)
        .setAuthor({ name: msg.guild.name, iconURL: msg.guild.iconURL() })
        .setTimestamp();

      await msg.channel.send({ embeds: [embed] });
      await msg.delete().catch(() => {});

      await registrarLog(client, guildId, 'admin', msg.author.id, {
        descricao: `<@${msg.author.id}> fez um anúncio.`
      }, configs);

      return;
    }

    // ─────────────────────────────
    // 📦 EMBED
    // ─────────────────────────────
    if (cmd === 'embed') {
      if (!isEquipe(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Sem permissão.')] });

      const texto = args.join(' ');
      if (!texto)
        return msg.reply({
          embeds: [embedErro('Use: `!embed <titulo> | <descrição>`')]
        });

      const [titulo, ...desc] = texto.split('|');

      await msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xa855f7)
            .setTitle(titulo?.trim() || 'Sem título')
            .setDescription(desc.join('|').trim() || 'Sem descrição')
            .setTimestamp()
        ]
      });

      await msg.delete().catch(() => {});
      return;
    }

    // ─────────────────────────────
    // 📊 ENQUETE
    // ─────────────────────────────
    if (cmd === 'enquete') {
      if (!isEquipe(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Sem permissão.')] });

      const pergunta = args.join(' ');
      if (!pergunta)
        return msg.reply({ embeds: [embedErro('Use: `!enquete <pergunta>`')] });

      const m = await msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📊 Enquete')
            .setDescription(pergunta)
            .setFooter({ text: 'Vote com 👍 ou 👎' })
            .setTimestamp()
        ]
      });

      await m.react('👍');
      await m.react('👎');

      await msg.delete().catch(() => {});
      return;
    }

    // ─────────────────────────────
    // 🎉 SORTEIO
    // ─────────────────────────────
    if (cmd === 'sorteio') {
      if (!isEquipe(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Sem permissão.')] });

      const durMin = parseInt(args[0]);
      const premio = args.slice(1).join(' ');

      if (!durMin || !premio)
        return msg.reply({
          embeds: [embedErro('Use: `!sorteio <tempo(min)> <prêmio>`')]
        });

      const m = await msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('🎉 SORTEIO')
            .setDescription(`**Prêmio:** ${premio}\n⏱️ ${durMin} min\n\nReaja com 🎉`)
            .setTimestamp()
        ]
      });

      await m.react('🎉');

      setTimeout(async () => {
        const mensagem = await m.fetch().catch(() => null);
        if (!mensagem) return;

        const reacao = mensagem.reactions.cache.get('🎉');
        if (!reacao) return;

        const usuarios = (await reacao.users.fetch()).filter(u => !u.bot);
        if (!usuarios.size) return;

        const ganhador =
          [...usuarios.values()][Math.floor(Math.random() * usuarios.size)];

        await msg.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle('🎊 Resultado')
              .setDescription(`🏆 ${ganhador}\n🎁 ${premio}`)
          ]
        });
      }, durMin * 60_000);

      await msg.delete().catch(() => {});
      return;
    }

    // ─────────────────────────────
    // 🧹 LIMPAR
    // ─────────────────────────────
    if (cmd === 'limpar') {
      if (!isEquipe(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Sem permissão.')] });

      const qtd = Math.min(parseInt(args[0]) || 10, 100);

      const deletadas = await msg.channel.bulkDelete(qtd + 1, true).catch(() => null);

      const qtdReal = deletadas?.size ? deletadas.size - 1 : 0;

      const m = await msg.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setDescription(`🗑️ ${qtdReal} mensagens apagadas`)
        ]
      });

      setTimeout(() => m.delete().catch(() => {}), 3000);
      return;
    }

    // ─────────────────────────────
    // ⚙️ CONFIGURAÇÕES
    // ─────────────────────────────
    if (cmd === 'config' || cmd === 'painel') {
      if (!isAdmin(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Apenas administradores.')] });

      const dbCfg = await Config.findOne({ guildId }).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle('⚙️ Configurações')
        .setDescription(`**${msg.guild.name}**`)
        .addFields(
          { name: '🔖 Prefixo', value: `\`${dbCfg?.prefixo || '!'}\``, inline: true },
          { name: '📋 Logs', value: dbCfg?.canalLogs ? `<#${dbCfg.canalLogs}>` : '—', inline: true },
          { name: '🎫 Suporte', value: dbCfg?.canalSuporte ? `<#${dbCfg.canalSuporte}>` : '—', inline: true },
          { name: '🚨 Denúncias', value: dbCfg?.canalDenuncias ? `<#${dbCfg.canalDenuncias}>` : '—', inline: true },
          { name: '🌸 Welcome', value: dbCfg?.canalBemVindo ? `<#${dbCfg.canalBemVindo}>` : '—', inline: true },
          { name: '👥 Equipe', value: dbCfg?.cargoEquipe ? `<@&${dbCfg.cargoEquipe}>` : '—', inline: true },
          { name: '🤝 Auto-role', value: dbCfg?.autoRole ? `<@&${dbCfg.autoRole}>` : '—', inline: true },
          { name: '📝 Msg Welcome', value: dbCfg?.mensagemBemVindo ? '✔️' : '❌', inline: true }
        )
        .setTimestamp();

      return msg.reply({ embeds: [embed] });
    }

    // ─────────────────────────────
    // ⚙️ SETCONFIG AJUDA
    // ─────────────────────────────
    if (cmd === 'setconfig') {
      if (!isAdmin(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Sem permissão.')] });

      if (!args.length) {
        return msg.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xa855f7)
              .setTitle('⚙️ setconfig')
              .setDescription('`!setconfig <chave> <valor>`')
          ]
        });
      }

      const [chave, valor] = args;

      const validos = [
        'canalLogs',
        'canalSuporte',
        'canalDenuncias',
        'canalSugestoes',
        'cargoEquipe',
        'cargoSuporte',
        'cargoVendedor',
        'cargoAdmin',
        'cargoServicos',
        'prefixo'
      ];

      if (!validos.includes(chave))
        return msg.reply({ embeds: [embedErro('Chave inválida')] });

      const id = valor?.replace(/[<#@&!>]/g, '');

      await Config.findOneAndUpdate(
        { guildId },
        { $set: { [chave]: id || valor } },
        { upsert: true }
      );

      if (cfg) cfg[chave] = id || valor;

      return msg.reply({
        embeds: [embedSucesso('Atualizado', `${chave} → ${valor}`)]
      });
    }

    // ─────────────────────────────
    // 🟣 SETWELCOME
    // ─────────────────────────────
    if (cmd === 'setwelcome') {
      if (!isAdmin(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Apenas admin.')] });

      const canal = msg.mentions.channels.first();
      if (!canal)
        return msg.reply({ embeds: [embedErro('Use: !setwelcome #canal')] });

      await Config.findOneAndUpdate(
        { guildId },
        { $set: { canalBemVindo: canal.id } },
        { upsert: true }
      );

      return msg.reply({ embeds: [embedSucesso('Welcome definido', `${canal}`)] });
    }

    // ─────────────────────────────
    // 🟣 SETWELCOMEMSG
    // ─────────────────────────────
    if (cmd === 'setwelcomemsg') {
      if (!isAdmin(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Apenas admin.')] });

      const texto = args.join(' ');
      if (!texto)
        return msg.reply({ embeds: [embedErro('Use: !setwelcomemsg <texto>')] });

      await Config.findOneAndUpdate(
        { guildId },
        { $set: { mensagemBemVindo: texto } },
        { upsert: true }
      );

      return msg.reply({ embeds: [embedSucesso('Mensagem salva')] });
    }

    // ─────────────────────────────
    // 🟣 SETAUTOROLE
    // ─────────────────────────────
    if (cmd === 'setautorole') {
      if (!isAdmin(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Apenas admin.')] });

      const cargo = msg.mentions.roles.first();
      if (!cargo)
        return msg.reply({ embeds: [embedErro('Use: !setautorole @cargo')] });

      await Config.findOneAndUpdate(
        { guildId },
        { $set: { autoRole: cargo.id } },
        { upsert: true }
      );

      return msg.reply({ embeds: [embedSucesso('Auto-role definido')] });
    }

    // ─────────────────────────────
    // 🟣 REMOVEAUTOROLE
    // ─────────────────────────────
    if (cmd === 'removeautorole') {
      if (!isAdmin(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Apenas admin.')] });

      await Config.findOneAndUpdate(
        { guildId },
        { $unset: { autoRole: '' } }
      );

      return msg.reply({ embeds: [embedSucesso('Auto-role removido')] });
    }

    // ─────────────────────────────
    // 🟣 TESTWELCOME
    // ─────────────────────────────
    if (cmd === 'testwelcome') {
      if (!isAdmin(msg.member, cfg))
        return msg.reply({ embeds: [embedErro('Apenas admin.')] });

      const dbCfg = await Config.findOne({ guildId });

      if (!dbCfg?.mensagemBemVindo)
        return msg.reply({ embeds: [embedErro('Sem mensagem')] });

      await msg.reply({ content: 'Teste enviado.' });
    }
  });
        }

  export const comandos = [
    { cmd: '!anuncio <msg>',        desc: 'Faz um anúncio no canal configurado.' },
    { cmd: '!embed <título|msg>',   desc: 'Envia uma mensagem em embed.' },
    { cmd: '!enquete <pergunta>',   desc: 'Cria uma enquete com reações.' },
    { cmd: '!sorteio <prêmio>',     desc: 'Inicia um sorteio no servidor.' },
    { cmd: '!limpar <n>',           desc: 'Apaga até 100 mensagens do canal.' },
    { cmd: '!config',               desc: 'Exibe as configurações do servidor.' },
    { cmd: '!setconfig',            desc: 'Configura opções do servidor.' },
    { cmd: '!setwelcome <canal>',   desc: 'Define o canal de boas-vindas.' },
    { cmd: '!setwelcomemsg <msg>',  desc: 'Define a mensagem de boas-vindas.' },
    { cmd: '!setautorole <cargo>',  desc: 'Define o cargo automático para novos membros.' },
    { cmd: '!removeautorole',       desc: 'Remove o cargo automático.' },
    { cmd: '!testwelcome',          desc: 'Testa a mensagem de boas-vindas.' },
  ];
