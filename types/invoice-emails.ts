export type InvoiceEmailStatus = "sent" | "failed";

export type InvoiceEmail = {
  id: string;
  business_id: string;
  invoice_id: string;
  to_email: string;
  subject: string;
  provider: string;
  provider_message_id: string | null;
  status: InvoiceEmailStatus;
  error: string | null;
  sent_at: string | null;
  created_at: string;
};
