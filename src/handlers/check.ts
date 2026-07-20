import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const forexApiBase = "https://api.frankfurter.dev";

composer.callbackQuery("check:price", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "check:awaiting_pair";
  await ctx.editMessageText(
    "Which currency pair? Send it in standard format, e.g. EURUSD.",
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "check:awaiting_pair") return next();

  const pair = ctx.message.text.trim().toUpperCase();
  if (!/^[A-Z]{6}$/.test(pair)) {
    await ctx.reply("Invalid pair format. Use six letters, e.g. EURUSD. Try again:");
    return;
  }

  const base = pair.slice(0, 3);
  const quote = pair.slice(3, 6);

  try {
    const res = await fetch(`${forexApiBase}/latest?base=${base}&symbols=${quote}`);
    if (!res.ok) {
      await ctx.reply(`Couldn't fetch the price for ${pair}. Try again later.`, {
        reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
      });
      ctx.session.step = undefined;
      return;
    }
    const data = (await res.json()) as { rates?: Record<string, number>; error?: string };
    if (data.error || !data.rates || !data.rates[quote]) {
      await ctx.reply(`No rate available for ${pair}. Try a different pair.`, {
        reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
      });
      ctx.session.step = undefined;
      return;
    }
    const rate = data.rates[quote];
    ctx.session.step = undefined;
    await ctx.reply(
      `${pair}: ${rate}`,
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
  } catch {
    ctx.session.step = undefined;
    await ctx.reply("Network error — couldn't reach the price feed. Try again later.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  }
});

export default composer;
