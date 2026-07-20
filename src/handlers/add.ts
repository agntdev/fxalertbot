import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { addAlert } from "../alerts-store.js";
import { inlineButton, inlineKeyboard, confirmKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function isValidPair(pair: string): boolean {
  return /^[A-Z]{6}$/.test(pair);
}

function startAddFlow(
  ctx: {
    session: Ctx["session"];
    reply: (text: string, opts?: object) => Promise<unknown>;
    editMessageText: (text: string, opts?: object) => Promise<unknown>;
    answerCallbackQuery: () => Promise<unknown>;
  },
  isCallback: boolean,
) {
  ctx.session.step = "add:pair";
  ctx.session.addPair = undefined;
  ctx.session.addDirection = undefined;
  ctx.session.addPriceStr = undefined;
  const text =
    "Which currency pair?\n\nSend it in standard format, e.g. EURUSD or GBPJPY.";
  if (isCallback) {
    return ctx.answerCallbackQuery().then(() => ctx.editMessageText(text));
  }
  return ctx.reply(text);
}

composer.command("add", async (ctx) => {
  await startAddFlow(ctx, false);
});

composer.callbackQuery("add:start", async (ctx) => {
  await startAddFlow(ctx, true);
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "add:pair") return next();

  const pair = ctx.message.text.trim().toUpperCase();
  if (!isValidPair(pair)) {
    await ctx.reply(
      "Invalid pair format. Use six letters, e.g. EURUSD. Try again:",
    );
    return;
  }

  ctx.session.addPair = pair;
  ctx.session.step = "add:dir";
  await ctx.reply(
    "Should I alert you when the price goes above or below your target?",
    {
      reply_markup: inlineKeyboard([
        [
          inlineButton("⬆️ Above", "add:dir:above"),
          inlineButton("⬇️ Below", "add:dir:below"),
        ],
        [inlineButton("Cancel", "add:cancel")],
      ]),
    },
  );
});

composer.callbackQuery("add:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = undefined;
  ctx.session.addPair = undefined;
  ctx.session.addDirection = undefined;
  ctx.session.addPriceStr = undefined;
  await ctx.editMessageText("Alert creation cancelled.", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery(/^add:dir:(above|below)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dir = ctx.match[1] as "above" | "below";
  ctx.session.addDirection = dir;
  ctx.session.step = "add:price";
  const label = dir === "above" ? "above" : "below";
  await ctx.editMessageText(
    `Got it — alert when ${ctx.session.addPair} goes ${label} a target price.\n\nWhat price?`,
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "add:price") return next();

  const raw = ctx.message.text.trim();
  const price = parseFloat(raw);
  if (isNaN(price) || price <= 0) {
    await ctx.reply(
      "Please enter a valid positive number, e.g. 1.0850. Try again:",
    );
    return;
  }

  ctx.session.addPriceStr = raw;
  ctx.session.step = "add:confirm";

  const dirLabel = ctx.session.addDirection === "above" ? "above" : "below";
  const kb = confirmKeyboard("add:confirm", {
    yes: "✅ Create alert",
    no: "❌ Cancel",
  });
  const rows = [
    ...kb.inline_keyboard,
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ];
  await ctx.reply(
    `Confirm your alert:\n\n` +
      `Pair: ${ctx.session.addPair}\n` +
      `Direction: ${dirLabel} ${raw}\n\n` +
      `Tap Create to activate, or Cancel to abort.`,
    { reply_markup: inlineKeyboard(rows) },
  );
});

composer.callbackQuery("add:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (
    !ctx.session.addPair ||
    !ctx.session.addDirection ||
    !ctx.session.addPriceStr
  ) {
    await ctx.editMessageText("Something went wrong. Tap /start to try again.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const priceNum = parseFloat(ctx.session.addPriceStr);
  const id = `alrt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  addAlert({
    id,
    userId: ctx.from!.id,
    pair: ctx.session.addPair,
    direction: ctx.session.addDirection as "above" | "below",
    targetPrice: priceNum,
    active: true,
    createdAt: new Date().toISOString(),
  });

  const dirLabel = ctx.session.addDirection === "above" ? "above" : "below";
  await ctx.editMessageText(
    `✅ Alert created!\n\n` +
      `Pair: ${ctx.session.addPair}\n` +
      `Direction: ${dirLabel} ${ctx.session.addPriceStr}\n` +
      `ID: ${id}\n\n` +
      `You'll get a private message when the price crosses your threshold.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );

  ctx.session.step = undefined;
  ctx.session.addPair = undefined;
  ctx.session.addDirection = undefined;
  ctx.session.addPriceStr = undefined;
});

composer.callbackQuery("add:confirm:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = undefined;
  ctx.session.addPair = undefined;
  ctx.session.addDirection = undefined;
  ctx.session.addPriceStr = undefined;
  await ctx.editMessageText("Alert creation cancelled.", {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
