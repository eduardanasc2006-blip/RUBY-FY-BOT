import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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

    if (cmd === 'anuncio') {
      if (!isEquipe(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      const texto = args.join(' ');
      if (!texto) return msg.reply({ embeds: [embedErro('Use: `!anuncio <texto>`')] });
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c).setTitle('📢 Anúncio Oficial').setDescription(texto)
        .setAuthor({ name: msg.guild.name, iconURL: msg.guild.iconURL() }).setTimestamp();
      await msg.channel.send({ embeds: [embed] });
      await msg.delete().catch(() => {});
      await registrarLog(client, guildId, 'admin', msg.author.id, { descricao: `<@${msg.author.id}> fez um anúncio.` }, configs);
      return;
    }

    if (cmd === 'embed') {
      if (!isEquipe(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      const texto = args.join(' ');
      if (!texto) return msg.reply({ embeds: [embedErro('Use: `!embed <titulo>|<descrição>`')] });
      const [titulo, ...desc] = texto.split('|');
      await msg.channel.send({ embeds: [new EmbedBuilder().setColor(0xa855f7).setTitle(titulo.trim()).setDescription(desc.join('|').trim()).setTimestamp()] });
      await msg.delete().catch(() => {});
      return;
    }

    if (cmd === 'enquete') {
      if (!isEquipe(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      const pergunta = args.join(' ');
      if (!pergunta) return msg.reply({ embeds: [embedErro('Use: `!enquete <pergunta>`')] });
      const m = await msg.channel.send({ embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('📊 Enquete').setDescription(pergunta).setFooter({ text: 'Vote com ✅ ou ❌' }).setTimestamp()] });
      await m.react('✅'); await m.react('❌');
      await msg.delete().catch(() => {});
      return;
    }

    if (cmd === 'sorteio') {
      if (!isEquipe(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      const durMin = parseInt(args[0]) || 1;
      const premio = args.slice(1).join(' ') || 'Prêmio Surpresa';
      const m = await msg.channel.send({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('🎉 SORTEIO!').setDescription(`**Prêmio:** ${premio}\n\nReaja com 🎉 para participar!\n⏱️ Duração: **${durMin} minuto(s)**`).setTimestamp()] });
      await m.react('🎉');
      setTimeout(async () => {
        const mensagem = await m.fetch().catch(() => null);
        if (!mensagem) return;
        const reacao = mensagem.reactions.cache.get('🎉');
        if (!reacao) return;
        const usuarios = (await reacao.users.fetch()).filter(u => !u.bot);
        if (!usuarios.size) { await msg.channel.send({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription('❌ Ninguém participou.')] }); return; }
        const ganhador = [...usuarios.values()][Math.floor(Math.random() * usuarios.size)];
        await msg.channel.send({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('🎊 Resultado!').setDescription(`**🏆 Ganhador:** ${ganhador}\n**🎁 Prêmio:** ${premio}`).setTimestamp()] });
      }, durMin * 60_000);
      await msg.delete().catch(() => {});
      return;
    }

    if (cmd === 'limpar') {
      if (!isEquipe(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      const qtd = Math.min(parseInt(args[0]) || 10, 100);
      const deletadas = await msg.channel.bulkDelete(qtd + 1, true).catch(() => null);
      const qtdReal = deletadas?.size ? deletadas.size - 1 : 0;
      const m = await msg.channel.send({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription(`🗑️ **${qtdReal}** mensagens apagadas.`)] });
      setTimeout(() => m.delete().catch(() => {}), 3000);
      await registrarLog(client, guildId, 'admin', msg.author.id, { descricao: `<@${msg.author.id}> apagou ${qtdReal} mensagens.` }, configs);
      return;
    }

    // ── Boas-vindas ──────────────────────────────────────────────────────────

    if (cmd === 'setwelcome') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      if (semBanco(msg)) return;
      const canal = msg.mentions.channels.first();
      if (!canal) return msg.reply({ embeds: [embedErro('Mencione o canal.\nUso: `!setwelcome #canal`')] });
      await Config.findOneAndUpdate({ guildId }, { $set: { canalBemVindo: canal.id } }, { upsert: true });
      if (cfg) cfg.canalBemVindo = canal.id;
      return msg.reply({ embeds: [embedSucesso('Canal Definido', `Boas-vindas enviadas em ${canal}`)] });
    }

    if (cmd === 'setwelcomemsg') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      if (semBanco(msg)) return;
      const texto = args.join(' ');
      if (!texto) return msg.reply({ embeds: [embedErro('Use: `!setwelcomemsg <mensagem>`\nVariáveis: `{user}` `{server}` `{count}`')] });
      await Config.findOneAndUpdate({ guildId }, { $set: { mensagemBemVindo: texto } }, { upsert: true });
      if (cfg) cfg.mensagemBemVindo = texto;
      return msg.reply({ embeds: [embedSucesso('Mensagem Definida', `Mensagem salva com sucesso.`)] });
    }

    if (cmd === 'testwelcome') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      const dbCfg = await Config.findOne({ guildId }).catch(() => null);
      if (!dbCfg?.mensagemBemVindo) return msg.reply({ embeds: [embedErro('Nenhuma mensagem configurada.\nUse `!setwelcomemsg <texto>` primeiro.')] });
      await enviarBoasVindas(msg.channel, msg.member, msg.guild, dbCfg);
      return;
    }

    // ── Auto-Role ─────────────────────────────────────────────────────────────

    if (cmd === 'setautorole') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      if (semBanco(msg)) return;
      const cargo = msg.mentions.roles.first();
      if (!cargo) return msg.reply({ embeds: [embedErro('Mencione o cargo.\nUso: `!setautorole @cargo`')] });
      await Config.findOneAndUpdate({ guildId }, { $set: { autoRole: cargo.id } }, { upsert: true });
      if (cfg) cfg.autoRole = cargo.id;
      return msg.reply({ embeds: [embedSucesso('Auto-Role Configurado', `Novos membros receberão automaticamente o cargo <@&${cargo.id}>.`)] });
    }

    if (cmd === 'removeautorole') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      if (semBanco(msg)) return;
      await Config.findOneAndUpdate({ guildId }, { $unset: { autoRole: '' } }).catch(() => {});
      if (cfg) cfg.autoRole = null;
      return msg.reply({ embeds: [embedSucesso('Auto-Role Removido', 'Novos membros não receberão cargo automático.')] });
    }

    // ── Level Roles ───────────────────────────────────────────────────────────

    if (cmd === 'setlevelrole') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      if (semBanco(msg)) return;
      const nivel = parseInt(args[0]);
      const cargo = msg.mentions.roles.first();
      if (!nivel || !cargo) return msg.reply({ embeds: [embedErro('Use: `!setlevelrole <nível> @cargo`')] });
      await Config.findOneAndUpdate({ guildId }, { $pull: { levelRoles: { nivel } } }, { upsert: true });
      await Config.findOneAndUpdate({ guildId }, { $push: { levelRoles: { nivel, cargoId: cargo.id } } });
      return msg.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ Nível **${nivel}** → <@&${cargo.id}>`)] });
    }

    if (cmd === 'levelroles') {
      if (semBanco(msg)) return;
      const dbCfg = await Config.findOne({ guildId }).catch(() => null);
      const roles = dbCfg?.levelRoles?.sort((a, b) => a.nivel - b.nivel) || [];
      if (!roles.length) return msg.reply({ embeds: [embedErro('Nenhum cargo de nível configurado.\nUse `!setlevelrole <nível> @cargo`')] });
      const linhas = roles.map(r => `Nível **${r.nivel}** → <@&${r.cargoId}>`);
      return msg.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('🎖️ Cargos por Nível').setDescription(linhas.join('\n')).setFooter({ text: '!setlevelrole <nível> @cargo para configurar' }).setTimestamp()] });
    }

    if (cmd === 'removelevelrole') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      if (semBanco(msg)) return;
      const nivel = parseInt(args[0]);
      if (!nivel) return msg.reply({ embeds: [embedErro('Use: `!removelevelrole <nível>`')] });
      await Config.findOneAndUpdate({ guildId }, { $pull: { levelRoles: { nivel } } });
      return msg.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ Cargo do Nível **${nivel}** removido.`)] });
    }

    // ── Config ────────────────────────────────────────────────────────────────

    if (cmd === 'setconfig') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      if (semBanco(msg)) return;
      const [chave, valor] = args;
      const validos = ['canalLogs', 'canalSuporte', 'canalDenuncias', 'canalSugestoes', 'cargoEquipe', 'cargoSuporte', 'cargoVendedor', 'cargoAdmin', 'cargoServicos', 'prefixo'];
      if (!validos.includes(chave)) return msg.reply({ embeds: [embedErro(`Chave inválida. Válidas: \`${validos.join('`, `')}\``)] });
      const id = valor?.replace(/[<#@&!>]/g, '');
      await Config.findOneAndUpdate({ guildId }, { $set: { [chave]: id || valor } }, { upsert: true });
      if (cfg) cfg[chave] = id || valor;
      return msg.reply({ embeds: [embedSucesso('Configuração Atualizada', `**${chave}** → ${valor}`)] });
    }

    if (cmd === 'config' || cmd === 'painel') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Apenas administradores.')] });
      const dbCfg = await Config.findOne({ guildId }).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle('⚙️ Configurações do Servidor')
        .setThumbnail(msg.guild.iconURL({ size: 128 }))
        .setDescription(`**${msg.guild.name}**`)
        .addFields(
          { name: '🔖 Prefixo',         value: `\`${dbCfg?.prefixo || '!'}\``,                              inline: true },
          { name: '💸 Taxa Robux',       value: `R$${(dbCfg?.taxa || 38).toFixed(2)}/1k`,                    inline: true },
          { name: '📋 Canal Logs',       value: dbCfg?.canalLogs     ? `<#${dbCfg.canalLogs}>` : '—',        inline: true },
          { name: '🎫 Canal Suporte',    value: dbCfg?.canalSuporte  ? `<#${dbCfg.canalSuporte}>` : '—',     inline: true },
          { name: '🚨 Canal Denúncias',  value: dbCfg?.canalDenuncias ? `<#${dbCfg.canalDenuncias}>` : '—', inline: true },
          { name: '🌸 Canal Boas-vindas',value: dbCfg?.canalBemVindo ? `<#${dbCfg.canalBemVindo}>` : '—',   inline: true },
          { name: '👥 Cargo Equipe',     value: dbCfg?.cargoEquipe   ? `<@&${dbCfg.cargoEquipe}>` : '—',    inline: true },
          { name: '🤝 Auto-Role',        value: dbCfg?.autoRole      ? `<@&${dbCfg.autoRole}>` : '—',       inline: true },
          { name: '📝 Msg Boas-vindas',  value: dbCfg?.mensagemBemVindo ? '✅ Configurada' : '❌ Não definida', inline: true },
        )
        .setFooter({ text: 'Use !setconfig <chave> <valor> para alterar' })
        .setTimestamp();
      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'settaxa') {
      if (!isAdmin(msg.member, cfg)) return msg.reply({ embeds: [embedErro('Sem permissão.')] });
      if (semBanco(msg)) return;
      const taxa = parseFloat(args[0]?.replace(',', '.'));
      if (!taxa || isNaN(taxa)) return msg.reply({ embeds: [embedErro('Use: `!settaxa <valor>`')] });
      await Config.findOneAndUpdate({ guildId }, { $set: { taxa }, $push: { taxaHistorico: { taxa, adminId: msg.author.id, data: new Date() } } }, { upsert: true });
      if (cfg) cfg.taxa = taxa;
      await registrarLog(client, guildId, 'admin', msg.author.id, { descricao: `Taxa alterada para R$${taxa.toFixed(2)}` }, configs);
      return msg.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(`✅ Taxa atualizada: **R$${taxa.toFixed(2)}** por 1.000 Robux.`)] });
    }
  });

  // ── Auto-Role ao entrar ───────────────────────────────────────────────────
  client.on('guildMemberAdd', async (member) => {
    try {
      const dbCfg = await Config.findOne({ guildId: member.guild.id });
      if (!dbCfg) return;

      if (dbCfg.autoRole) {
        const cargo = member.guild.roles.cache.get(dbCfg.autoRole);
        if (cargo) await member.roles.add(cargo).catch(() => {});
      }

      if (dbCfg.canalBemVindo) {
        const canal = member.guild.channels.cache.get(dbCfg.canalBemVindo);
        if (canal) await enviarBoasVindas(canal, member, member.guild, dbCfg);
      }
    } catch {}
  });
}

async function enviarBoasVindas(canal, member, guild, dbCfg) {
  const memberCount = guild.memberCount;
  const texto = (dbCfg?.mensagemBemVindo || 'Olá, {user}! Bem-vindo(a) ao **{server}**! 🎉')
    .replace(/{user}/g, member.toString())
    .replace(/{server}/g, guild.name)
    .replace(/{count}/g, String(memberCount));

  const avatarUrl = member.user?.displayAvatarURL({ size: 256 })
    || member.displayAvatarURL?.({ size: 256 });

  const embed = new EmbedBuilder()
    .setColor(0xa855f7)
    .setTitle('🌸 Bem-vindo(a)!')
    .setDescription(texto)
    .setThumbnail(avatarUrl || null)
    .addFields(
      { name: '👤 Usuário', value: member.user?.username || member.toString(), inline: true },
      { name: '🎉 Membro', value: `#${memberCount.toLocaleString('pt-BR')}`, inline: true },
      { name: '📅 Conta criada', value: member.user?.createdAt
        ? `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>` : 'N/A', inline: true },
    )
    .setFooter({ text: guild.name })
    .setTimestamp();

  await canal.send({ embeds: [embed] }).catch(() => {});
}

