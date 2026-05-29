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

// ── Cooldown ─────────────────────────────────────────────────────────────────

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

// ── Number parser ─────────────────────────────────────────────────────────────
// Handles: "R$100", "100,50", "1.000", "1.000,50", "100.50"

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

// ── Roblox API ────────────────────────────────────────────────────────────────

function extractGamepassId(input: string): string | null {
  // URL: https://www.roblox.com/game-pass/12345678/...
  const urlMatch = input.match(/game-pass\/(\d+)/i);
  if (urlMatch) return urlMatch[1];
  // Plain ID
  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
}

interface GamepassInfo {
  name: string;
  priceInRobux: number | null;
  isForSale: boolean;
  sales: number;
  creator: string;
  thumbnailUrl: string | null;
}

async function fetchGamepass(id: string): Promise<GamepassInfo | null> {
  try {
    const res = await fetch(
      `https://economy.roblox.com/v2/game-passes/${id}/game-pass-product-info`,
      { headers: { "Accept": "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      Name?: string;
      PriceInRobux?: number;
      IsForSale?: boolean;
      Sales?: number;
      Creator?: { Name?: string };
    };

    // Fetch thumbnail
    let thumbnailUrl: string | null = null;
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${id}&size=150x150&format=Png`,
        { headers: { "Accept": "application/json" } }
      );
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json() as { data?: Array<{ imageUrl?: string }> };
        thumbnailUrl = thumbData.data?.[0]?.imageUrl ?? null;
      }
    } catch {
      // thumbnail is optional
    }

    return {
      name: data.Name ?? "Sem nome",
      priceInRobux: data.PriceInRobux ?? null,
      isForSale: data.IsForSale ?? false,
      sales: data.Sales ?? 0,
      creator: data.Creator?.Name ?? "Desconhecido",
      thumbnailUrl,
    };
  } catch {
    return null;
  }
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

        const loading = await message.reply({ embeds: [new EmbedBuilder().setColor(Colors.Grey).setDescription("🔍 Buscando gamepass no Roblox...")] });
        const gp = await fetchGamepass(gpId);

        if (!gp) {
          await loading.edit({ embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription("❌ Gamepass não encontrado ou a API do Roblox está fora do ar. Verifique o ID/link.")] });
          return;
        }

        stats.gamepass++;
        const embed = new EmbedBuilder()
          .setColor(Colors.Orange)
          .setTitle(`🎮 ${gp.name}`)
          .setURL(`https://www.roblox.com/game-pass/${gpId}`)
          .addFields(
            { name: "Criador", value: gp.creator, inline: true },
            { name: "Vendas", value: gp.sales.toLocaleString("pt-BR"), inline: true },
            { name: "À venda", value: gp.isForSale ? "✅ Sim" : "❌ Não", inline: true },
          );

        if (gp.priceInRobux !== null) {
          const priceBrl = robuxToBrl(gp.priceInRobux, rate);
          embed.addFields(
            { name: "💎 Preço em Robux", value: `${formatRobux(gp.priceInRobux)} Robux`, inline: true },
            { name: "💵 Preço em BRL", value: formatBrl(priceBrl), inline: true },
          );
        } else {
          embed.addFields({ name: "💎 Preço", value: "Gratuito / Sem preço", inline: true });
        }

        if (gp.thumbnailUrl) embed.setThumbnail(gp.thumbnailUrl);
        embed.setFooter({ text: footerText(rate) });

        await loading.edit({ embeds: [embed] });
        return;
      }

      // ── !setraxa <robux> <brl>  — admin only ─────────────────────────────
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

      // ── !ajuda ────────────────────────────────────────────────────────────
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
              { name: "`!simular <v1> <v2> ...`", value: "Tabela de múltiplos valores (até 8)" },
              { name: "`!gamepass <ID ou link>`", value: "Busca informações de um gamepass do Roblox" },
              { name: "`!historico`", value: "Últimas alterações de taxa" },
              { name: "`!status`", value: "Uptime e estatísticas do bot" },
              { name: "`!setraxa <robux> <R$>`", value: "*(Admin)* Atualiza a taxa" },
              { name: "`!ping`", value: "Latência do bot" },
              { name: "`!ajuda`", value: "Mostra esta mensagem" },
            )
            .addFields({
              name: "Exemplos",
              value:
                "`!robux 100` → Robux com R$100\n" +
                "`!brl 1000` → quanto custa 1000 Robux\n" +
                "`!gamepass 12345678` → info + preço em BRL\n" +
                "`!setraxa 1000 40` → 1000 Robux = R$40,00",
            })
            .setFooter({ text: footerText(rate) }),
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
