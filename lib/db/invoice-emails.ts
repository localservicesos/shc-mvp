import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceEmail, InvoiceEmailStatus } from "@/types/invoice-emails";

export type InvoiceEmailInput = {
  business_id: string;
  invoice_id: string;
  to_email: string;
  subject: string;
  provider?: string;
  provider_message_id?: string | null;
  status?: InvoiceEmailStatus;
  error?: string | null;
  sent_at?: string | null;
};

export async function createInvoiceEmail(
  input: InvoiceEmailInput,
): Promise<InvoiceEmail> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoice_emails")
    .insert({
      provider: "resend",
      status: "sent",
      ...input,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as InvoiceEmail;
}
