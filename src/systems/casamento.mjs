import { EmbedBuilder } from 'discord.js';
import { getDB } from '../db/sqlite.mjs';
import { embedErro, embedSucesso } from '../utils/embeds.mjs';
import { checkCooldown } from '../utils/cooldown.mjs';

export const comandos = [
  { cmd: '!casar @user', desc: 'Pedir alguém em casamento' },
  { cmd: '!divorcio', desc: 'Encerrar casamento' },
  { cmd: '!casal', desc: 'Ver seu parceiro(a)' },
];

export function register(client, configs) {
  if (client.__casamentoRegistrado) return;
  client.__casamentoRegistrado = true;

  const pendentes = new Map();

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const parts = msg.content.slice(p.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const db = getDB();
    if (!db) return;

    if (cmd === 'casar') {
      const alvo = msg.mentions.users.first();
      if (!alvo || alvo.bot || alvo.id === msg.author.id) return msg.reply(embedErro('Mencione um usuário válido.'));
      const cd = checkCooldown(msg.author.id, 'casar', 60000);
      if (cd) return msg.reply(embedErro(`Aguarde ${cd}s para tentar novamente.`));

      const jaExiste = db.prepare(`SELECT id FROM casamentos WHERE guildId=? AND ativo=1 AND (userId1=? OR userId2=?)`).get(msg.guild.id, msg.author.id, msg.author.id);
      if (jaExiste) return msg.reply(embedErro('Você já é casado(a)! Use `!divorcio` primeiro.'));

      pendentes.set(`${msg.guild.id}:${alvo.id}`, { de: msg.author.id, para: alvo.id, guildId: msg.guild.id });
      await msg.channel.send({ embeds: [
        new EmbedBuilder().setColor(0xff5fa2).setTitle('💍 Pedido de casamento!')
          .setDescription(`${alvo}, **${msg.author.username}** quer se casar com você!\nDigite \`${p}aceitar\` para aceitar ou \`${p}recusar\` para recusar.`)
      ]});
    }

    if (cmd === 'aceitar') {
      const key = `${msg.guild.id}:${msg.author.id}`;
      const pedido = pendentes.get(key);
      if (!pedido) return;
      pendentes.delete(key);
      db.prepare(`INSERT INTO casamentos (guildId, userId1, userId2, ativo) VALUES (?,?,?,1)`).run(pedido.guildId, pedido.de, pedido.para);
      await msg.channel.send({ embeds: [new EmbedBuilder().setColor(0xff5fa2).setTitle('💍 Casamento realizado!').setDescription(`<@${pedido.de}> e <@${pedido.para}> agora são casados! 🎉`)] });
    }

    if (cmd === 'recusar') {
      const key = `${msg.guild.id}:${msg.author.id}`;
      if (pendentes.has(key)) { pendentes.delete(key); await msg.reply('💔 Pedido recusado.'); }
    }

    if (cmd === 'divorcio') {
      const row = db.prepare(`SELECT id FROM casamentos WHERE guildId=? AND ativo=1 AND (userId1=? OR userId2=?)`).get(msg.guild.id, msg.author.id, msg.author.id);
      if (!row) return msg.reply(embedErro('Você não está casado(a).'));
      db.prepare(`UPDATE casamentos SET ativo=0, dataFim=datetime('now') WHERE id=?`).run(row.id);
      await msg.reply({ embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle('💔 Divórcio concluído.').setDescription('O casamento foi encerrado.')] });
    }

    if (cmd === 'casal') {
      const row = db.prepare(`SELECT userId1, userId2, dataCasamento FROM casamentos WHERE guildId=? AND ativo=1 AND (userId1=? OR userId2=?)`).get(msg.guild.id, msg.author.id, msg.author.id);
      if (!row) return msg.reply(embedErro('Você não está casado(a).'));
      const parcId = row.userId1 === msg.author.id ? row.userId2 : row.userId1;
      const dias = Math.floor((Date.now() - new Date(row.dataCasamento).getTime()) / 86400000);
      await msg.reply({ embeds: [
        new EmbedBuilder().setColor(0xff5fa2).setTitle('💍 Seu Casal')
          .addFields({ name: 'Parceiro(a)', value: `<@${parcId}>`, inline: true }, { name: 'Juntos há', value: `${dias} dia(s)`, inline: true })
      ]});
    }
  });
}
