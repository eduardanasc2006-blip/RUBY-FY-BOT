import { EmbedBuilder } from 'discord.js';
import Usuario from '../db/models/Usuario.mjs';
import { embedErro } from '../utils/embeds.mjs';
import { gastarXP } from './xpSystem.mjs';

const LOJA = {
  molduras: [
    { id: 'padrao', nome: '⬜ Padrão', preco: 0 },
    { id: 'bronze', nome: '🟫 Bronze', preco: 1500 },
    { id: 'prata', nome: '⚪ Prata', preco: 3500 },
    { id: 'ouro', nome: '🟡 Ouro', preco: 7000 },
    { id: 'diamante', nome: '🔷 Diamante', preco: 12000 },
    { id: 'rubi', nome: '❤️ Rubi', preco: 18000 },
    { id: 'safira', nome: '💙 Safira', preco: 18000 },
    { id: 'esmeralda', nome: '💚 Esmeralda', preco: 18000 },
    { id: 'neon_roxa', nome: '💜 Neon Roxa', preco: 25000 },
    { id: 'neon_azul', nome: '💠 Neon Azul', preco: 25000 },
    { id: 'cosmica', nome: '🌌 Cósmica', preco: 40000 },
    { id: 'suprema', nome: '👑 Suprema', preco: 75000 },
  ],

  fundos: [
    { id: 'azul_claro', nome: '🔵 Azul Claro', preco: 1000 },
    { id: 'roxo', nome: '🟣 Roxo', preco: 1000 },
    { id: 'galaxia', nome: '🌌 Galáxia', preco: 5000 },
    { id: 'sakura', nome: '🌸 Sakura', preco: 5000 },
    { id: 'tempestade', nome: '🌩️ Tempestade', preco: 7000 },
    { id: 'anime', nome: '🎌 Anime', preco: 10000 },
    { id: 'gatos', nome: '🐱 Gatos', preco: 10000 },
    { id: 'lendario', nome: '✨ Lendário', preco: 25000 },
  ],

  consumiveis: [
    { id: 'vida_extra', nome: '❤️ Vida Extra (Quiz)', preco: 2000, tipo: 'quiz' },
    { id: 'dica', nome: '💡 Dica (Quiz)', preco: 1500, tipo: 'quiz' },
    { id: 'pulo', nome: '⏭️ Pular Pergunta', preco: 2500, tipo: 'quiz' },
    { id: 'letra_forca', nome: '🔤 Revelar Letra (Forca)', preco: 2000, tipo: 'forca' },
    { id: 'escudo', nome: '🛡️ Escudo de Erro', preco: 3000, tipo: 'forca' },
    { id: 'xp_boost', nome: '⚡ XP Boost (1.5x)', preco: 5000, tipo: 'xp' },
  ]
};

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const cfg = configs.get(msg.guild.id);
    const prefixo = cfg?.prefixo || '!';

    if (!msg.content.startsWith(prefixo)) return;

    const args = msg.content.slice(prefixo.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();

    const guildId = msg.guild.id;

    /* =========================
       !loja
    ========================= */
    if (cmd === 'loja') {
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🛒 Loja XP')
        .setDescription('Use XP para comprar itens e evoluir seu perfil e jogos.')
        .addFields(
          {
            name: '🎨 Molduras',
            value: LOJA.molduras.map(i => `${i.nome} — **${i.preco} XP**`).join('\n')
          },
          {
            name: '🖼️ Fundos',
            value: LOJA.fundos.map(i => `${i.nome} — **${i.preco} XP**`).join('\n')
          },
          {
            name: '🎮 Consumíveis',
            value: LOJA.consumiveis.map(i => `${i.nome} —
