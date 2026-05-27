export const INVOICE_STATUSES = ["draft", "sent", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
};

export type Invoice = {
  id: string;
  business_id: string;
  job_id: string;
  invoice_number: string;
  subtotal: number;
  gst_amount: number;
  amount: number;       // grand total = subtotal + gst_amount
  status: InvoiceStatus;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};
