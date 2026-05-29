/**
 * Capitalize the first letter of each word. Used to normalize free-text
 * fields like customer names and addresses on save.
 */
export function toTitleCase(value: string): string {
  return value.replace(/\p{L}[\p{L}'’]*/gu, (word) =>
    // Preserve tokens that are already fully uppercase (e.g. QLD, NSW).
    word.length > 1 && word === word.toUpperCase()
      ? word
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

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
