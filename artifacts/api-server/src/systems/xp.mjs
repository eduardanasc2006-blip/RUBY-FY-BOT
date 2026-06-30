import Usuario from '../db/models/Usuario.mjs';

const XP_MIN = 10, XP_MAX = 25;
const XP_COOLDOWN_MS = 60_000;
const cooldowns = new Map();

function xpForLevel(lvl) { return lvl * 500; }
function randomXp() { return Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN; }

export async function processarXP(message) {
  if (!message.guild || message.author.bot) return;
  const userId = message.author.id, guildId = message.guild.id;
  const key = `${guildId}:${userId}`;
  const agora = Date.now();
  if (cooldowns.has(key) && agora - cooldowns.get(key) < XP_COOLDOWN_MS) return;
  cooldowns.set(key, agora);

  const xp = randomXp();
  const user = await Usuario.findOneAndUpdate(
    { userId, guildId },
    {
      $inc: { xpDisponivel: xp, xpTotal: xp, totalMensagens: 1 },
      $set: { ultimaMensagem: new Date().toISOString() }
    },
    { upsert: true, new: true }
  );
  if (!user) return;

  const xpNeeded = xpForLevel(user.nivel ?? 1);
  if ((user.xpDisponivel ?? 0) >= xpNeeded) {
    const novoNivel = (user.nivel ?? 1) + 1;
    await Usuario.updateOne({ userId, guildId }, {
      $set: { nivel: novoNivel, xpDisponivel: (user.xpDisponivel ?? 0) - xpNeeded }
    });
    message.channel.send(`🎉 **${message.author.username}** subiu para o **Nível ${novoNivel}**!`).catch(() => null);
  }
}

export function register(client) {
  if (client.__xpRegistrado) return;
  client.__xpRegistrado = true;
  client.on('messageCreate', async (msg) => {
    try { await processarXP(msg); } catch {}
  });
}
