import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getAlerts } from "../alerts-store.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function renderAlerts(alerts: ReturnType<typeof getAlerts>): string {
  if (alerts.length === 0) {
    return "No alerts yet — tap ➕ Add alert to create one.";
  }
  const lines = alerts.map((a) => {
    const status = a.active ? "🟢 Active" : "⏸ Paused";
    const dir = a.direction === "above" ? "↑" : "↓";
    return `${a.pair} ${dir} ${a.targetPrice}  —  ${status}  —  ID: ${a.id}`;
  });
  return "Your alerts:\n\n" + lines.join("\n\n");
}

function alertKeyboard(alerts: ReturnType<typeof getAlerts>) {
  if (alerts.length === 0) {
    return inlineKeyboard([[inlineButton("➕ Add alert", "add:start")], [inlineButton("⬅️ Back to menu", "menu:main")]]);
  }
  const rows = alerts.map((a) => {
    const label = a.active ? "⏸ Pause" : "▶️ Resume";
    const action = a.active ? "list:pause" : "list:resume";
    return [
      inlineButton(label, `${action}:${a.id}`),
      inlineButton("🗑 Delete", `list:delete:${a.id}`),
    ];
  });
  rows.push([inlineButton("➕ Add alert", "add:start")]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  return inlineKeyboard(rows);
}

composer.command("list", async (ctx) => {
  const alerts = getAlerts(ctx.from!.id);
  await ctx.reply(renderAlerts(alerts), { reply_markup: alertKeyboard(alerts) });
});

composer.callbackQuery("list:view", async (ctx) => {
  await ctx.answerCallbackQuery();
  const alerts = getAlerts(ctx.from!.id);
  await ctx.editMessageText(renderAlerts(alerts), { reply_markup: alertKeyboard(alerts) });
});

composer.callbackQuery(/^list:pause:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const alertId = ctx.match[1];
  const { updateAlert, getAlert } = await import("../alerts-store.js");
  const alert = getAlert(ctx.from!.id, alertId);
  if (!alert) {
    await ctx.editMessageText("Alert not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  updateAlert(ctx.from!.id, alertId, { active: false });
  const alerts = getAlerts(ctx.from!.id);
  await ctx.editMessageText(renderAlerts(alerts), { reply_markup: alertKeyboard(alerts) });
});

composer.callbackQuery(/^list:resume:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const alertId = ctx.match[1];
  const { updateAlert, getAlert } = await import("../alerts-store.js");
  const alert = getAlert(ctx.from!.id, alertId);
  if (!alert) {
    await ctx.editMessageText("Alert not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  updateAlert(ctx.from!.id, alertId, { active: true });
  const alerts = getAlerts(ctx.from!.id);
  await ctx.editMessageText(renderAlerts(alerts), { reply_markup: alertKeyboard(alerts) });
});

composer.callbackQuery(/^list:delete:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const alertId = ctx.match[1];
  const { deleteAlert, getAlert } = await import("../alerts-store.js");
  const alert = getAlert(ctx.from!.id, alertId);
  if (!alert) {
    await ctx.editMessageText("Alert not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  deleteAlert(ctx.from!.id, alertId);
  const alerts = getAlerts(ctx.from!.id);
  await ctx.editMessageText("Alert deleted.", { reply_markup: alertKeyboard(alerts) });
});

export default composer;
