"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createInvoiceForJob,
  deleteInvoice,
  markInvoicePaid,
  markInvoiceSent,
  markInvoiceVoid,
} from "@/lib/db/invoices";

export async function generateInvoiceFromJobAction(jobId: string) {
  const invoice = await createInvoiceForJob(jobId);
  revalidatePath("/app/invoices");
  revalidatePath(`/app/jobs/${jobId}`);
  redirect(`/app/invoices/${invoice.id}`);
}

export async function markInvoiceSentAction(id: string) {
  await markInvoiceSent(id);
  revalidatePath("/app/invoices");
  revalidatePath(`/app/invoices/${id}`);
}

export async function markInvoicePaidAction(id: string) {
  await markInvoicePaid(id);
  revalidatePath("/app/invoices");
  revalidatePath(`/app/invoices/${id}`);
}

export async function markInvoiceVoidAction(id: string) {
  await markInvoiceVoid(id);
  revalidatePath("/app/invoices");
  revalidatePath(`/app/invoices/${id}`);
}

export async function deleteInvoiceAction(id: string) {
  await deleteInvoice(id);
  revalidatePath("/app/invoices");
  redirect("/app/invoices");
}
