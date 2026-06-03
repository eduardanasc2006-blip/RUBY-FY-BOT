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
  TextChannel,
} from "discord.js";

import { logger } from "../lib/logger";
import {
  getCurrentRate,
  getHistory,
  updateRate,
  type RateEntry,
} from "./store";

/* ─────────────────────────────────────────────
   COOLDOWN
───────────────────────────────────────────── */

const COOLDOWN_MS = 3000;
const cooldowns = new Map<string, number>();

function isOnCooldown(id: string) {
  return Date.now() - (cooldowns.get(id) ?? 0) < COOLDOWN_MS;
}

function setCooldown(id: string) {
  cooldowns.set(id, Date.now());
}

/* ─────────────────────────────────────────────
   STATS
───────────────────────────────────────────── */

const stats = {
  startedAt: new Date(),
  robux: 0,
  brl: 0,
  simular: 0,
  gamepass: 0,
};

const totalConversions = () =>
  stats.robux + stats.brl + stats.simular + stats.gamepass;

function uptime() {
  const ms = Date.now() - stats.startedAt.getTime();
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

/* ─────────────────────────────────────────────
   MATH / FORMAT
───────────────────────────────────────────── */

function robuxPerBrl(rate: RateEntry) {
  return rate.robux / rate.brl;
}

function brlToRobux(brl: number, rate: RateEntry) {
  return Math.floor(brl * robuxPerBrl(rate));
}

function robuxToBrl(robux: number, rate: RateEntry) {
  return robux / robuxPerBrl(rate);
}

const formatBrl = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatRobux = (v: number) => v.toLocaleString("pt-BR");

function parseNumber(raw: string) {
  let s = raw.trim().replace(/^R\$\s*/i, "");

  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  return parseFloat(s);
}

/* ─────────────────────────────────────────────
   PERMISSIONS
───────────────────────────────────────────── */

function isAdmin(message: Message) {
  return (
    message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
    message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

/* ─────────────────────────────────────────────
   MAIN BOT
───────────────────────────────────────────── */

export function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.warn("Missing DISCORD_BOT_TOKEN");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info(`Online: ${c.user.tag}`);
  });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const lower = content.toLowerCase();

    if (!lower.startsWith("!")) return;
    if (isOnCooldown(message.author.id)) {
      await message.react("⏳").catch(() => {});
      return;
    }

    try {
      const rate = getCurrentRate();

      /* ───── !ping ───── */
      if (lower === "!ping") {
        setCooldown(message.author.id);

        const sent = await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Blurple)
              .setTitle("🏓 Pong!")
              .setDescription("Calculando..."),
          ],
        });

        const latency = sent.createdTimestamp - message.createdTimestamp;

        await sent.edit({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Blurple)
              .setTitle("🏓 Pong!")
              .addFields(
                { name: "Latência", value: `${latency}ms`, inline: true },
                { name: "API", value: `${Math.round(client.ws.ping)}ms`, inline: true }
              ),
          ],
        });

        return;
      }

      /* ───── !status ───── */
      if (lower === "!status") {
        setCooldown(message.author.id);

        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Green)
              .setTitle("📊 Status")
              .addFields(
                { name: "Uptime", value: uptime(), inline: true },
                { name: "Conversões", value: totalConversions().toString(), inline: true },
                { name: "Robux", value: stats.robux.toString(), inline: true },
                { name: "BRL", value: stats.brl.toString(), inline: true },
                { name: "Simular", value: stats.simular.toString(), inline: true },
                { name: "Gamepass", value: stats.gamepass.toString(), inline: true }
              )
              .setFooter({ text: `Taxa: ${rate.robux}R$ = ${rate.brl} BRL` }),
          ],
        });

        return;
      }

      /* ───── !robux ───── */
      if (lower.startsWith("!robux")) {
        setCooldown(message.author.id);

        const value = parseNumber(content.split(" ")[1]);
        if (!value || value <= 0) {
          return message.reply("❌ Use: `!robux <valor>`");
        }

        stats.robux++;

        const robux = brlToRobux(value, rate);

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Green)
              .setTitle("💸 BRL → Robux")
              .addFields(
                { name: "BRL", value: formatBrl(value), inline: true },
                { name: "Robux", value: `${formatRobux(robux)}`, inline: true }
              ),
          ],
        });
      }

      /* ───── !brl ───── */
      if (lower.startsWith("!brl")) {
        setCooldown(message.author.id);

        const value = parseNumber(content.split(" ")[1]);
        if (!value || value <= 0) {
          return message.reply("❌ Use: `!brl <robux>`");
        }

        stats.brl++;

        const brl = robuxToBrl(value, rate);

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Gold)
              .setTitle("💰 Robux → BRL")
              .addFields(
                { name: "Robux", value: formatRobux(value), inline: true },
                { name: "BRL", value: formatBrl(brl), inline: true }
              ),
          ],
        });
      }

      /* ───── !taxa ───── */
      if (lower === "!taxa") {
        setCooldown(message.author.id);

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Blue)
              .setTitle("📊 Taxa atual")
              .addFields(
                {
                  name: "Base",
                  value: `${rate.robux} Robux = ${formatBrl(rate.brl)}`,
                },
                {
                  name: "1 Robux",
                  value: formatBrl(rate.brl / rate.robux),
                }
              ),
          ],
        });
      }

      /* ───── !setraxa ───── */
      if (lower.startsWith("!setraxa")) {
        if (!isAdmin(message)) {
          return message.reply("❌ Apenas admins.");
        }

        const [_, r, b] = content.split(" ");
        const robux = Number(r);
        const brl = Number(b);

        if (!robux || !brl) {
          return message.reply("❌ Use: !setraxa 1000 40");
        }

        const before = getCurrentRate();
        const after: RateEntry = { robux, brl };

        updateRate(after, message.author.displayName);

        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Green)
              .setTitle("Taxa atualizada")
              .addFields(
                { name: "Antes", value: `${before.robux}/${before.brl}` },
                { name: "Agora", value: `${robux}/${brl}` }
              ),
          ],
        });
      }

      /* fallback */
      return;
    } catch (err) {
      logger.error(err);
      return message.reply("❌ Erro interno.");
    }
  });

  client.login(token);
}
