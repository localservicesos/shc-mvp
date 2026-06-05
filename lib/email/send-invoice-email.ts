import "server-only";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { createInvoiceEmail } from "@/lib/db/invoice-emails";
import { getInvoice, markInvoiceSent } from "@/lib/db/invoices";
import { buildInvoiceEmailTemplate } from "@/lib/email/invoice-template";
import {
  getInvoiceFromEmail,
  getInvoiceReplyToEmail,
  getResendClient,
} from "@/lib/email/resend";
import { invoicePdfFilename, renderInvoicePdf } from "@/lib/pdf/invoice-pdf";

export async function sendInvoiceEmail(invoiceId: string): Promise<void> {
  const [business, invoice] = await Promise.all([
    getCurrentBusiness(),
    getInvoice(invoiceId),
  ]);

  if (!business) throw new Error("No current business.");
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.business_id !== business.id) throw new Error("Invoice not found.");
  if (!business.abn?.trim()) {
    throw new Error("Business ABN is required before emailing an invoice.");
  }
  if (invoice.status !== "draft") {
    throw new Error("Only draft invoices can be emailed.");
  }

  const toEmail = invoice.job?.customer?.email?.trim();
  if (!toEmail) {
    throw new Error("This customer does not have an email address.");
  }

  const template = buildInvoiceEmailTemplate({ business, invoice });
  const pdf = await renderInvoicePdf({ business, invoice });
  const filename = invoicePdfFilename(invoice);
  const now = new Date().toISOString();

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: getInvoiceFromEmail(),
    to: toEmail,
    replyTo: getInvoiceReplyToEmail() ?? business.email ?? undefined,
    subject: template.subject,
    text: template.text,
    html: template.html,
    attachments: [
      {
        filename,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
    tags: [
      { name: "invoice_id", value: invoice.id },
      { name: "invoice_number", value: invoice.invoice_number },
    ],
  });

  if (error) {
    await createInvoiceEmail({
      business_id: business.id,
      invoice_id: invoice.id,
      to_email: toEmail,
      subject: template.subject,
      provider_message_id: null,
      status: "failed",
      error: error.message,
      sent_at: null,
    });
    throw new Error(error.message);
  }

  await markInvoiceSent(invoice.id);
  await createInvoiceEmail({
    business_id: business.id,
    invoice_id: invoice.id,
    to_email: toEmail,
    subject: template.subject,
    provider_message_id: data?.id ?? null,
    status: "sent",
    error: null,
    sent_at: now,
  });
}
