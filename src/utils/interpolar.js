function interpolar(texto, vars) {
  if (typeof texto !== 'string' || !texto) return texto;
  return texto
    .replace(/\{user\}/g, vars.user)
    .replace(/\{membro\}/g, vars.user)
    .replace(/\{server\}/g, vars.server)
    .replace(/\{guild\}/g, vars.server);
}

function interpolarEmbed(embed, vars) {
  if (!embed) return embed;
  if (embed.data) {
    // aceita tanto EmbedBuilder quanto objeto simples

    const d = embed.data;
    if (d.title) d.title = interpolar(d.title, vars);
    if (d.description) d.description = interpolar(d.description, vars);
    if (d.footer && d.footer.text) d.footer.text = interpolar(d.footer.text, vars);
    if (d.author && d.author.name) d.author.name = interpolar(d.author.name, vars);
    if (Array.isArray(d.fields)) {
      for (const f of d.fields) {
        if (f.name) f.name = interpolar(f.name, vars);
        if (f.value) f.value = interpolar(f.value, vars);
      }
    }
    if (Array.isArray(embed.fields)) {
      for (const f of embed.fields) {
        if (f.name) f.name = interpolar(f.name, vars);
        if (f.value) f.value = interpolar(f.value, vars);
      }
    }
    return embed;
  }
  if (embed.title) embed.title = interpolar(embed.title, vars);
  if (embed.description) embed.description = interpolar(embed.description, vars);
  if (embed.footer && embed.footer.text) embed.footer.text = interpolar(embed.footer.text, vars);
  if (embed.author && embed.author.name) embed.author.name = interpolar(embed.author.name, vars);
  if (Array.isArray(embed.fields)) {
    for (const f of embed.fields) {
      if (f.name) f.name = interpolar(f.name, vars);
      if (f.value) f.value = interpolar(f.value, vars);
    }
  }
  return embed;
}

module.exports = { interpolar, interpolarEmbed };