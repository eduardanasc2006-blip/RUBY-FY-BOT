import {
  Client,
  GatewayIntentBits,
  Message,
  Events,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} from "discord.js";
import { logger } from "../lib/logger";
import { getCurrentRate, getHistory, updateRate, type RateEntry } from "./store";

// ── Cooldown ──────────────────────────────────────────────────────────────────

const COOLDOWN_MS = 3000;
const cooldowns = new Map<string, number>();

function isOnCooldown(userId: string): boolean {
  return Date.now() - (cooldowns.get(userId) ?? 0) < COOLDOWN_MS;
}

function setCooldown(userId: string): void {
  cooldowns.set(userId, Date.now());
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const stats = {
  startedAt: new Date(),
  robux: 0,
  brl: 0,
  simular: 0,
  gamepass: 0,
};

function totalConversions(): number {
  return stats.robux + stats.brl + stats.simular + stats.gamepass;
}

function formatUptime(): string {
  const ms = Date.now() - stats.startedAt.getTime();
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function robuxPerBrl(rate: RateEntry): number {
  return rate.robux / rate.brl;
}

function brlToRobux(brl: number, rate: RateEntry): number {
  return Math.floor(brl * robuxPerBrl(rate));
}

function robuxToBrl(robux: number, rate: RateEntry): number {
  return robux / robuxPerBrl(rate);
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRobux(value: number): string {
  return value.toLocaleString("pt-BR");
}

function rateLabel(rate: RateEntry): string {
  return `${formatRobux(rate.robux)} Robux = ${formatBrl(rate.brl)}`;
}

function footerText(rate: RateEntry): string {
  return `Taxa atual: ${rateLabel(rate)}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseNumber(raw: string): number {
  let s = raw.trim().replace(/^R\$\s*/i, "");
  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  } else if (s.includes(".")) {
    const parts = s.split(".");
    if (parts[1] && parts[1].length === 3) s = s.replace(/\./g, "");
  }
  return parseFloat(s);
}

// ── Roblox helpers ────────────────────────────────────────────────────────────

function extractGamepassId(input: string): string | null {
  const urlMatch = input.match(/game-pass\/(\d+)/i);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
}

// ── Roblox Profile ────────────────────────────────────────────────────────────

interface RobloxProfile {
  id: number;
  name: string;
  displayName: string;
  description: string;
  created: string;
  isBanned: boolean;
  avatarUrl: string | null;
  friendsCount: number;
  followersCount: number;
  followingsCount: number;
}

async function fetchRobloxProfile(username: string): Promise<RobloxProfile | null> {
  try {
    const lookupRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (!lookupRes.ok) return null;
    const lookupData = await lookupRes.json() as { data?: Array<{ id: number; name: string; displayName: string }> };
    const user = lookupData.data?.[0];
    if (!user) return null;

    const [infoRes, friendsRes, followersRes, followingsRes, avatarRes] = await Promise.allSettled([
      fetch(`https://users.roblox.com/v1/users/${user.id}`, { headers: { "Accept": "application/json" } }),
      fetch(`https://friends.roblox.com/v1/users/${user.id}/friends/count`, { headers: { "Accept": "application/json" } }),
      fetch(`https://friends.roblox.com/v1/users/${user.id}/followers/count`, { headers: { "Accept": "application/json" } }),
      fetch(`https://friends.roblox.com/v1/users/${user.id}/followings/count`, { headers: { "Accept": "application/json" } }),
      fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png`, { headers: { "Accept": "application/json" } }),
    ]);

    let description = "", created = "", isBanned = false;
    if (infoRes.status === "fulfilled" && infoRes.value.ok) {
      const info = await infoRes.value.json() as { description?: string; created?: string; isBanned?: boolean };
      description = info.description ?? "";
      created = info.created ?? "";
      isBanned = info.isBanned ?? false;
    }
    let friendsCount = 0;
    if (friendsRes.status === "fulfilled" && friendsRes.value.ok) {
      const d = await friendsRes.value.json() as { count?: number };
      friendsCount = d.count ?? 0;
    }
    let followersCount = 0;
    if (followersRes.status === "fulfilled" && followersRes.value.ok) {
      const d = await followersRes.value.json() as { count?: number };
      followersCount = d.count ?? 0;
    }
    let followingsCount = 0;
    if (followingsRes.status === "fulfilled" && followingsRes.value.ok) {
      const d = await followingsRes.value.json() as { count?: number };
      followingsCount = d.count ?? 0;
    }
    let avatarUrl: string | null = null;
    if (avatarRes.status === "fulfilled" && avatarRes.value.ok) {
      const d = await avatarRes.value.json() as { data?: Array<{ imageUrl?: string }> };
      avatarUrl = d.data?.[0]?.imageUrl ?? null;
    }

    return { id: user.id, name: user.name, displayName: user.displayName, description, created, isBanned, avatarUrl, friendsCount, followersCount, followingsCount };
  } catch {
    return null;
  }
}

// ── Reputação ─────────────────────────────────────────────────────────────────

interface RepData {
  rep: number;
  givenTo: Map<string, number>; // targetId → timestamp of last rep given
}

const repStore = new Map<string, RepData>();

function getRepData(userId: string): RepData {
  if (!repStore.has(userId)) repStore.set(userId, { rep: 0, givenTo: new Map() });
  return repStore.get(userId)!;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function canGiveRep(giverId: string, targetId: string): boolean {
  const data = getRepData(giverId);
  const last = data.givenTo.get(targetId) ?? 0;
  return Date.now() - last >= ONE_DAY_MS;
}

function giveRep(giverId: string, targetId: string): void {
  const giver = getRepData(giverId);
  giver.givenTo.set(targetId, Date.now());
  const target = getRepData(targetId);
  target.rep += 1;
}

function repRank(rep: number): string {
  if (rep >= 100) return "👑 Lendário";
  if (rep >= 50) return "💎 Diamante";
  if (rep >= 25) return "🥇 Ouro";
  if (rep >= 10) return "🥈 Prata";
  if (rep >= 3) return "🥉 Bronze";
  return "🌱 Novato";
}

// ── Social: Casamentos ────────────────────────────────────────────────────────

const marriages = new Map<string, string>();

// ── Social: Mensagens aleatórias ──────────────────────────────────────────────

const msgAbraco = [
  "deu um abraço apertado em",
  "correu e abraçou forte",
  "envolveu com um abraço enorme",
  "deu o abraço mais fofo do dia para",
  "apertou bem forte com carinho",
];

const msgBeijo = [
  "deu um beijinho em",
  "mandou um beijo cheio de carinho para",
  "deu um selinho em",
  "beijou na bochecha de",
  "mandou um beijo voando para",
];

const msgHigh5 = [
  "deu um high five épico para",
  "bateu um high five empolgado com",
  "mandou aquele high five certeiro para",
  "veio com tudo e deu um high five em",
];

const msgElogio = [
  "é incrível e merece muito reconhecimento! 🌟",
  "é a pessoa mais legal do servidor! 💙",
  "ilumina qualquer ambiente que entra! ☀️",
  "tem um coração enorme! 💛",
  "é pura energia boa! ✨",
  "deixa o servidor muito mais divertido! 🎉",
  "é uma pessoa especial e única! 💎",
  "tem um talento que impressiona! 🚀",
  "merece todo o sucesso do mundo! 🏆",
  "é simplesmente demais! 🔥",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shipScore(id1: string, id2: string): number {
  const combined = [id1, id2].sort().join("");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % 101;
}

function shipBar(score: number): string {
  const filled = Math.round(score / 10);
  return "❤️".repeat(filled) + "🖤".repeat(10 - filled);
}

// ── Permissions ───────────────────────────────────────────────────────────────

function isAdmin(message: Message): boolean {
  if (!message.member) return false;
  return (
    message.member.permissions.has(PermissionFlagsBits.Administrator) ||
    message.member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

// ── Bot entry point ───────────────────────────────────────────────────────────

export function startBot(): void {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    logger.warn("DISCORD_BOT_TOKEN not set — Discord bot will not start");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info({ tag: c.user.tag }, "Discord bot online");

    const getActivities = (): Array<{ name: string; type: import("discord.js").ActivityType }> => {
      const { ActivityType } = require("discord.js") as typeof import("discord.js");
      const rate = getCurrentRate();
      const brl = robuxToBrl(1000, rate);
      const brlFmt = brl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      return [
        { name: `1.000 Robux = ${brlFmt}`, type: ActivityType.Watching },
        { name: "!ajuda para ver comandos", type: ActivityType.Playing },
        { name: "Roblox ↔ BRL em tempo real", type: ActivityType.Watching },
        { name: "!casar | !rep | !ship", type: ActivityType.Playing },
      ];
    };

    let idx = 0;
    const rotate = () => {
      const activities = getActivities();
      const act = activities[idx % activities.length];
      c.user.setActivity(act.name, { type: act.type });
      idx++;
    };
    rotate();
    setInterval(rotate, 30_000);
  });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const lower = content.toLowerCase();

    if (!lower.startsWith("!")) return;

    if (isOnCooldown(message.author.id)) {
      await message.react("⏳").catch(() => null);
      return;
    }

    try {
      const rate = getCurrentRate();

      // ── !ping ────────────────────────────────────────────────────────────
      if (lower === "!ping") {
        setCooldown(message.author.id);
        const sent = await message.reply({ embeds: [
          new EmbedBuilder().setColor(Colors.Blurple).setTitle("🏓 Pong!").setDescription("Calculando..."),
        ]});
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setTitle("🏓 Pong!")
            .addFields(
              { name: "Latência", value: `${latency}ms`, inline: true },
              { name: "API", value: `${Math.round(client.ws.ping)}ms`, inline: true },
            ),
        ]});
        return;
      }

      // ── !status ──────────────────────────────────────────────────────────
      if (lower === "!status") {
        setCooldown(message.author.id);
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("📈 Status do Bot")
            .addFields(
              { name: "⏱️ Online há", value: formatUptime(), inline: true },
              { name: "🔄 Conversões feitas", value: totalConversions().toLocaleString("pt-BR"), inline: true },
              { name: "\u200b", value: "\u200b", inline: true },
              { name: "💸 !robux", value: stats.robux.toLocaleString("pt-BR"), inline: true },
              { name: "💰 !brl", value: stats.brl.toLocaleString("pt-BR"), inline: true },
              { name: "📊 !simular", value: stats.simular.toLocaleString("pt-BR"), inline: true },
              { name: "🎮 !gamepass", value: stats.gamepass.toLocaleString("pt-BR"), inline: true },
            )
            .setFooter({ text: footerText(rate) })
            .setTimestamp(),
        ]});
        return;
      }

      // ── !robux <brl> ─────────────────────────────────────────────────────
      if (lower.startsWith("!robux")) {
        setCooldown(message.author.id);
        const parts = content.split(/\s+/);
        if (parts.length < 2) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Use: `!robux <valor em R$>` — Ex: `!robux 100`")] });
          return;
        }
        const brl = parseNumber(parts[1]);
        if (isNaN(brl) || brl <= 0) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Valor inválido. Ex: `!robux 100`")] });
          return;
        }
        stats.robux++;
        const robux = brlToRobux(brl, rate);
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("💸 BRL → Robux")
            .addFields(
              { name: "Você paga", value: formatBrl(brl), inline: true },
              { name: "Você recebe", value: `${formatRobux(robux)} Robux`, inline: true },
            )
            .setFooter({ text: footerText(rate) }),
        ]});
        return;
      }

      // ── !brl <robux> ─────────────────────────────────────────────────────
      if (lower.startsWith("!brl")) {
        setCooldown(message.author.id);
        const parts = content.split(/\s+/);
        if (parts.length < 2) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Use: `!brl <quantidade de Robux>` — Ex: `!brl 1000`")] });
          return;
        }
        const robux = parseNumber(parts[1]);
        if (isNaN(robux) || robux <= 0) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Valor inválido. Ex: `!brl 1000`")] });
          return;
        }
        stats.brl++;
        const brl = robuxToBrl(robux, rate);
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Gold)
            .setTitle("💰 Robux → BRL")
            .addFields(
              { name: "Quantidade", value: `${formatRobux(Math.round(robux))} Robux`, inline: true },
              { name: "Valor", value: formatBrl(brl), inline: true },
            )
            .setFooter({ text: footerText(rate) }),
        ]});
        return;
      }

      // ── !taxa ─────────────────────────────────────────────────────────────
      if (lower === "!taxa") {
        setCooldown(message.author.id);
        const perBrl = robuxPerBrl(rate);
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Blue)
            .setTitle("📊 Taxa atual de Robux")
            .addFields(
              { name: `${formatRobux(rate.robux)} Robux`, value: formatBrl(rate.brl), inline: true },
              { name: "1 Robux", value: formatBrl(rate.brl / rate.robux), inline: true },
              { name: "R$ 1,00", value: `~${formatRobux(Math.round(perBrl))} Robux`, inline: true },
            ),
        ]});
        return;
      }

      // ── !historico ────────────────────────────────────────────────────────
      if (lower === "!historico") {
        setCooldown(message.author.id);
        const history = getHistory();
        if (history.length === 0) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Grey).setTitle("📋 Histórico de taxas").setDescription("Nenhuma alteração registrada ainda.")] });
          return;
        }
        const lines = history.slice().reverse().map((entry, i) =>
          `**${i + 1}.** \`${formatDateTime(entry.changedAt)}\` — **${entry.changedBy}**\n` +
          `↳ ${rateLabel(entry.before)} → **${rateLabel(entry.after)}**`
        ).join("\n\n");
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Purple)
            .setTitle(`📋 Histórico de taxas (últimas ${history.length})`)
            .setDescription(lines),
        ]});
        return;
      }

      // ── !simular <v1> <v2> ... ────────────────────────────────────────────
      if (lower.startsWith("!simular")) {
        setCooldown(message.author.id);
        const parts = content.split(/\s+/).slice(1);
        if (parts.length === 0) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Use: `!simular <val1> <val2> ...` — Ex: `!simular 50 100 200 500`")] });
          return;
        }
        const MAX_VALUES = 8;
        const values = parts.slice(0, MAX_VALUES).map(parseNumber).filter(n => !isNaN(n) && n > 0);
        if (values.length === 0) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Nenhum valor válido. Use números positivos.")] });
          return;
        }
        stats.simular++;
        const brlCol = values.map(v => formatBrl(v));
        const robuxCol = values.map(v => formatRobux(brlToRobux(v, rate)));
        const maxBrl = Math.max(...brlCol.map(s => s.length));
        const maxRobux = Math.max(...robuxCol.map(s => s.length));
        const rows = values.map((_, i) =>
          `${brlCol[i].padStart(maxBrl)}  →  ${robuxCol[i].padStart(maxRobux)} Robux`
        ).join("\n");
        const truncNote = parts.length > MAX_VALUES ? `\n*Mostrando primeiros ${MAX_VALUES} de ${parts.length} valores.*` : "";
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("📊 Simulação BRL → Robux")
            .setDescription(`\`\`\`\n${rows}\n\`\`\`${truncNote}`)
            .setFooter({ text: footerText(rate) }),
        ]});
        return;
      }

      // ── !gamepass <id ou link> ────────────────────────────────────────────
      if (lower.startsWith("!gamepass")) {
        setCooldown(message.author.id);
        const parts = content.split(/\s+/);
        if (parts.length < 2) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Use: `!gamepass <ID ou link>` — Ex: `!gamepass 12345678`")] });
          return;
        }
        const gpId = extractGamepassId(parts[1]);
        if (!gpId) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ ID ou link inválido. Ex: `!gamepass 12345678` ou cole o link do gamepass.")] });
          return;
        }
        const gamepassUrl = `https://www.roblox.com/game-pass/${gpId}`;
        const linkButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setLabel("🎮 Ver Gamepass no Roblox").setURL(gamepassUrl).setStyle(ButtonStyle.Link)
        );
        stats.gamepass++;
        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Orange)
              .setTitle("🎮 Gamepass do Roblox")
              .setDescription(`Clique no botão abaixo para ver o gamepass **#${gpId}** no Roblox.`)
              .setFooter({ text: footerText(rate) }),
          ],
          components: [linkButton],
        });
        return;
      }

      // ── !perfil <username> ────────────────────────────────────────────────
      if (lower.startsWith("!perfil")) {
        setCooldown(message.author.id);
        const parts = content.split(/\s+/);
        if (parts.length < 2) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Use: `!perfil <usuário>` — Ex: `!perfil Builderman`")] });
          return;
        }
        const username = parts[1];
        const loading = await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Grey).setDescription(`🔍 Buscando perfil de **${username}**...`)] });
        const profile = await fetchRobloxProfile(username);
        if (!profile) {
          await loading.edit({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription(`❌ Usuário **${username}** não encontrado no Roblox.`)] });
          return;
        }
        const profileUrl = `https://www.roblox.com/users/${profile.id}/profile`;
        const profileButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setLabel("👤 Ver Perfil no Roblox").setURL(profileUrl).setStyle(ButtonStyle.Link)
        );
        const joinDate = profile.created
          ? new Date(profile.created).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "Desconhecido";
        const embed = new EmbedBuilder()
          .setColor(Colors.Blurple)
          .setTitle(`${profile.isBanned ? "🚫 " : "👤 "}${profile.displayName}`)
          .setURL(profileUrl)
          .addFields(
            { name: "👤 Username", value: `@${profile.name}`, inline: true },
            { name: "🆔 ID", value: profile.id.toString(), inline: true },
            { name: "📅 Conta criada em", value: joinDate, inline: true },
            { name: "👫 Amigos", value: profile.friendsCount.toLocaleString("pt-BR"), inline: true },
            { name: "👥 Seguidores", value: profile.followersCount.toLocaleString("pt-BR"), inline: true },
            { name: "➡️ Seguindo", value: profile.followingsCount.toLocaleString("pt-BR"), inline: true },
          );
        if (profile.isBanned) embed.addFields({ name: "⚠️ Status", value: "Conta banida" });
        if (profile.description) {
          const desc = profile.description.length > 200 ? profile.description.slice(0, 200) + "..." : profile.description;
          embed.setDescription(desc);
        }
        if (profile.avatarUrl) embed.setThumbnail(profile.avatarUrl);
        await loading.edit({ embeds: [embed], components: [profileButton] });
        return;
      }

      // ── !rep @usuário ─────────────────────────────────────────────────────
      if (lower.startsWith("!rep")) {
        setCooldown(message.author.id);
        const mentioned = message.mentions.users.first();
        if (!mentioned) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Mencione alguém! Ex: `!rep @usuario`")] });
          return;
        }
        if (mentioned.id === message.author.id) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Você não pode dar rep para si mesmo!")] });
          return;
        }
        if (mentioned.bot) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Você não pode dar rep para um bot!")] });
          return;
        }
        if (!canGiveRep(message.author.id, mentioned.id)) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Orange).setDescription(`⏳ Você já deu rep para **${mentioned.displayName}** hoje. Volte em 24h!`)] });
          return;
        }
        giveRep(message.author.id, mentioned.id);
        const newRep = getRepData(mentioned.id).rep;
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Gold)
            .setTitle("⭐ Reputação Dada!")
            .setDescription(`**${message.author.displayName}** deu +1 rep para **${mentioned.displayName}**!`)
            .addFields(
              { name: "Total de rep", value: `⭐ ${newRep}`, inline: true },
              { name: "Rank", value: repRank(newRep), inline: true },
            ),
        ]});
        return;
      }

      // ── !meuperfil ────────────────────────────────────────────────────────
      if (lower === "!meuperfil") {
        setCooldown(message.author.id);
        const data = getRepData(message.author.id);
        const partnerText = marriages.has(message.author.id)
          ? `<@${marriages.get(message.author.id)}> 💍`
          : "Solteiro(a) 💔";
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setTitle(`👤 Perfil de ${message.author.displayName}`)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
              { name: "⭐ Reputação", value: data.rep.toLocaleString("pt-BR"), inline: true },
              { name: "🏅 Rank", value: repRank(data.rep), inline: true },
              { name: "💍 Parceiro(a)", value: partnerText, inline: false },
            )
            .setTimestamp(),
        ]});
        return;
      }

      // ── !ranking ─────────────────────────────────────────────────────────
      if (lower === "!ranking") {
        setCooldown(message.author.id);
        const sorted = [...repStore.entries()]
          .sort((a, b) => b[1].rep - a[1].rep)
          .slice(0, 10);
        if (sorted.length === 0) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Grey).setDescription("Ninguém tem rep ainda. Use `!rep @usuario` para começar!")] });
          return;
        }
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        const lines = sorted.map(([userId, data], i) =>
          `${medals[i]} <@${userId}> — **${data.rep} rep** · ${repRank(data.rep)}`
        ).join("\n");
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Gold)
            .setTitle("🏆 Ranking de Reputação")
            .setDescription(lines)
            .setTimestamp(),
        ]});
        return;
      }

      // ── !casar @usuário ───────────────────────────────────────────────────
      if (lower.startsWith("!casar")) {
        setCooldown(message.author.id);
        const mentioned = message.mentions.users.first();
        if (!mentioned) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Mencione alguém! Ex: `!casar @usuario`")] });
          return;
        }
        if (mentioned.id === message.author.id) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Você não pode se casar consigo mesmo!")] });
          return;
        }
        if (mentioned.bot) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Você não pode se casar com um bot!")] });
          return;
        }
        if (marriages.has(message.author.id)) {
          const partnerId = marriages.get(message.author.id)!;
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription(`❌ Você já está casado(a) com <@${partnerId}>! Use \`!divorciar\` primeiro.`)] });
          return;
        }
        if (marriages.has(mentioned.id)) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription(`❌ <@${mentioned.id}> já está casado(a) com outra pessoa!`)] });
          return;
        }
        marriages.set(message.author.id, mentioned.id);
        marriages.set(mentioned.id, message.author.id);
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Fuchsia)
            .setTitle("💍 Casamento Virtual!")
            .setDescription(`**${message.author.displayName}** e **${mentioned.displayName}** agora são casados! 🎊\n\nParabéns ao novo casal! 💑`)
            .setTimestamp(),
        ]});
        return;
      }

      // ── !divorciar ────────────────────────────────────────────────────────
      if (lower === "!divorciar") {
        setCooldown(message.author.id);
        if (!marriages.has(message.author.id)) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Você não está casado(a) com ninguém!")] });
          return;
        }
        const partnerId = marriages.get(message.author.id)!;
        marriages.delete(message.author.id);
        marriages.delete(partnerId);
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Grey)
            .setTitle("💔 Divórcio")
            .setDescription(`**${message.author.displayName}** e <@${partnerId}> se divorciaram. Que pena...`),
        ]});
        return;
      }

      // ── !parceiro ─────────────────────────────────────────────────────────
      if (lower === "!parceiro") {
        setCooldown(message.author.id);
        if (!marriages.has(message.author.id)) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Grey).setDescription("💔 Você não está casado(a) com ninguém. Use `!casar @usuario`!")] });
          return;
        }
        const partnerId = marriages.get(message.author.id)!;
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Fuchsia)
            .setTitle("💑 Seu Parceiro(a)")
            .setDescription(`**${message.author.displayName}** está casado(a) com <@${partnerId}> 💍`),
        ]});
        return;
      }

      // ── !ship @u1 @u2 ─────────────────────────────────────────────────────
      if (lower.startsWith("!ship")) {
        setCooldown(message.author.id);
        const mentioned = message.mentions.users;
        if (mentioned.size < 2) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Mencione duas pessoas! Ex: `!ship @usuario1 @usuario2`")] });
          return;
        }
        const [u1, u2] = mentioned.first(2);
        const score = shipScore(u1.id, u2.id);
        const bar = shipBar(score);
        let comment = "";
        if (score >= 90) comment = "Amor eterno! 💞";
        else if (score >= 70) comment = "Combinam muito! 💕";
        else if (score >= 50) comment = "Tem potencial! 💛";
        else if (score >= 30) comment = "Pode melhorar... 🤔";
        else comment = "Melhor como amigos! 😅";
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Fuchsia)
            .setTitle("💘 Ship-o-metro")
            .setDescription(`**${u1.displayName}** 💞 **${u2.displayName}**\n\n${bar}\n\n**${score}%** — ${comment}`),
        ]});
        return;
      }

      // ── !abraçar @usuário ─────────────────────────────────────────────────
      if (lower.startsWith("!abraçar") || lower.startsWith("!abracar")) {
        setCooldown(message.author.id);
        const mentioned = message.mentions.users.first();
        if (!mentioned) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Mencione alguém! Ex: `!abraçar @usuario`")] });
          return;
        }
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Yellow)
            .setDescription(`🤗 **${message.author.displayName}** ${randomFrom(msgAbraco)} **${mentioned.displayName}**!`),
        ]});
        return;
      }

      // ── !beijar @usuário ──────────────────────────────────────────────────
      if (lower.startsWith("!beijar")) {
        setCooldown(message.author.id);
        const mentioned = message.mentions.users.first();
        if (!mentioned) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Mencione alguém! Ex: `!beijar @usuario`")] });
          return;
        }
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Fuchsia)
            .setDescription(`😘 **${message.author.displayName}** ${randomFrom(msgBeijo)} **${mentioned.displayName}**!`),
        ]});
        return;
      }

      // ── !high5 @usuário ───────────────────────────────────────────────────
      if (lower.startsWith("!high5")) {
        setCooldown(message.author.id);
        const mentioned = message.mentions.users.first();
        if (!mentioned) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Mencione alguém! Ex: `!high5 @usuario`")] });
          return;
        }
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setDescription(`🙌 **${message.author.displayName}** ${randomFrom(msgHigh5)} **${mentioned.displayName}**!`),
        ]});
        return;
      }

      // ── !elogiar @usuário ─────────────────────────────────────────────────
      if (lower.startsWith("!elogiar")) {
        setCooldown(message.author.id);
        const mentioned = message.mentions.users.first();
        if (!mentioned) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Mencione alguém! Ex: `!elogiar @usuario`")] });
          return;
        }
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Gold)
            .setDescription(`🌟 **${mentioned.displayName}** ${randomFrom(msgElogio)}\n\n— elogio enviado por **${message.author.displayName}**`),
        ]});
        return;
      }

      // ── !setraxa — admin only ─────────────────────────────────────────────
      if (lower.startsWith("!setraxa")) {
        if (!isAdmin(message)) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("🔒 Apenas administradores podem alterar a taxa.")] });
          return;
        }
        const parts = content.split(/\s+/);
        if (parts.length < 3) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Use: `!setraxa <robux> <R$>` — Ex: `!setraxa 1000 40`")] });
          return;
        }
        const newRobux = parseNumber(parts[1]);
        const newBrl = parseNumber(parts[2]);
        if (isNaN(newRobux) || newRobux <= 0 || isNaN(newBrl) || newBrl <= 0) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Valores inválidos. Ex: `!setraxa 1000 40`")] });
          return;
        }
        const before = getCurrentRate();
        const after: RateEntry = { robux: newRobux, brl: newBrl };
        updateRate(after, message.author.displayName);
        logger.info({ newRobux, newBrl, updatedBy: message.author.tag }, "Robux rate updated");
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("✅ Taxa atualizada!")
            .setDescription(`Alterado por **${message.author.displayName}**`)
            .addFields(
              { name: "Antes", value: rateLabel(before), inline: true },
              { name: "Agora", value: rateLabel(after), inline: true },
            )
            .setTimestamp(),
        ]});
        return;
      }

      // ── !limpar — admin only ──────────────────────────────────────────────
      if (lower.startsWith("!limpar")) {
        if (!message.member?.permissions.has("ManageMessages")) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Você não tem permissão para limpar mensagens.")] });
          return;
        }
        if (!message.channel.isTextBased() || message.channel.isDMBased()) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Este comando só funciona em canais de texto.")] });
          return;
        }
        const parts = content.split(/\s+/);
        if (parts.length < 2) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Informe a quantidade. Ex: `!limpar 10`")] });
          return;
        }
        let amount = parseInt(parts[1], 10);
        if (isNaN(amount) || amount < 1) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Quantidade inválida. Use um número entre 1 e 100.")] });
          return;
        }
        if (amount > 100) amount = 100;
        const deleted = await (message.channel as import("discord.js").TextChannel).bulkDelete(amount, true).catch(() => null);
        const count = deleted?.size ?? 0;
        const confirm = await message.channel.send({ embeds: [
          new EmbedBuilder().setColor(Colors.Green).setDescription(`🗑️ **${count}** mensagen${count !== 1 ? "s" : ""} apagada${count !== 1 ? "s" : ""} com sucesso.`),
        ]});
        setTimeout(() => confirm.delete().catch(() => null), 5000);
        return;
      }

      // ── !anuncio — admin only ─────────────────────────────────────────────
      if (lower.startsWith("!anuncio")) {
        if (!message.member?.permissions.has("ManageMessages")) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Você não tem permissão para fazer anúncios.")] });
          return;
        }
        const text = content.slice("!anuncio".length).trim();
        if (!text) {
          await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Informe o texto. Ex: `!anuncio Evento hoje às 20h!`")] });
          return;
        }
        await message.delete().catch(() => null);
        const announcement = await (message.channel as import("discord.js").TextChannel).send({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Gold)
            .setTitle("📣 Anúncio")
            .setDescription(text)
            .setFooter({ text: `Anunciado por ${message.author.username}` })
            .setTimestamp(),
        ]});
        await announcement.pin().catch(() => null);
        return;
      }

      // ── !ajuda ────────────────────────────────────────────────────────────
      if (lower === "!ajuda" || lower === "!help" || lower === "!comandos") {
        setCooldown(message.author.id);

        // Categorias e seus comandos
        const categorias: Record<string, {
          emoji: string;
          label: string;
          cor: number;
          descricao: string;
          comandos: Array<{ nome: string; desc: string }>;
        }> = {
          robux: {
            emoji: "💸", label: "Robux & Conversão", cor: 0xf59e0b,
            descricao: "Ferramentas de conversão e cálculo de Robux.",
            comandos: [
              { nome: "!robux <valor>", desc: "Converte BRL para Robux." },
              { nome: "!brl <valor>", desc: "Converte Robux para BRL." },
              { nome: "!taxa", desc: "Mostra a taxa de câmbio atual." },
              { nome: "!simular <v1> <v2>...", desc: "Gera uma tabela de conversão." },
              { nome: "!historico", desc: "Exibe o histórico de alterações de taxa." },
            ],
          },
          roblox: {
            emoji: "🎮", label: "Roblox", cor: 0x3b82f6,
            descricao: "Informações e pesquisas relacionadas ao Roblox.",
            comandos: [
              { nome: "!perfil <usuário>", desc: "Exibe o perfil Roblox de um usuário." },
              { nome: "!gamepass <ID ou link>", desc: "Link direto para o gamepass." },
            ],
          },
          relacionamentos: {
            emoji: "💑", label: "Relacionamentos", cor: 0xec4899,
            descricao: "Comandos de casamento e relacionamento virtual.",
            comandos: [
              { nome: "!casar @usuário", desc: "Propõe casamento para alguém." },
              { nome: "!divorciar", desc: "Termina o casamento atual." },
              { nome: "!parceiro", desc: "Mostra seu parceiro atual." },
              { nome: "!ship @u1 @u2", desc: "Calcula a compatibilidade entre dois membros." },
            ],
          },
          interacoes: {
            emoji: "🤝", label: "Interações", cor: 0x10b981,
            descricao: "Interaja com outros membros do servidor.",
            comandos: [
              { nome: "!abraçar @usuário", desc: "Abraça outro membro." },
              { nome: "!beijar @usuário", desc: "Beija outro membro." },
              { nome: "!high5 @usuário", desc: "Dá um high five." },
              { nome: "!elogiar @usuário", desc: "Elogia alguém do servidor." },
            ],
          },
          reputacao: {
            emoji: "⭐", label: "Reputação", cor: 0xf59e0b,
            descricao: "Sistema de reputação e ranking de membros.",
            comandos: [
              { nome: "!rep @usuário", desc: "Dá +1 rep para alguém (1x por dia)." },
              { nome: "!ranking", desc: "Top 10 membros com mais reputação." },
              { nome: "!meuperfil", desc: "Vê seu perfil com rep e parceiro." },
            ],
          },
          administracao: {
            emoji: "📢", label: "Administração", cor: 0xdc2626,
            descricao: "Ferramentas para admins e moderadores.",
            comandos: [
              { nome: "!setraxa <robux> <R$>", desc: "Atualiza a taxa de câmbio (admin)." },
              { nome: "!limpar <qtd>", desc: "Apaga mensagens do canal (mod)." },
              { nome: "!anuncio <texto>", desc: "Faz um anúncio fixado no canal (mod)." },
            ],
          },
          geral: {
            emoji: "📊", label: "Geral & Status", cor: 0x64748b,
            descricao: "Informações e status do FiskBot.",
            comandos: [
              { nome: "!ping", desc: "Verifica a latência do bot." },
              { nome: "!status", desc: "Estatísticas gerais de uso do FiskBot." },
            ],
          },
        };

        // Embed principal
        const embedPrincipal = new EmbedBuilder()
          .setTitle("✨ FiskBot — Central de Comandos")
          .setDescription(
            "Bem-vindo ao painel de ajuda do **FiskBot**.\n" +
            "Selecione uma categoria abaixo para visualizar seus comandos."
          )
          .addFields({
            name: "📂 Categorias disponíveis",
            value: Object.values(categorias)
              .map((c) => `${c.emoji} **${c.label}**`)
              .join("  ·  "),
          })
          .setColor(0x5865f2)
          .setFooter({ text: "FiskBot • Use o menu abaixo para navegar" })
          .setTimestamp();

        // Select menu com todas as categorias
        const buildMenu = () =>
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("ajuda_cat")
              .setPlaceholder("📂 Escolha uma categoria...")
              .addOptions(
                Object.entries(categorias).map(([chave, cat]) => ({
                  label: cat.label,
                  value: chave,
                  emoji: cat.emoji,
                  description: cat.descricao.slice(0, 50),
                }))
              )
          );

        // Botão voltar
        const buildBotaoVoltar = () =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("ajuda_voltar")
              .setLabel("⬅  Voltar ao Menu Principal")
              .setStyle(ButtonStyle.Secondary)
          );

        // Embed de categoria
        const embedCategoria = (chave: string) => {
          const cat = categorias[chave];
          const lista = cat.comandos
            .map((c) => `\`${c.nome}\`\n╰ ${c.desc}`)
            .join("\n\n");
          return new EmbedBuilder()
            .setTitle(`${cat.emoji} ${cat.label}`)
            .setDescription(`${cat.descricao}\n\u200B`)
            .addFields({ name: "Comandos", value: lista })
            .setColor(cat.cor)
            .setFooter({ text: "FiskBot • Clique em ⬅ Voltar para o menu principal" })
            .setTimestamp();
        };

        // Envia o painel
        const msg = await message.reply({
          embeds: [embedPrincipal],
          components: [buildMenu()],
        });

        // Coletor do select menu (só quem executou o !ajuda)
        const coletorMenu = msg.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          componentType: ComponentType.StringSelect,
          time: 5 * 60 * 1000,
        });

        // Coletor do botão voltar
        const coletorVoltar = msg.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          componentType: ComponentType.Button,
          time: 5 * 60 * 1000,
        });

        coletorMenu.on("collect", async (interacao) => {
          await interacao.deferUpdate();
          const chave = interacao.values[0];
          await msg.edit({
            embeds: [embedCategoria(chave)],
            components: [buildBotaoVoltar()],
          });
        });

        coletorVoltar.on("collect", async (interacao) => {
          await interacao.deferUpdate();
          await msg.edit({
            embeds: [embedPrincipal],
            components: [buildMenu()],
          });
        });

        coletorMenu.on("end", async () => {
          await msg.edit({ components: [] }).catch(() => null);
        });

        return;
      }

    } catch (err) {
      logger.error({ err }, "Error handling message command");
      await message.reply({ embeds: [
        new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Ocorreu um erro ao processar o comando. Tente novamente."),
      ]}).catch(() => null);
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord");
    process.exit(1);
  });
}
