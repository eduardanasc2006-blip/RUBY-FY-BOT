import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { isDBConnected } from '../utils/dbGuard.mjs';

const GENEROS_VALIDOS = ['masculino', 'feminino', 'outro'];

const COR_GENERO = {
  masculino: 0x00bfff,
  feminino:  0xff69b4,
  outro:     0xa855f7,
};

const LABEL_GENERO = {
  masculino: 'Masculino',
  feminino:  'Feminino',
  outro:     'Outro',
};

export const comandos = [
  { cmd: '!genero',         desc: 'Ver gênero configurado no perfil.' },
  { cmd: '!setgenero <g>',  desc: 'Definir gênero (masculino/feminino/outro).' },
];

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;
    const cfg     = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';
    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const raw  = args.shift().toLowerCase();

    // Aceita !genero e !genero (com ou sem acento)
    const cmd = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (cmd !== 'genero') return;

    if (!isDBConnected())
      return msg.reply({ embeds: [embedErro('Banco de dados nao disponivel.')] });

    const guildId = msg.guild.id;
    const userId  = msg.author.id;
    const input   = (args[0] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // !genero (sem argumento) — mostrar genero atual
    if (!input) {
      const u = await Usuario.findOne({ userId, guildId });
      const g = u?.genero;
      const embed = new EmbedBuilder()
        .setColor(g ? COR_GENERO[g] : 0x5865f2)
        .setTitle('Genero Registrado')
        .setDescription(
          g
            ? `Seu genero atual e: **${LABEL_GENERO[g]}**\n\nUse \`!genero remover\` para apagar.`
            : 'Voce ainda nao definiu seu genero.\n\nUse:\n`!genero masculino`\n`!genero feminino`\n`!genero outro`'
        )
        .setFooter({ text: 'Isso afeta as cores do !ship' });
      return msg.reply({ embeds: [embed] });
    }

    // !genero remover
    if (input === 'remover' || input === 'remove') {
      await Usuario.findOneAndUpdate(
        { userId, guildId },
        { $set: { genero: null }, $setOnInsert: { userId, guildId } },
        { upsert: true }
      );
      return msg.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x2ecc71)
          .setDescription('Genero removido com sucesso.')],
      });
    }

    // !genero masculino / feminino / outro
    const genero = GENEROS_VALIDOS.find(g => g.startsWith(input));
    if (!genero) {
      return msg.reply({
        embeds: [embedErro(
          'Genero invalido.\nUse: `!genero masculino`, `!genero feminino`, `!genero outro` ou `!genero remover`'
        )],
      });
    }

    await Usuario.findOneAndUpdate(
      { userId, guildId },
      { $set: { genero }, $setOnInsert: { userId, guildId } },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setColor(COR_GENERO[genero])
      .setTitle('Genero Definido')
      .setDescription(`Seu genero foi definido como **${LABEL_GENERO[genero]}**.\n\nIsso sera refletido nas cores do \`!ship\`.`)
      .setFooter({ text: 'Use !genero para ver ou !genero remover para apagar' });

    return msg.reply({ embeds: [embed] });
  });
}
