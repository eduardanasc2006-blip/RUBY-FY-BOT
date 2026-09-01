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

function listarVariaveis() {
  return VARIAVEIS.map((v) => `\`${v.chave}\` — ${v.descricao} (ex: ${v.exemplo}).`);
}

module.exports = { interpolar, listarVariaveis, VARIAVEIS };