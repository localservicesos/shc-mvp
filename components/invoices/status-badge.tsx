import { cn } from "@/lib/utils";
import {
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "@/types/invoices";

const STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  void: "bg-rose-100 text-rose-700",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
