import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils/format";
import { JOB_STATUS_LABELS, type JobStatus } from "@/types/jobs";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/types/invoices";
import type { SearchIndexItem, SearchScope } from "@/types/search";

/**
 * Builds a lightweight, client-filterable search index. Pages load the index
 * once (per scope) and filter it in the browser, so typing is instant with no
 * per-keystroke round-trip. All queries rely on Supabase RLS for business
 * scoping, exactly like the rest of `lib/db/*`.
 *
 * Trade-off: the index is a snapshot taken at load time. It refreshes on
 * navigation and when the bar is re-opened after going stale (see SearchBar),
 * which is plenty fresh for the operational dataset sizes here. The cap below
 * bounds how much each entity can contribute.
 */
const INDEX_CAP = 500;

function vehicleLabel(v: {
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  return [v.year?.toString(), v.make, v.model].filter(Boolean).join(" ") || "Vehicle";
}

function join(...parts: (string | null | undefined)[]): string | undefined {
  return parts.filter(Boolean).join(" · ") || undefined;
}

/** Lowercased blob of searchable fields. */
function haystack(...parts: (string | number | null | undefined)[]): string {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== "")
    .join(" ")
    .toLowerCase();
}

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  vehicles: { plate: string | null }[] | null;
};

async function indexCustomers(): Promise<SearchIndexItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, vehicles(plate)")
    .order("name", { ascending: true })
    .limit(INDEX_CAP);

  if (error) throw error;
  return ((data ?? []) as CustomerRow[]).map((c) => {
    const plates = (c.vehicles ?? [])
      .map((v) => v.plate)
      .filter((p): p is string => Boolean(p));
    const extra = [c.address, ...plates].filter(
      (x): x is string => Boolean(x),
    );
    return {
      id: c.id,
      type: "customer" as const,
      title: c.name,
      subtitle: join(c.phone, c.email),
      href: `/app/customers/${c.id}`,
      // Searchable by name, phone, email, address, and any vehicle plate;
      // address/plate are surfaced in the result when they're what matched.
      haystack: haystack(c.name, c.phone, c.email, c.address, ...plates),
      extra,
    };
  });
}

type VehicleRow = {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  plate: string | null;
  customer_id: string;
  customer: { name: string } | { name: string }[] | null;
};

async function indexVehicles(): Promise<SearchIndexItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, make, model, year, color, plate, customer_id, customer:customers(name)",
    )
    .limit(INDEX_CAP);

  if (error) throw error;
  return ((data ?? []) as VehicleRow[]).map((v) => {
    const owner = Array.isArray(v.customer) ? v.customer[0] : v.customer;
    return {
      id: v.id,
      type: "vehicle" as const,
      title: vehicleLabel(v),
      subtitle: join(v.plate, owner?.name),
      // Vehicles have no standalone page — open the owning customer.
      href: `/app/customers/${v.customer_id}`,
      haystack: haystack(
        v.year,
        v.make,
        v.model,
        v.color,
        v.plate,
        owner?.name,
      ),
    };
  });
}

async function indexServices(): Promise<SearchIndexItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, base_price")
    .order("name", { ascending: true })
    .limit(INDEX_CAP);

  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    type: "service" as const,
    title: s.name,
    subtitle: formatMoney(s.base_price),
    href: `/app/services`,
    // Search services by name only — description is intentionally excluded.
    haystack: haystack(s.name),
  }));
}

type InvoiceRow = {
  id: string;
  invoice_number: string;
  amount: number;
  status: InvoiceStatus;
  job: { customer: { name: string } | { name: string }[] | null } | { customer: { name: string } | { name: string }[] | null }[] | null;
};

async function indexInvoices(): Promise<SearchIndexItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, amount, status, job:jobs(customer:customers(name))",
    )
    .order("created_at", { ascending: false })
    .limit(INDEX_CAP);

  if (error) throw error;
  return ((data ?? []) as InvoiceRow[]).map((i) => {
    const job = Array.isArray(i.job) ? i.job[0] : i.job;
    const customer = job
      ? Array.isArray(job.customer)
        ? job.customer[0]
        : job.customer
      : null;
    const statusLabel = INVOICE_STATUS_LABELS[i.status];
    return {
      id: i.id,
      type: "invoice" as const,
      title: i.invoice_number,
      subtitle: join(formatMoney(i.amount), statusLabel),
      href: `/app/invoices/${i.id}`,
      haystack: haystack(i.invoice_number, statusLabel, customer?.name),
    };
  });
}

type JobRow = {
  id: string;
  status: JobStatus;
  notes: string | null;
  customer: { name: string } | { name: string }[] | null;
  vehicle:
    | { make: string | null; model: string | null; year: number | null; plate: string | null }
    | { make: string | null; model: string | null; year: number | null; plate: string | null }[]
    | null;
};

async function indexJobs(): Promise<SearchIndexItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, status, notes, customer:customers(name), vehicle:vehicles(make, model, year, plate)",
    )
    .order("scheduled_start", { ascending: false, nullsFirst: false })
    .limit(INDEX_CAP);

  if (error) throw error;
  return ((data ?? []) as JobRow[]).map((j) => {
    const customer = Array.isArray(j.customer) ? j.customer[0] : j.customer;
    const vehicle = Array.isArray(j.vehicle) ? j.vehicle[0] : j.vehicle;
    const statusLabel = JOB_STATUS_LABELS[j.status];
    return {
      id: j.id,
      type: "job" as const,
      title: customer?.name ?? "Job",
      subtitle: join(vehicle ? vehicleLabel(vehicle) : null, statusLabel),
      href: `/app/jobs/${j.id}`,
      haystack: haystack(
        customer?.name,
        vehicle?.make,
        vehicle?.model,
        vehicle?.year,
        vehicle?.plate,
        j.notes,
        statusLabel,
      ),
      // Surface the plate in the result when that's what matched.
      extra: vehicle?.plate ? [vehicle.plate] : undefined,
    };
  });
}

/**
 * Returns the searchable index for a scope. `general` (Dashboard) concatenates
 * every entity; a scoped page returns just its own entity. Filtering and
 * grouping happen in the browser.
 */
export async function buildSearchIndex(
  scope: SearchScope,
): Promise<SearchIndexItem[]> {
  if (scope === "general") {
    const [customers, vehicles, jobs, invoices, services] = await Promise.all([
      indexCustomers(),
      indexVehicles(),
      indexJobs(),
      indexInvoices(),
      indexServices(),
    ]);
    return [...customers, ...vehicles, ...jobs, ...invoices, ...services];
  }

  switch (scope) {
    case "customers":
      return indexCustomers();
    case "vehicles":
      return indexVehicles();
    case "jobs":
      return indexJobs();
    case "invoices":
      return indexInvoices();
    case "services":
      return indexServices();
  }
}
