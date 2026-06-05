const recentesMsgs = new Map();
const ultimasMensagens = new Map();

export const comandos = [];

export function register(client, configs) {
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const chave = `${msg.author.id}:${msg.guild.id}`;
    const agora = Date.now();

    const lista = recentesMsgs.get(chave) || [];
    lista.push(agora);
    const recentes = lista.filter(t => agora - t < 5_000);
    recentesMsgs.set(chave, recentes);

    if (recentes.length > 5) {
      msg._isSpam = true;
    }

    const ultimas = ultimasMensagens.get(chave) || [];
    ultimas.unshift(msg.content);
    if (ultimas.length > 5) ultimas.pop();
    ultimasMensagens.set(chave, ultimas);

    const repetida = ultimas.filter(m => m === msg.content).length >= 3;
    if (repetida) {
      msg._isFarm = true;
    }
  });
}

export function isSpam(userId, guildId) {
  const chave = `${userId}:${guildId}`;
  const agora = Date.now();
  const lista = recentesMsgs.get(chave) || [];
  const recentes = lista.filter(t => agora - t < 5_000);
  return recentes.length > 5;
}

export function isFarm(userId, guildId) {
  const chave = `${userId}:${guildId}`;
  const ultimas = ultimasMensagens.get(chave) || [];
  return ultimas.length >= 3 && ultimas.every(m => m === ultimas[0]);
}
