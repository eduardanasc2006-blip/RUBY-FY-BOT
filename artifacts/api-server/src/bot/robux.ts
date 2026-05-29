import {
  Client,
  GatewayIntentBits,
  Message,
  Events,
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
} from "discord.js";
import { logger } from "../lib/logger";
import { getCurrentRate, getHistory, updateRate, type RateEntry } from "./store";

const COOLDOWN_MS = 3000;
const cooldowns = new Map<string, number>();

function isOnCooldown(userId: string): boolean {
  const last = cooldowns.get(userId) ?? 0;
  return Date.now() - last < COOLDOWN_MS;
}

function setCooldown(userId: string): void {
  cooldowns.set(userId, Date.now());
}

function robuxPerBrl(rate: RateEntry): number {
  return rate.robux / rate.brl;
}

function brlToRobux(brl: number, rate: RateEntry): number {
  return Math.floor(brl * robuxPerBrl(rate));
}

function robuxToBrl(robux: number, rate: RateEntry): number {
  return robux / robuxPerBrl(rate);
}

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

/**
 * Parses a number from user input, handling:
 * - "R$100", "R$ 100"
 * - "100,50" (BR decimal)
 * - "1.000" (BR thousands)
 * - "1.000,50"
 * - "100.50" (plain decimal)
 */
function parseNumber(raw: string): number {
  let s = raw.trim().replace(/^R\$\s*/i, "");
  // If it has both dot and comma, figure out which is the decimal
  if (s.includes(".") && s.includes(",")) {
    // "1.000,50" → remove dots, replace comma with dot
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    // "100,50" or "1,50" → comma is decimal
    s = s.replace(",", ".");
  } else if (s.includes(".")) {
    // Could be "1.000" (thousands) or "1.5" (decimal)
    const parts = s.split(".");
    if (parts[1] && parts[1].length === 3) {
      // "1.000" — thousands separator, no decimal
      s = s.replace(/\./g, "");
    }
    // else "1.5" — keep as is
  }
  return parseFloat(s);
}

