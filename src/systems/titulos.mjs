import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import Conquista from '../db/models/Conquista.mjs';
import { embedErro, embedSucesso } from '../utils/embeds.mjs';
import { calcularNivel } from '../utils/nivelCalc.mjs';

const RARIDADES = {
  comum:    { emoji: '⚪', nome: 'Comum',    cor: 0x95a5a6 },
  incomum:  { emoji: '🟢', nome: 'Incomum',  cor: 0x2ecc71 },
  raro:     { emoji: '🔵', nome: 'Raro',     cor: 0x3498db },
  epico:    { emoji: '🟣', nome: 'Épico',    cor: 0x9b59b6 },
  lendario: { emoji: '🟡', nome: 'Lendário', cor: 0xf1c40f },
};

const TITULOS_DISPONIVEIS = [
  { id: 'novato',         nome: '🌱 Novato',         raridade: 'comum',    origem: 'nivel',     nivel: 1   },
  { id: 'aventureiro',    nome: '⚔️ Aventureiro',    raridade: 'comum',    origem: 'nivel',     nivel: 5   },
  { id: 'aprendiz',       nome: '📚 Aprendiz',       raridade: 'comum',    origem: 'nivel',     nivel: 10  },
  { id: 'ativo',          nome: '⭐ Ativo',           raridade: 'incomum',  origem: 'nivel',     nivel: 20  },
  { id: 'experiente',     nome: '🎖️ Experiente',     raridade: 'incomum',  origem: 'nivel',     nivel: 35  },
  { id: 'veterano',       nome: '🏆 Veterano',       raridade: 'incomum',  origem: 'nivel',     nivel: 50  },
  { id: 'elite',          nome: '💎 Elite',           raridade: 'raro',     origem: 'nivel',     nivel: 75  },
  { id: 'mestre',         nome: '👑 Mestre',         raridade: 'raro',     origem: 'nivel',     nivel: 100 },
  { id: 'lenda',          nome: '🌟 Lenda',          raridade: 'epico',    origem: 'nivel',     nivel: 150 },
  { id: 'mitico',         nome: '🔥 Mítico',         raridade: 'epico',    origem: 'nivel',     nivel: 200 },
  { id: 'divino',         nome: '⚡ Divino',         raridade: 'lendario', origem: 'nivel',     nivel: 300 },
  { id: 'mestre_quiz',    nome: '🧠 Mestre do Quiz', raridade: 'raro',     origem: 'conquista', conquista: 'quiz_100' },
  { id: 'alma_gemea',     nome: '💜 Alma Gêmea',     raridade: 'epico',    origem: 'conquista', conquista: 'alma_gemea' },
  { id: 'amigo_fiel',     nome: '🤝 Amigo Fiel',    raridade: 'incomum',  origem: 'conquista', conquista: 'mensagens_500' },
  { id: 'cupido_supremo', nome: '💘 Cupido Supremo', raridade: 'lendario', origem: 'conquista', conquista: 'primeiro_casamento', secreta: true },
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

    if (cmd === 'titulos') {
      const u = await Usuario.findOne({ userId: msg.author.id, guildId });
      const conquistasDoc = await Conquista.findOne({ userId: msg.author.id, guildId });
      const conquistas = conquistasDoc?.conquistas || [];
      const { nivel } = calcularNivel(u?.xp || 0);

      const disponiveis = TITULOS_DISPONIVEIS.filter(t => {
        if (t.secreta && !conquistas.includes(t.conquista)) return false;
        if (t.origem === 'nivel') return nivel >= t.nivel;
        if (t.origem === 'conquista') return conquistas.includes(t.conquista);
        return false;
      });

      if (disponiveis.length === 0) {
        return msg.reply({ embeds: [new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle('👑 Seus Títulos')
          .setDescription(`Você ainda não desbloqueou nenhum título.\n\n🌱 **Novato** — Nível 1 (você está no nível **${nivel}**)\nContinue enviando mensagens para ganhar XP!`)
          .setFooter({ text: 'Use !equipartitulo <nome> para equipar um título' })
          .setTimestamp()] });
      }

      const porRaridade = {};
      for (const t of disponiveis) {
        const r = RARIDADES[t.raridade] || RARIDADES.comum;
        if (!porRaridade[t.raridade]) porRaridade[t.raridade] = { r, titulos: [] };
        const equipado = u?.tituloEquipado === t.nome;
        porRaridade[t.raridade].titulos.push(`${equipado ? '✅' : '🔓'} **${t.nome}**${equipado ? ' *(equipado)*' : ''}`);
      }

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('👑 Seus Títulos')
        .setFooter({ text: `${disponiveis.length} desbloqueados • Use !equipartitulo <nome> para equipar` })
        .setTimestamp();

      for (const [, { r, titulos }] of Object.entries(porRaridade)) {
        embed.addFields({ name: `${r.emoji} ${r.nome}`, value: titulos.join('\n'), inline: false });
      }

      return msg.reply({ embeds: [embed] });
    }

    if (cmd === 'equipartitulo') {
      const nome = args.join(' ');
      if (!nome) return msg.reply({ embeds: [embedErro('Use: `!equipartitulo <nome do título>`')] });

      const titulo = TITULOS_DISPONIVEIS.find(t => t.nome.toLowerCase().includes(nome.toLowerCase()));
      if (!titulo) return msg.reply({ embeds: [embedErro('Título não encontrado. Use `!titulos` para ver os disponíveis.')] });

      const u = await Usuario.findOne({ userId: msg.author.id, guildId });
      const conquistas = (await Conquista.findOne({ userId: msg.author.id, guildId }))?.conquistas || [];
      const { nivel } = calcularNivel(u?.xp || 0);

      const disponivel = (titulo.origem === 'nivel' && nivel >= titulo.nivel) ||
        (titulo.origem === 'conquista' && conquistas.includes(titulo.conquista));
      if (!disponivel) return msg.reply({ embeds: [embedErro(`Você ainda não desbloqueou **${titulo.nome}**.`)] });

      await Usuario.updateOne(
        { userId: msg.author.id, guildId },
        { $set: { tituloEquipado: titulo.nome }, $setOnInsert: { userId: msg.author.id, guildId } },
        { upsert: true }
      );

      const rar = RARIDADES[titulo.raridade] || RARIDADES.comum;
      return msg.reply({ embeds: [new EmbedBuilder()
        .setColor(rar.cor)
        .setTitle('✅ Título Equipado!')
        .setDescription(`Você equipou o título ${rar.emoji} **${titulo.nome}** (${rar.nome})\n\nEle aparecerá no seu perfil.`)
        .setTimestamp()] });
    }
  });
}
