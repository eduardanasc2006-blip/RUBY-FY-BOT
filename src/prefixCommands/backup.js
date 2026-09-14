const fs = require('node:fs');
const { comandoPode } = require('../utils/permissions');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'backup',
  description: 'Envia na DM um backup completo dos dados do servidor (restrito a administradores)',
  usage: '!backup',

  async execute(message) {
    if (!message.guild || !comandoPode(message.member, message.author.id, 'backup')) {
      return message.reply('🔒 Somente administradores podem usar este comando.');
    }

    const guildId = message.guildId;
    const DATA = path.join(__dirname, '..', '..', 'data');
    const backup = {
      taxas: (() => {
        try { return JSON.parse(fs.readFileSync(path.join(DATA, 'rates.json'), 'utf8')); } catch { return null; }
      })(),
      data: new Date().toLocaleString('pt-BR'),
      guildId,
      versao: 2,
      dados: {},
    };

    // Lê um arquivo de data/ e guarda no backup (mesmo se não existir, segue).
    const ler = (caminhoRelativo) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(DATA, caminhoRelativo), 'utf8'));
      } catch {
        return null;
      }
    };

    // Por-guild diretamente
    backup.dados.estoque = ler(path.join('estoque', `${guildId}.json`));
    backup.dados.autorespostas = ler(path.join('autorespostas', `${guildId}.json`));
    backup.dados.painel_estoque = ler(path.join('painel_estoque', `${guildId}.json`));

    // Arquivos por-guild (chave { [guildId]: ... }) — puxa só a entrada desta guild
    const selecionarDaGuild = (obj) => {
      if (!obj) return null;
      if (obj[guildId] !== undefined) return obj[guildId];
      return null;
    };
    for (const [nome, caminho] of [
      ['carrinhos', 'carrinhos.json'],
      ['pedidos', 'pedidos.json'],
      ['proofs', 'proofs.json'],
      ['permissoes', 'permissoes.json'],
      ['welcome', 'welcome.json'],
      ['canal_avisos', 'canal_avisos.json'],
      ['metas', 'metas.json'],
      ['compras', 'compras.json'],
      ['log_compras', 'log_compras.json'],
      ['canal_comandos', 'canal_comandos.json'],
      ['modelos_embed', 'modelos_embed.json'],
    ]) {
      backup.dados[nome] = selecionarDaGuild(ler(caminho));
    }
    // Comandos personalizados por-guild
    backup.dados.comandos_custom = ler(path.join('comandos_custom', `${guildId}.json`));
    // Painel de conversão/taxas é GLOBAL por decisão do dono — incluir inteiro.
    backup.dados.panel = ler('panel.json');

    // Painéis fixos por-guild (data/paineis/<guildId>.json e subpastas se houver)
    const paineisDir = path.join(DATA, 'paineis');
    try {
      const paineisArq = path.join(paineisDir, `${guildId}.json`);
      const paineis = JSON.parse(fs.readFileSync(paineisArq, 'utf8'));
      backup.dados.paineis = paineis;
    } catch {
      // Tenta o caminho legado global
      backup.dados.paineis = ler('painel_categoria.json');
    }

    const arquivo = new AttachmentBuilder(
      Buffer.from(JSON.stringify(backup, null, 2)),
      { name: `backup-ruby-fy-${guildId}.json` }
    );

    try {
      await message.author.send({
        content: '☁️ **Backup do RUBY FY BOT**\nGuarde este arquivo — ele contém taxas, estoque, autorespostas, pedidos, proofs e configurações do servidor.',
        files: [arquivo],
      });
      return message.reply('✅ Backup completo enviado na sua DM!');
    } catch {
      return message.reply('❌ Não consegui te mandar DM. Ative "Permitir mensagens diretas" nas configurações de privacidade.');
    }
  },
};
