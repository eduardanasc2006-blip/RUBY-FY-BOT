import { EmbedBuilder } from 'discord.js';
import { isAdmin } from '../utils/permissions.mjs';

export const comandos = [
  { cmd: '!sorteio <prêmio>', desc: 'Criar um sorteio (admin)' },
  { cmd: '!participar', desc: 'Participar do sorteio ativo' },
  { cmd: '!encerrarsorteio', desc: 'Encerrar sorteio e sortear vencedor (admin)' },
];

const sorteios = new Map();

export function register(client, configs) {
  if (client.__sorteioRegistrado) return;
  client.__sorteioRegistrado = true;

  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const cfg = configs.get(msg.guild.id);
    const p = cfg?.prefixo ?? '!';
    if (!msg.content.startsWith(p)) return;
    const parts = msg.content.slice(p.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const gid = msg.guild.id;

    if (cmd === 'sorteio') {
      if (!isAdmin(msg)) return msg.reply('❌ Apenas administradores.');
      const premio = parts.slice(1).join(' ');
      if (!premio) return msg.reply('❌ Informe o prêmio. Ex: `!sorteio Nitro`');
      sorteios.set(gid, { premio, participantes: new Set() });
      await msg.channel.send({ embeds: [
        new EmbedBuilder().setColor(0xf1c40f).setTitle('🎉 Sorteio iniciado!')
          .setDescription(`Prêmio: **${premio}**\nDigite \`${p}participar\` para participar!`)
      ]});
    }

    if (cmd === 'participar') {
      const sorteio = sorteios.get(gid);
      if (!sorteio) return msg.reply('❌ Nenhum sorteio ativo.');
      if (sorteio.participantes.has(msg.author.id)) return msg.reply('✅ Você já está participando!');
      sorteio.participantes.add(msg.author.id);
      await msg.reply(`✅ **${msg.author.username}** entrou no sorteio! (${sorteio.participantes.size} participantes)`);
    }

    if (cmd === 'encerrarsorteio') {
      if (!isAdmin(msg)) return msg.reply('❌ Apenas administradores.');
      const sorteio = sorteios.get(gid);
      if (!sorteio) return msg.reply('❌ Nenhum sorteio ativo.');
      if (!sorteio.participantes.size) return msg.reply('❌ Nenhum participante.');
      const arr = [...sorteio.participantes];
      const vencedorId = arr[Math.floor(Math.random() * arr.length)];
      sorteios.delete(gid);
      await msg.channel.send({ embeds: [
        new EmbedBuilder().setColor(0xf1c40f).setTitle('🎉 Vencedor do Sorteio!')
          .setDescription(`Parabéns <@${vencedorId}>! Você ganhou **${sorteio.premio}**! 🥳`)
      ]});
    }
  });
}
