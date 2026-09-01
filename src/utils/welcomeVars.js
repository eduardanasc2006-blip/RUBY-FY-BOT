// ---- Variáveis do sistema de boas-vindas ----
// Usadas em mensagens e embeds. Processadas na hora da entrada (GuildMemberAdd).

const VARIAVEIS = [
  { chave: `<@user>`, descricao: `Menção do usuário que entrou`, exemplo: `@fulano` },
  { chave: `<user>`, descricao: `Nome de exibição do usuário`, exemplo: `Fulano` },
  { chave: `<username>`, descricao: `Nome do usuário (sem apelido)`, exemplo: `fulano123` },
  { chave: `<user_id>`, descricao: `ID do usuário`, exemplo: `123456789` },
  { chave: `<@server>`, descricao: `Menção do servidor`, exemplo: `@MeuServidor` },
  { chave: `<server>`, descricao: `Nome do servidor`, exemplo: `MeuServidor` },
  { chave: `<server_id>`, descricao: `ID do servidor`, exemplo: `987654321` },
  { chave: `<member_count>`, descricao: `Total de membros`, exemplo: `42` },
];

function interpolar(texto, usuario, guild) {
  if (typeof texto !== `string`) return texto;
  if (typeof usuario !== `undefined` && usuario !== null) {
    texto = texto.replaceAll(`<@user>`, `<@${usuario.id}>`);
    texto = texto.replaceAll(`<user>`, `${usuario.displayName || usuario.username || `membro`}`);
    texto = texto.replaceAll(`<username>`, `${usuario.username || `membro`}`);
    texto = texto.replaceAll(`<user_id>`, `${usuario.id}`);
  }
  if (typeof guild !== `undefined` && guild !== null) {
    texto = texto.replaceAll(`<@server>`, `<@${guild.id}>`);
    texto = texto.replaceAll(`<server>`, `${guild.name || `servidor`}`);
    texto = texto.replaceAll(`<server_id>`, `${guild.id}`);
    texto = texto.replaceAll(`<member_count>`, `${guild.memberCount ?? ``}`);
  }
  return texto;
}

function interpolarEmbed(embed, usuario, guild) {
  if (!embed) return embed;
  const d = embed.data ? embed.data : embed;
  if (d.title) d.title = interpolar(d.title, usuario, guild);
  if (d.description) d.description = interpolar(d.description, usuario, guild);
  if (d.footer && d.footer.text) d.footer.text = interpolar(d.footer.text, usuario, guild);
  if (d.author && d.author.name) d.author.name = interpolar(d.author.name, usuario, guild);
  if (Array.isArray(d.fields)) {
    for (const f of d.fields) {
      if (f.name) f.name = interpolar(f.name, usuario, guild);
      if (f.value) f.value = interpolar(f.value, usuario, guild);
    }
  }
  return embed;
}

function listarVariaveis() {
  return VARIAVEIS.map((v) => `\`${v.chave}\` — ${v.descricao} (ex: ${v.exemplo}).`);
}

module.exports = { interpolar, interpolarEmbed, listarVariaveis, VARIAVEIS };