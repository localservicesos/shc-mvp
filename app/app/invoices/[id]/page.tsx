import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/invoices/status-badge";
import { PrintButton } from "@/components/invoices/print-button";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { getInvoice } from "@/lib/db/invoices";
import { formatMoney } from "@/lib/utils/format";
import { formatScheduled } from "@/lib/utils/date";
import {
  deleteInvoiceAction,
  markInvoicePaidAction,
  markInvoiceSentAction,
  markInvoiceVoidAction,
} from "../actions";

export const metadata = {
  title: "Invoice",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [business, invoice] = await Promise.all([
    getCurrentBusiness(),
    getInvoice(id),
  ]);
  if (!invoice) notFound();

  const job = invoice.job;
  const customer = job?.customer;
  const vehicle = job?.vehicle;
  const service = job?.service;
  const vehicleText = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
      vehicle.plate ||
      ""
    : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="print:hidden">
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === "draft" ? (
            <form action={markInvoiceSentAction.bind(null, invoice.id)}>
              <Button type="submit" size="sm">
                Mark as sent
              </Button>
            </form>
          ) : null}
          {invoice.status === "sent" ? (
            <form action={markInvoicePaidAction.bind(null, invoice.id)}>
              <Button type="submit" size="sm">
                Mark as paid
              </Button>
            </form>
          ) : null}
          {invoice.status !== "void" && invoice.status !== "paid" ? (
            <form action={markInvoiceVoidAction.bind(null, invoice.id)}>
              <Button type="submit" size="sm" variant="outline">
                Void
              </Button>
            </form>
          ) : null}
          <PrintButton />
          <form action={deleteInvoiceAction.bind(null, invoice.id)}>
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              aria-label="Delete invoice"
              title="Delete invoice"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <article className="rounded-lg border bg-card p-8 shadow-xs print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              From
            </p>
            <p className="text-lg font-semibold">{business?.name ?? "—"}</p>
            {business?.abn ? (
              <p className="text-xs text-muted-foreground">ABN {business.abn}</p>
            ) : null}
            {business?.phone ? (
              <p className="text-xs text-muted-foreground">{business.phone}</p>
            ) : null}
            {business?.email ? (
              <p className="text-xs text-muted-foreground">{business.email}</p>
            ) : null}
            {business?.address ? (
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                {business.address}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Invoice
            </p>
            <p className="text-lg font-semibold">{invoice.invoice_number}</p>
            <p className="text-xs text-muted-foreground">
              Issued {formatDate(invoice.created_at)}
            </p>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Bill to
            </p>
            <p className="text-sm font-medium">{customer?.name ?? "—"}</p>
            {customer?.phone ? (
              <p className="text-sm text-muted-foreground">{customer.phone}</p>
            ) : null}
            {customer?.email ? (
              <p className="text-sm text-muted-foreground">{customer.email}</p>
            ) : null}
            {customer?.address ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {customer.address}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Vehicle
            </p>
            <p className="text-sm font-medium">{vehicleText || "—"}</p>
            {vehicle?.plate ? (
              <p className="text-sm text-muted-foreground">
                Plate {vehicle.plate}
              </p>
            ) : null}
            {vehicle?.color ? (
              <p className="text-sm text-muted-foreground">{vehicle.color}</p>
            ) : null}
          </div>
        </section>

        <section className="border-t pt-6">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">Service</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="py-3">
                  <p className="font-medium">{service?.name ?? "Service"}</p>
                  {service?.description ? (
                    <p className="text-xs text-muted-foreground">
                      {service.description}
                    </p>
                  ) : null}
                  {job?.scheduled_start ? (
                    <p className="pt-1 text-xs text-muted-foreground">
                      Scheduled {formatScheduled(job.scheduled_start)}
                    </p>
                  ) : null}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {formatMoney(invoice.amount, business?.currency)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td className="pt-4 text-sm text-muted-foreground">Subtotal</td>
                <td className="pt-4 text-right text-sm tabular-nums text-muted-foreground">
                  {formatMoney(invoice.subtotal, business?.currency)}
                </td>
              </tr>
              <tr>
                <td className="pt-1 text-sm text-muted-foreground">GST (10%)</td>
                <td className="pt-1 text-right text-sm tabular-nums text-muted-foreground">
                  {formatMoney(invoice.gst_amount, business?.currency)}
                </td>
              </tr>
              <tr className="border-t">
                <td className="pt-3 text-sm font-semibold">Total (inc. GST)</td>
                <td className="pt-3 text-right text-lg font-semibold tabular-nums">
                  {formatMoney(invoice.amount, business?.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {job?.notes ? (
          <section className="border-t pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Notes
            </p>
            <p className="whitespace-pre-wrap pt-2 text-sm">{job.notes}</p>
          </section>
        ) : null}

        <footer className="border-t pt-6 text-xs text-muted-foreground">
          <p className="flex flex-wrap items-center gap-2">
            <span>Status:</span>
            <InvoiceStatusBadge status={invoice.status} />
            {invoice.sent_at ? (
              <span>· Sent {formatDate(invoice.sent_at)}</span>
            ) : null}
            {invoice.paid_at ? (
              <span>· Paid {formatDate(invoice.paid_at)}</span>
            ) : null}
          </p>
          {/* TODO: integrate email send (e.g. Resend) when invoice is marked sent */}
        </footer>
      </article>

      <div className="print:hidden">
        {job ? (
          <Link
            href={`/app/jobs/${job.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Open underlying job →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
