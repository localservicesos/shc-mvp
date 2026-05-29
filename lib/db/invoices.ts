import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { toTitleCase } from "@/lib/utils/format";
import type { Customer } from "@/lib/db/customers";
import type { Vehicle } from "@/lib/db/vehicles";
import type { Service } from "@/lib/db/services";
import type { Job } from "@/types/jobs";
import type { Invoice, InvoiceStatus } from "@/types/invoices";

export type { Invoice, InvoiceStatus } from "@/types/invoices";
export { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from "@/types/invoices";

export type InvoiceWithRelations = Invoice & {
  job:
    | (Pick<
        Job,
        "id" | "scheduled_start" | "scheduled_end" | "notes" | "price"
      > & {
        customer: Pick<
          Customer,
          "id" | "name" | "phone" | "email" | "address"
        > | null;
        vehicle: Pick<
          Vehicle,
          "id" | "make" | "model" | "year" | "color" | "plate"
        > | null;
        service: Pick<Service, "id" | "name" | "description"> | null;
      })
    | null;
};

const RELATIONS =
  "*, job:jobs(id, scheduled_start, scheduled_end, notes, price, customer:customers(id, name, phone, email, address), vehicle:vehicles(id, make, model, year, color, plate), service:services(id, name, description))";

/** Title-case the invoice's customer name and address for consistent display. */
function normalizeInvoice(invoice: InvoiceWithRelations): InvoiceWithRelations {
  const customer = invoice.job?.customer;
  if (!customer) return invoice;
  return {
    ...invoice,
    job: {
      ...invoice.job!,
      customer: {
        ...customer,
        name: toTitleCase(customer.name),
        address: customer.address ? toTitleCase(customer.address) : customer.address,
      },
    },
  };
}

export async function listInvoices(): Promise<InvoiceWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(RELATIONS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as InvoiceWithRelations[]).map(normalizeInvoice);
}

export async function getInvoice(
  id: string,
): Promise<InvoiceWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(RELATIONS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data
    ? normalizeInvoice(data as unknown as InvoiceWithRelations)
    : null;
}

export async function getInvoiceByJob(
  jobId: string,
): Promise<Invoice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Invoice | null;
}

/**
 * Generate the next invoice number for a business. Format: INV-0001.
 * Uses MAX(invoice_number) and increments; safe enough for the MVP
 * (single-user). When concurrent invoice creation becomes a real concern,
 * promote this to a Postgres sequence or a SECURITY DEFINER function.
 */
async function nextInvoiceNumber(businessId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  let next = 1;
  if (data?.invoice_number) {
    const match = /(\d+)/.exec(data.invoice_number);
    if (match) next = Number.parseInt(match[1], 10) + 1;
  }
  return `INV-${String(next).padStart(4, "0")}`;
}

export async function createInvoiceForJob(jobId: string): Promise<Invoice> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No current business");

  const supabase = await createClient();

  // Fast-path: return existing invoice if already created.
  const existing = await getInvoiceByJob(jobId);
  if (existing) return existing;

  // Snapshot the job's current price.
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("price")
    .eq("id", jobId)
    .single();
  if (jobError) throw jobError;

  const invoice_number = await nextInvoiceNumber(business.id);

  // Calculate GST (10% inclusive — Australian standard).
  // amount is the grand total; subtotal is amount / 1.1; gst is the remainder.
  const total = job.price ?? 0;
  const subtotal = Math.round((total / 1.1) * 100) / 100;
  const gst_amount = Math.round((total - subtotal) * 100) / 100;

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      business_id: business.id,
      job_id: jobId,
      invoice_number,
      subtotal,
      gst_amount,
      amount: total,
      status: "draft" as InvoiceStatus,
    })
    .select("*")
    .single();

  // 23505 = unique_violation — a concurrent request already created the
  // invoice between our check above and this insert. Return that invoice
  // instead of throwing an error.
  if (error?.code === "23505") {
    const race = await getInvoiceByJob(jobId);
    if (race) return race;
  }

  if (error) throw error;
  return data as Invoice;
}

export async function markInvoiceSent(id: string): Promise<Invoice> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Invoice;
}

export async function markInvoicePaid(id: string): Promise<Invoice> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Invoice;
}

export async function markInvoiceVoid(id: string): Promise<Invoice> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "void" })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}
