import "server-only";
import type { CurrentBusiness } from "@/lib/db/current-business";
import type { InvoiceWithRelations } from "@/lib/db/invoices";
import { formatMoney } from "@/lib/utils/format";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export type InvoiceEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

export function buildInvoiceEmailTemplate({
  business,
  invoice,
}: {
  business: CurrentBusiness;
  invoice: InvoiceWithRelations;
}): InvoiceEmailTemplate {
  const customerName = invoice.job?.customer?.name?.trim() || "";
  const greeting = customerName ? `Hi ${customerName},` : "Hi,";
  const businessName = business.name || "our team";
  const serviceName = invoice.job?.service?.name?.trim() || "your recent service";
  const completedOn = formatDate(invoice.job?.scheduled_start ?? null);
  const serviceLine = completedOn
    ? `for the ${serviceName} service completed on ${completedOn}`
    : `for ${serviceName}`;
  const total = formatMoney(invoice.amount, business.currency);

  const subject = `Invoice ${invoice.invoice_number} from ${businessName}`;
  const text = [
    greeting,
    "",
    `Thank you for choosing ${businessName}.`,
    "",
    `Please find attached invoice ${invoice.invoice_number} ${serviceLine}.`,
    "",
    `Invoice total: ${total}`,
    "",
    "If you have any questions, just reply to this email.",
    "",
    "Thanks,",
    businessName,
  ].join("\n");

  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>Thank you for choosing ${escapeHtml(businessName)}.</p>`,
    `<p>Please find attached invoice <strong>${escapeHtml(
      invoice.invoice_number,
    )}</strong> ${escapeHtml(serviceLine)}.</p>`,
    `<p>Invoice total: <strong>${escapeHtml(total)}</strong></p>`,
    "<p>If you have any questions, just reply to this email.</p>",
    `<p>Thanks,<br />${escapeHtml(businessName)}</p>`,
  ].join("\n");

  return { subject, text, html };
}
