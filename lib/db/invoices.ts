import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { toTitleCase } from "@/lib/utils/format";
import type { Customer } from "@/lib/db/customers";
import type { Vehicle } from "@/lib/db/vehicles";
import type { Service } from "@/lib/db/services";
import { jobTotal, type Job } from "@/types/jobs";
import type { Invoice, InvoiceStatus } from "@/types/invoices";

export type { Invoice, InvoiceStatus } from "@/types/invoices";
export { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from "@/types/invoices";

export type InvoiceWithRelations = Invoice & {
  job:
    | (Pick<
        Job,
        | "id"
        | "scheduled_start"
        | "scheduled_end"
        | "notes"
        | "price"
        | "discount"
        | "extra"
        | "adjustment_note"
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
  "*, job:jobs(id, scheduled_start, scheduled_end, notes, price, discount, extra, adjustment_note, customer:customers(id, name, phone, email, address), vehicle:vehicles(id, make, model, year, color, plate), service:services(id, name, description))";

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

export const INVOICES_PAGE_SIZE = 50;

/**
 * Page through invoices instead of fetching the whole table. `total` is the
 * full row count so the UI can render page controls.
 */
export async function listInvoicesPaged(
  page = 1,
  pageSize = INVOICES_PAGE_SIZE,
): Promise<{ rows: InvoiceWithRelations[]; total: number }> {
  const first = (Math.max(1, page) - 1) * pageSize;
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("invoices")
    .select(RELATIONS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(first, first + pageSize - 1);

  if (error) throw error;
  return {
    rows: ((data ?? []) as unknown as InvoiceWithRelations[]).map(normalizeInvoice),
    total: count ?? 0,
  };
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
 *
 * Derives the next number from the highest *numeric* invoice number in use —
 * not the most recently created one. Ordering by created_at was unsafe:
 * after an invoice is deleted and regenerated, the newest row can carry a
 * lower number than an existing one, producing a duplicate that violates the
 * `unique (business_id, invoice_number)` constraint.
 *
 * Still not concurrency-proof on its own (two callers can read the same max);
 * `createInvoiceForJob` retries on the resulting 23505. Promote to a Postgres
 * sequence / SECURITY DEFINER function when multi-user load is real.
 */
async function nextInvoiceNumber(businessId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("business_id", businessId);

  if (error) throw error;

  let max = 0;
  for (const row of data ?? []) {
    const match = /(\d+)/.exec(row.invoice_number ?? "");
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `INV-${String(max + 1).padStart(4, "0")}`;
}

export async function createInvoiceForJob(jobId: string): Promise<Invoice> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No current business");

  const supabase = await createClient();

  // Fast-path: return existing invoice if already created.
  const existing = await getInvoiceByJob(jobId);
  if (existing) return existing;

  // Snapshot the job's current price and adjustments.
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("price, discount, extra")
    .eq("id", jobId)
    .single();
  if (jobError) throw jobError;

  // Calculate GST (10% inclusive — Australian standard).
  // amount is the grand total; subtotal is amount / 1.1; gst is the remainder.
  // The total folds in the job's fixed discount/extra adjustments.
  const total = jobTotal(job);
  const subtotal = Math.round((total / 1.1) * 100) / 100;
  const gst_amount = Math.round((total - subtotal) * 100) / 100;

  // Retry to absorb 23505 (unique_violation) collisions. Two constraints can
  // fire: `invoices_job_id_uk` (job already invoiced) and
  // `unique (business_id, invoice_number)` (number already taken). We allocate
  // a fresh number each attempt so a number clash resolves on the next pass.
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoice_number = await nextInvoiceNumber(business.id);

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

    if (!error) return data as Invoice;

    if (error.code === "23505") {
      // job_id collision → a concurrent request already invoiced this job;
      // return the winner. Otherwise it's an invoice_number clash → retry.
      const race = await getInvoiceByJob(jobId);
      if (race) return race;
      continue;
    }

    throw error;
  }

  throw new Error("Couldn't create the invoice. Try again.");
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