function isAdmin(message: Message): boolean {
  if (!message.member) return false;
  return (
    message.member.permissions.has(PermissionFlagsBits.Administrator) ||
    message.member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

function footerText(rate: RateEntry): string {
  return `Taxa atual: ${rateLabel(rate)}`;
}

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
    c.user.setActivity("!ajuda | Robux ↔ BRL");
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

      // !ping
      if (lower === "!ping") {
        setCooldown(message.author.id);
        const sent = await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setTitle("🏓 Pong!")
            .setDescription(`Latência: calculando...`)
        ]});
        const latency = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setTitle("🏓 Pong!")
            .addFields(
              { name: "Latência", value: `${latency}ms`, inline: true },
              { name: "API", value: `${Math.round(client.ws.ping)}ms`, inline: true },
            )
        ]});
        return;
      }

      // !robux <brl>
      if (lower.startsWith("!robux")) {
        setCooldown(message.author.id);
        const parts = content.split(/\s+/);
        if (parts.length < 2) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Red)
              .setDescription("❌ Use: `!robux <valor em R$>` — Ex: `!robux 100`")
          ]});
          return;
        }
        const brl = parseNumber(parts[1]);
        if (isNaN(brl) || brl <= 0) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Red)
              .setDescription("❌ Valor inválido. Use um número positivo. Ex: `!robux 100`")
          ]});
          return;
        }
        const robux = brlToRobux(brl, rate);
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("💸 BRL → Robux")
            .addFields(
              { name: "Você paga", value: formatBrl(brl), inline: true },
              { name: "Você recebe", value: `${formatRobux(robux)} Robux`, inline: true },
            )
            .setFooter({ text: footerText(rate) })
        ]});
        return;
      }

      // !brl <robux>
      if (lower.startsWith("!brl")) {
        setCooldown(message.author.id);
        const parts = content.split(/\s+/);
        if (parts.length < 2) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Red)
              .setDescription("❌ Use: `!brl <quantidade de Robux>` — Ex: `!brl 1000`")
          ]});
          return;
        }
        const robux = parseNumber(parts[1]);
        if (isNaN(robux) || robux <= 0) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Red)
              .setDescription("❌ Valor inválido. Use um número positivo. Ex: `!brl 1000`")
          ]});
          return;
        }
        const brl = robuxToBrl(robux, rate);
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Gold)
            .setTitle("💰 Robux → BRL")
            .addFields(
              { name: "Quantidade", value: `${formatRobux(Math.round(robux))} Robux`, inline: true },
              { name: "Valor", value: formatBrl(brl), inline: true },
            )
            .setFooter({ text: footerText(rate) })
        ]});
        return;
      }

      // !taxa
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
            )
        ]});
        return;
      }

      // !historico
      if (lower === "!historico") {
        setCooldown(message.author.id);
        const history = getHistory();
        if (history.length === 0) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Grey)
              .setTitle("📋 Histórico de taxas")
              .setDescription("Nenhuma alteração registrada ainda.")
          ]});
          return;
        }
        const lines = history
          .slice()
          .reverse()
          .map((entry, i) =>
            `**${i + 1}.** \`${formatDateTime(entry.changedAt)}\` — **${entry.changedBy}**\n` +
            `↳ ${rateLabel(entry.before)} → **${rateLabel(entry.after)}**`
          )
          .join("\n\n");
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Purple)
            .setTitle(`📋 Histórico de taxas (últimas ${history.length})`)
            .setDescription(lines)
        ]});
        return;
      }

      // !simular <v1> <v2> ... — table of BRL→Robux conversions
      if (lower.startsWith("!simular")) {
        setCooldown(message.author.id);
        const parts = content.split(/\s+/).slice(1);
        if (parts.length === 0) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Red)
              .setDescription("❌ Use: `!simular <val1> <val2> ...` — Ex: `!simular 50 100 200 500`")
          ]});
          return;
        }
        const MAX_VALUES = 8;
        const values = parts.slice(0, MAX_VALUES).map(parseNumber).filter(n => !isNaN(n) && n > 0);
        if (values.length === 0) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Red)
              .setDescription("❌ Nenhum valor válido encontrado. Use números positivos.")
          ]});
          return;
        }

        const brlCol   = values.map(v => formatBrl(v));
        const robuxCol = values.map(v => formatRobux(brlToRobux(v, rate)));

        // Align columns
        const maxBrl   = Math.max(...brlCol.map(s => s.length));
        const maxRobux = Math.max(...robuxCol.map(s => s.length));

        const rows = values.map((_, i) =>
          `${brlCol[i].padStart(maxBrl)}  →  ${robuxCol[i].padStart(maxRobux)} Robux`
        ).join("\n");

        const truncNote = parts.length > MAX_VALUES
          ? `\n*Mostrando primeiros ${MAX_VALUES} de ${parts.length} valores.*`
          : "";

        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("📊 Simulação BRL → Robux")
            .setDescription(`\`\`\`\n${rows}\n\`\`\`${truncNote}`)
            .setFooter({ text: footerText(rate) })
        ]});
        return;
      }

      // !setraxa <robux> <brl>  — admin only
      if (lower.startsWith("!setraxa")) {
        if (!isAdmin(message)) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Red)
              .setDescription("🔒 Apenas administradores podem alterar a taxa.")
          ]});
          return;
        }
        const parts = content.split(/\s+/);
        if (parts.length < 3) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Red)
              .setDescription("❌ Use: `!setraxa <robux> <R$>` — Ex: `!setraxa 1000 40`")
          ]});
          return;
        }
        const newRobux = parseNumber(parts[1]);
        const newBrl = parseNumber(parts[2]);
        if (isNaN(newRobux) || newRobux <= 0 || isNaN(newBrl) || newBrl <= 0) {
          await message.reply({ embeds: [
            new EmbedBuilder().setColor(Colors.Red)
              .setDescription("❌ Valores inválidos. Ambos devem ser números positivos. Ex: `!setraxa 1000 40`")
          ]});
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
            .setTimestamp()
        ]});
        return;
      }

      // !ajuda
      if (lower === "!ajuda" || lower === "!help") {
        setCooldown(message.author.id);
        await message.reply({ embeds: [
          new EmbedBuilder()
            .setColor(Colors.Blurple)
            .setTitle("🎮 Bot de Conversão Robux / BRL")
            .addFields(
              { name: "`!robux <R$>`", value: "Converte BRL → Robux" },
              { name: "`!brl <robux>`", value: "Converte Robux → BRL" },
              { name: "`!taxa`", value: "Mostra a taxa de câmbio atual" },
              { name: "`!historico`", value: "Últimas alterações de taxa" },
              { name: "`!simular <v1> <v2> ...`", value: "Tabela comparativa de múltiplos valores" },
              { name: "`!setraxa <robux> <R$>`", value: "*(Admin)* Atualiza a taxa" },
              { name: "`!ping`", value: "Verifica a latência do bot" },
              { name: "`!ajuda`", value: "Mostra esta mensagem" },
            )
            .addFields({ name: "Exemplos", value: "`!robux 100` → quantos Robux com R$100\n`!brl 1000` → quanto custa 1000 Robux\n`!setraxa 1000 40` → 1000 Robux = R$40,00" })
            .setFooter({ text: footerText(rate) })
        ]});
        return;
      }
    } catch (err) {
      logger.error({ err }, "Error handling Discord message");
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord");
  });
}
