import "server-only";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { CurrentBusiness } from "@/lib/db/current-business";
import type { InvoiceWithRelations } from "@/lib/db/invoices";
import { formatMoney } from "@/lib/utils/format";

const LOGO_PATH = join(process.cwd(), "public", "sunshine-hot-cars-logo.avif");
let logoDataUriPromise: Promise<string | null> | null = null;

async function getLogoDataUri(): Promise<string | null> {
  logoDataUriPromise ??= readFile(LOGO_PATH)
    .then((logo) => sharp(logo).png().toBuffer())
    .then((png) => `data:image/png;base64,${png.toString("base64")}`)
    .catch(() => null);

  return logoDataUriPromise;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatScheduled(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function vehicleLabel(invoice: InvoiceWithRelations): string {
  const vehicle = invoice.job?.vehicle;
  if (!vehicle) return "-";
  return (
    [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
    vehicle.plate ||
    "-"
  );
}

export function invoicePdfFilename(invoice: InvoiceWithRelations): string {
  const safeNumber = invoice.invoice_number
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `invoice-${safeNumber || "draft"}.pdf`;
}

const styles = StyleSheet.create({
  page: {
    padding: 42,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111827",
    lineHeight: 1.45,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 20,
    marginBottom: 22,
  },
  label: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
  },
  heading: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 5,
  },
  logo: {
    width: 96,
    height: 54,
    objectFit: "contain",
    marginBottom: 10,
  },
  muted: {
    color: "#6b7280",
    marginTop: 7, 
  },
  right: {
    textAlign: "right",
  },
  twoColumns: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 24,
  },
  column: {
    flex: 1,
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingTop: 9,
    paddingBottom: 9,
  },
  serviceCell: {
    flex: 1,
    paddingRight: 12,
  },
  amountCell: {
    width: 110,
    textAlign: "right",
  },
  totalBlock: {
    marginTop: 12,
    marginLeft: "auto",
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: "#111827",
    paddingTop: 8,
    marginTop: 4,
    fontSize: 13,
    fontWeight: 700,
  },
  section: {
    marginTop: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footer: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    color: "#6b7280",
    fontSize: 9,
  },
});

function InvoicePdfDocument({
  business,
  invoice,
  logoDataUri,
}: {
  business: CurrentBusiness;
  invoice: InvoiceWithRelations;
  logoDataUri: string | null;
}) {
  const job = invoice.job;
  const customer = job?.customer;
  const service = job?.service;
  const discount = job?.discount ?? 0;
  const extra = job?.extra ?? 0;
  const basePrice = job?.price ?? invoice.amount;
  const scheduled = formatScheduled(job?.scheduled_start ?? null);

  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author={business.name}
      subject={`Invoice ${invoice.invoice_number}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- React PDF Image has no alt prop.
              <Image src={logoDataUri} style={styles.logo} />
            ) : null}
            <Text style={styles.label}>From</Text>
            <Text style={styles.heading}>{business.name}</Text>
            <Text style={styles.muted}>ABN {business.abn ?? "not set"}</Text>
            {business.phone ? <Text style={styles.muted}>{business.phone}</Text> : null}
            {business.email ? <Text style={styles.muted}>{business.email}</Text> : null}
            {business.address ? <Text style={styles.muted}>{business.address}</Text> : null}
          </View>
          <View style={styles.right}>
            <Text style={styles.label}>Invoice</Text>
            <Text style={styles.title}>{invoice.invoice_number}</Text>
            <Text style={styles.muted}>Issued {formatDate(invoice.created_at)}</Text>
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.heading}>{customer?.name ?? "-"}</Text>
            {customer?.phone ? <Text style={styles.muted}>{customer.phone}</Text> : null}
            {customer?.email ? <Text style={styles.muted}>{customer.email}</Text> : null}
            {customer?.address ? <Text style={styles.muted}>{customer.address}</Text> : null}
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Vehicle</Text>
            <Text style={styles.heading}>{vehicleLabel(invoice)}</Text>
            {job?.vehicle?.plate ? <Text style={styles.muted}>Plate {job.vehicle.plate}</Text> : null}
            {job?.vehicle?.color ? <Text style={styles.muted}>{job.vehicle.color}</Text> : null}
          </View>
        </View>

        <View>
          <View style={styles.row}>
            <Text style={[styles.serviceCell, styles.label]}>Service</Text>
            <Text style={[styles.amountCell, styles.label]}>Amount</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <View style={styles.serviceCell}>
                <Text style={styles.heading}>{service?.name ?? "Service"}</Text>
                {service?.description ? (
                  <Text style={styles.muted}>{service.description}</Text>
                ) : null}
                {scheduled ? (
                  <Text style={styles.muted}>Scheduled {scheduled}</Text>
                ) : null}
              </View>
              <Text style={styles.amountCell}>
                {formatMoney(basePrice, business.currency)}
              </Text>
            </View>
            {discount > 0 ? (
              <View style={styles.row}>
                <Text style={styles.serviceCell}>Discount</Text>
                <Text style={styles.amountCell}>
                  -{formatMoney(discount, business.currency)}
                </Text>
              </View>
            ) : null}
            {extra > 0 ? (
              <View style={styles.row}>
                <Text style={styles.serviceCell}>Extra charge</Text>
                <Text style={styles.amountCell}>
                  +{formatMoney(extra, business.currency)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.totalBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatMoney(invoice.subtotal, business.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>GST (10%)</Text>
            <Text>{formatMoney(invoice.gst_amount, business.currency)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total inc. GST</Text>
            <Text>{formatMoney(invoice.amount, business.currency)}</Text>
          </View>
        </View>

        {job?.notes ? (
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <Text>{job.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>Status: {invoice.status}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf({
  business,
  invoice,
}: {
  business: CurrentBusiness;
  invoice: InvoiceWithRelations;
}): Promise<Buffer> {
  const logoDataUri = await getLogoDataUri();

  return renderToBuffer(
    <InvoicePdfDocument
      business={business}
      invoice={invoice}
      logoDataUri={logoDataUri}
    />,
  );
}
