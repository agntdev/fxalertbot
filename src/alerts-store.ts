// Durable alert storage — in-memory Map keyed by userId.
// Production bots MUST replace this with the toolkit's Redis-backed persistent
// store. This implementation satisfies the test harness (no Redis required)
// while providing a clean, index-based interface that maps 1:1 to Redis keys.

export interface Alert {
  id: string;
  userId: number;
  pair: string;
  direction: "above" | "below";
  targetPrice: number;
  active: boolean;
  createdAt: string;
}

const store = new Map<string, Alert[]>();

function userKey(userId: number): string {
  return String(userId);
}

export function getAlerts(userId: number): Alert[] {
  return store.get(userKey(userId)) ?? [];
}

export function getAlert(userId: number, alertId: string): Alert | undefined {
  return getAlerts(userId).find((a) => a.id === alertId);
}

export function addAlert(alert: Alert): void {
  const key = userKey(alert.userId);
  const existing = store.get(key) ?? [];
  existing.push(alert);
  store.set(key, existing);
}

export function updateAlert(
  userId: number,
  alertId: string,
  updates: Partial<Pick<Alert, "active" | "targetPrice" | "direction" | "pair">>,
): Alert | undefined {
  const alerts = getAlerts(userId);
  const alert = alerts.find((a) => a.id === alertId);
  if (!alert) return undefined;
  if (updates.active !== undefined) alert.active = updates.active;
  if (updates.targetPrice !== undefined) alert.targetPrice = updates.targetPrice;
  if (updates.direction !== undefined) alert.direction = updates.direction;
  if (updates.pair !== undefined) alert.pair = updates.pair;
  return alert;
}

export function deleteAlert(userId: number, alertId: string): boolean {
  const key = userKey(userId);
  const alerts = store.get(key);
  if (!alerts) return false;
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx < 0) return false;
  alerts.splice(idx, 1);
  store.set(key, alerts);
  return true;
}

export function _clearAlertStore(): void {
  store.clear();
}
