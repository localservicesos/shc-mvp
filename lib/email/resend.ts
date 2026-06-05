import "server-only";
import { Resend } from "resend";

let resend: Resend | null = null;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  resend ??= new Resend(apiKey);
  return resend;
}

export function getInvoiceFromEmail(): string {
  const from = process.env.INVOICE_FROM_EMAIL;
  if (!from) {
    throw new Error("INVOICE_FROM_EMAIL is not configured.");
  }
  return from;
}

export function getInvoiceReplyToEmail(): string | undefined {
  return process.env.INVOICE_REPLY_TO_EMAIL || undefined;
}
