/**
 * Format a numeric amount as currency. Defaults to AUD per the MVP business.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string = "AUD",
): string {
  const value =
    typeof amount === "string" ? Number.parseFloat(amount) : amount ?? 0;
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(value);
}
