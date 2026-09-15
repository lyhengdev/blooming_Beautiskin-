type Money = number | string | { toString(): string };
interface ProfitItem {
  productId: string;
  quantity: number;
  price: Money;
  costPrice: Money | null;
  costRecorded: boolean;
  product: { name: string; sku: string; costPrice: Money | null };
}
interface ProfitOrder {
  status: string;
  createdAt: Date;
  total: Money;
  shippingCost: Money;
  items: ProfitItem[];
}
const cents = (value: Money) => Math.round(Number(value) * 100);
const dayKey = (date: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Phnom_Penh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);
const empty = () => ({ revenue: 0, cost: 0, unitsSold: 0, unitsWithoutCost: 0, estimatedUnits: 0, orders: 0 });
type Totals = ReturnType<typeof empty>;
interface MissingCostProduct {
  productId: string;
  name: string;
  sku: string;
  unitsWithoutCost: number;
  savedSalesWithoutCost: number;
}
interface EstimatedCostProduct {
  productId: string;
  name: string;
  sku: string;
  estimatedUnits: number;
  costPrice: number;
}
function finish(totals: Totals) {
  const profit = totals.unitsWithoutCost ? null : (totals.revenue - totals.cost) / 100;
  return { ...totals, revenue: totals.revenue / 100, cost: totals.cost / 100, profit,
    margin: profit === null || totals.revenue === 0 ? null : Math.round(profit / totals.revenue * 1000000) / 100 };
}

export interface ProfitOptions { from?: Date; to?: Date }

/** Product gross profit for active orders, including unpaid orders. Shipping and operating expenses are excluded. */
export function calculateProfitStats(orders: ProfitOrder[], now = new Date(), options: ProfitOptions = {}) {
  type PeriodKey = 'allTime' | 'last30Days' | 'today' | 'custom';
  const allTime = empty();
  const last30Days = empty();
  const today = empty();
  const hasCustom = options.from instanceof Date && options.to instanceof Date;
  let custom: ReturnType<typeof empty> | null = null;
  const missingCosts: Record<PeriodKey, Map<string, MissingCostProduct>> = {
    allTime: new Map(), last30Days: new Map(), today: new Map(), custom: new Map(),
  };
  const estimatedCosts: Record<PeriodKey, Map<string, EstimatedCostProduct>> = {
    allTime: new Map(), last30Days: new Map(), today: new Map(), custom: new Map(),
  };
  if (hasCustom) custom = empty();
  const todayKey = dayKey(now);
  const cutoff = now.getTime() - 30 * 86400000;
  const customFrom = hasCustom ? options.from!.getTime() : 0;
  const customTo = hasCustom ? options.to!.getTime() + 86400000 : 0;
  const products = new Map<string, Totals & { productId: string; name: string; sku: string }>();
  const trend = Array.from({ length: 7 }, (_, i) => ({ date: dayKey(new Date(now.getTime() - (6 - i) * 86400000)), ...empty() }));
  for (const order of orders) {
    if (['CANCELLED', 'REFUNDED'].includes(order.status) || order.createdAt > now) continue;
    const date = dayKey(order.createdAt);
    const buckets = [allTime];
    const periods: PeriodKey[] = ['allTime'];
    if (order.createdAt.getTime() >= cutoff) { periods.push('last30Days'); buckets.push(last30Days); }
    if (date === todayKey) { periods.push('today'); buckets.push(today); }
    if (hasCustom && order.createdAt.getTime() >= customFrom && order.createdAt.getTime() < customTo) {
      periods.push('custom');
      buckets.push(custom!);
    }
    const day = trend.find((entry) => entry.date === date);
    if (day) buckets.push(day);
    for (const bucket of buckets) bucket.orders++;
    // Use the charged total minus shipping: this also handles older sales where
    // the discount was applied to total but was not saved in the discount column.
    const netRevenue = cents(order.total) - cents(order.shippingCost);
    const grossRevenue = order.items.reduce((sum, item) => sum + cents(item.price) * item.quantity, 0);
    let allocated = 0;
    let cumulativeGross = 0;
    order.items.forEach((item, index) => {
      cumulativeGross += cents(item.price) * item.quantity;
      // Cumulative rounding allocates the discount exactly, to the cent.
      const cumulativeNet = index === order.items.length - 1 ? netRevenue
        : grossRevenue ? Math.round(netRevenue * cumulativeGross / grossRevenue) : 0;
      const revenue = cumulativeNet - allocated;
      allocated = cumulativeNet;
      const cost = item.costRecorded ? item.costPrice : item.product.costPrice;
      if (cost === null) {
        for (const period of periods) {
          const missing = missingCosts[period].get(item.productId) ?? {
            productId: item.productId, name: item.product.name, sku: item.product.sku,
            unitsWithoutCost: 0, savedSalesWithoutCost: 0,
          };
          missing.unitsWithoutCost += item.quantity;
          if (item.costRecorded) missing.savedSalesWithoutCost += item.quantity;
          missingCosts[period].set(item.productId, missing);
        }
      } else if (!item.costRecorded) {
        for (const period of periods) {
          const estimated = estimatedCosts[period].get(item.productId) ?? {
            productId: item.productId, name: item.product.name, sku: item.product.sku,
            estimatedUnits: 0, costPrice: cents(cost) / 100,
          };
          estimated.estimatedUnits += item.quantity;
          estimatedCosts[period].set(item.productId, estimated);
        }
      }
      const product = products.get(item.productId) ?? { ...empty(), productId: item.productId, name: item.product.name, sku: item.product.sku };
      products.set(item.productId, product);
      for (const bucket of [...buckets, product]) {
        bucket.revenue += revenue;
        bucket.unitsSold += item.quantity;
        if (cost === null) bucket.unitsWithoutCost += item.quantity;
        else {
          bucket.cost += cents(cost) * item.quantity;
          if (!item.costRecorded) bucket.estimatedUnits += item.quantity;
        }
      }
    });
  }
  const finishPeriod = (totals: Totals, period: PeriodKey) => ({
    ...finish(totals),
    missingCostProducts: [...missingCosts[period].values()]
      .sort((a, b) => b.unitsWithoutCost - a.unitsWithoutCost || a.name.localeCompare(b.name)),
    estimatedCostProducts: [...estimatedCosts[period].values()]
      .sort((a, b) => b.estimatedUnits - a.estimatedUnits || a.name.localeCompare(b.name)),
  });
  const result: Record<string, unknown> = {
    allTime: finishPeriod(allTime, 'allTime'), last30Days: finishPeriod(last30Days, 'last30Days'), today: finishPeriod(today, 'today'),
    trend: trend.map((day) => ({ date: day.date, ...finish(day) })),
    topProducts: [...products.values()].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 20)
      .map((product) => ({ ...product, ...finish(product) })),
  };
  if (custom) result.custom = finishPeriod(custom, 'custom');
  return result as { allTime: ReturnType<typeof finishPeriod>; last30Days: ReturnType<typeof finishPeriod>; today: ReturnType<typeof finishPeriod>; custom?: ReturnType<typeof finishPeriod>; trend: ReturnType<typeof finish>[]; topProducts: ReturnType<typeof finish & { productId: string; name: string; sku: string }>[] };
}

/** Keep internal cost snapshots out of customer-facing order responses. */
export function withoutOrderCosts<T extends { items: { costPrice: unknown; costRecorded: boolean }[] }>(order: T) {
  return { ...order, items: order.items.map(({ costPrice, costRecorded, ...item }) => item) };
}
