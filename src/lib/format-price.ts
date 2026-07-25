const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  BGN: "лв.",
};

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatMoney(amount: number, currencyCode: string) {
  const currency = currencyCode.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[currency];

  if (symbol === "лв.") {
    return `${formatAmount(amount)} ${symbol}`;
  }
  if (symbol) {
    return `${symbol}${formatAmount(amount)}`;
  }
  return `${formatAmount(amount)} ${currency}`;
}

type PriceFields = {
  priceType: string;
  priceMin?: unknown;
  priceMax?: unknown;
  currency?: string | null;
};

/** Label for badges: "Безплатно", "£26.87", "£15 – £40", or "Платено" fallback. */
export function formatEventPriceLabel(event: PriceFields): string | null {
  if (event.priceType === "FREE") return "Безплатно";
  if (event.priceType === "UNKNOWN") return null;
  if (event.priceType !== "PAID") return null;

  const min =
    event.priceMin != null && event.priceMin !== ""
      ? Number(event.priceMin)
      : null;
  const max =
    event.priceMax != null && event.priceMax !== ""
      ? Number(event.priceMax)
      : null;

  if (
    (min == null || Number.isNaN(min)) &&
    (max == null || Number.isNaN(max))
  ) {
    return "Платено";
  }

  const currency = event.currency?.trim() || "EUR";
  const low = min ?? max!;
  const high = max ?? min!;

  if (low !== high) {
    return `${formatMoney(low, currency)} – ${formatMoney(high, currency)}`;
  }

  return formatMoney(low, currency);
}
