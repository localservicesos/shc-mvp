/**
 * scripts/seed-demo.ts
 *
 * Populates the existing business with a realistic demo dataset:
 *   • 20 customers
 *   • 2 vehicles each (40 vehicles)
 *   • ~5 jobs per customer (mixed past-completed / today / upcoming-booked)
 *   • a draft invoice for each completed job
 *
 * KEEPS the existing business and its real services (jobs reference them).
 * DELETES the current customers (cascade → their vehicles & jobs) and any
 * existing invoices, then seeds fresh.
 *
 * Run a backup first:  bun scripts/backup-db.ts
 * Then seed:           bun scripts/seed-demo.ts
 *
 * Idempotency: re-running deletes the previous customers/invoices and reseeds.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── env ───────────────────────────────────────────────────────────────────────
function env(): Record<string, string> {
  const out: Record<string, string> = {};
  const text = readFileSync(join(import.meta.dir, "../.env.local"), "utf-8");
  for (const line of text.split("\n")) {
    const i = line.indexOf("=");
    if (i < 0 || line.trim().startsWith("#")) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}
const e = env();
const sb: SupabaseClient = createClient(
  e.NEXT_PUBLIC_SUPABASE_URL,
  e.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ── deterministic-ish sample data ──────────────────────────────────────────────
const FIRST = ["James","Olivia","Liam","Ava","Noah","Mia","Lucas","Charlotte","Ethan","Amelia","Mason","Isla","Harvey","Grace","Jack","Ruby","Leo","Chloe","Max","Zoe"];
const LAST = ["Nguyen","Smith","Brown","Wilson","Taylor","Lee","Walker","Harris","Clark","Young","Khan","Patel","Davies","Murphy","Robinson","Wright","Green","Hughes","Edwards","Collins"];
const SUBURBS = ["Bulimba","Hawthorne","New Farm","Teneriffe","Ascot","Hamilton","Toowong","Paddington","Bardon","Coorparoo"];
const MAKES: Array<[string, string[]]> = [
  ["Toyota", ["Corolla","RAV4","Hilux","Camry"]],
  ["Mazda", ["CX-5","3","BT-50","CX-30"]],
  ["Ford", ["Ranger","Everest","Focus"]],
  ["Hyundai", ["i30","Tucson","Kona"]],
  ["Tesla", ["Model 3","Model Y"]],
  ["BMW", ["3 Series","X3","X5"]],
  ["Volkswagen", ["Golf","Tiguan","Amarok"]],
];
const COLORS = ["White","Black","Silver","Grey","Blue","Red"];

// Simple seeded RNG so reruns produce the same dataset.
let seed = 1337;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

const TAG = "[demo]"; // marks seeded rows so they're easy to find/clean later.

/**
 * Build the scheduled_start / scheduled_end for one job of a given car.
 *
 * Constraint: the DB has `jobs_vehicle_no_overlap` — the SAME vehicle cannot
 * have two overlapping bookings while status='booked'. So per-car jobs must be
 * spaced apart in time. `jobIndex` is the Nth job for THIS car.
 *
 * Returns Date objects in UTC; the app stores timestamptz.
 *
 * TODO(human): implement realistic, non-overlapping scheduling.
 *   - Spread jobs across past and future (e.g. jobIndex 0..N).
 *   - Keep each booking within business hours (07:00–18:00 local, AEST = UTC+10).
 *   - Ensure two jobs for the same car never overlap (space by >= 1 day, or by
 *     hours within a day but non-overlapping).
 *   - Pick a duration appropriate to detailing (1–4 hours).
 * Decide: how far back/forward to spread, and how to map jobIndex → a slot.
 */
function scheduleFor(jobIndex: number, totalJobs: number): { start: Date; end: Date } {
  // PLACEHOLDER — replace with your implementation.
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

// ── main ────────────────────────────────────────────────────────────────────────
async function main() {
  const { data: biz, error: bizErr } = await sb
    .from("businesses")
    .select("id, name")
    .single();
  if (bizErr || !biz) throw new Error(`no business found: ${bizErr?.message}`);
  const businessId = biz.id as string;
  console.log(`Seeding into "${biz.name}" (${businessId})\n`);

  const { data: services, error: svcErr } = await sb
    .from("services")
    .select("id, name, base_price")
    .eq("business_id", businessId)
    .eq("active", true);
  if (svcErr || !services?.length) throw new Error("no active services to reference");
  console.log(`Using ${services.length} existing services.`);

  // ── wipe previous customers (cascade) + invoices ──────────────────────────────
  console.log("Deleting existing invoices and customers (cascade)…");
  await sb.from("invoices").delete().eq("business_id", businessId);
  await sb.from("customers").delete().eq("business_id", businessId);

  // ── seed customers + vehicles + jobs ──────────────────────────────────────────
  let vehicleCount = 0;
  let jobCount = 0;
  let invoiceCount = 0;
  let invoiceSeq = 1;

  for (let c = 0; c < 20; c++) {
    const first = FIRST[c % FIRST.length];
    const last = LAST[c % LAST.length];
    const name = `${first} ${last} ${TAG}`;

    const { data: customer, error: custErr } = await sb
      .from("customers")
      .insert({
        business_id: businessId,
        name,
        email: `${first}.${last}`.toLowerCase() + "@example.com",
        phone: `04${int(10, 99)}${int(100, 999)}${int(100, 999)}`,
        address: `${int(1, 200)} ${pick(["High","Oxford","Riding","Wynnum","Latrobe"])} St, ${pick(SUBURBS)} QLD`,
        notes: `${TAG} seeded demo customer`,
      })
      .select("id")
      .single();
    if (custErr) throw custErr;

    // two vehicles each
    const vehicles: string[] = [];
    for (let v = 0; v < 2; v++) {
      const [make, models] = pick(MAKES);
      const { data: veh, error: vehErr } = await sb
        .from("vehicles")
        .insert({
          business_id: businessId,
          customer_id: customer.id,
          make,
          model: pick(models),
          year: int(2015, 2024),
          color: pick(COLORS),
          plate: `${pick("ABCDEFGHJKLMNPRSTVWXYZ".split(""))}${int(10, 99)}${pick("ABCDEFGHJKLMNPRSTVWXYZ".split(""))}${int(1, 9)}${pick("ABCDEFGHJKLMNPRSTVWXYZ".split(""))}`,
          notes: `${TAG}`,
        })
        .select("id")
        .single();
      if (vehErr) throw vehErr;
      vehicles.push(veh.id);
      vehicleCount++;
    }

    // ~5 jobs for this customer, distributed across the two cars
    const jobsForCustomer = int(4, 6);
    // track per-car job index so scheduleFor can space them out
    const perCar: Record<string, number> = {};
    for (const vid of vehicles) perCar[vid] = 0;

    for (let j = 0; j < jobsForCustomer; j++) {
      const vehicleId = vehicles[j % vehicles.length];
      const idx = perCar[vehicleId]++;
      const { start, end } = scheduleFor(idx + j, jobsForCustomer);
      const service = pick(services);
      const price = Number(service.base_price);

      // past jobs are completed; today/future are booked.
      const isPast = end.getTime() < Date.now();
      const status = isPast ? "completed" : "booked";

      const { data: job, error: jobErr } = await sb
        .from("jobs")
        .insert({
          business_id: businessId,
          customer_id: customer.id,
          vehicle_id: vehicleId,
          service_id: service.id,
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          status,
          price,
          notes: `${TAG} ${service.name}`,
        })
        .select("id, price")
        .single();
      if (jobErr) throw jobErr;
      jobCount++;

      // completed jobs get a draft invoice (GST 10% inclusive)
      if (status === "completed") {
        const total = price;
        const subtotal = Math.round((total / 1.1) * 100) / 100;
        const gst_amount = Math.round((total - subtotal) * 100) / 100;
        const { error: invErr } = await sb.from("invoices").insert({
          business_id: businessId,
          job_id: job.id,
          invoice_number: `INV-${String(invoiceSeq++).padStart(4, "0")}`,
          subtotal,
          gst_amount,
          amount: total,
          status: "draft",
        });
        if (invErr) throw invErr;
        invoiceCount++;
      }
    }
    process.stdout.write(`  ✓ ${name}\n`);
  }

  console.log(
    `\nDone: 20 customers, ${vehicleCount} vehicles, ${jobCount} jobs, ${invoiceCount} invoices.`,
  );
}

main().catch((err) => {
  console.error("\nSEED FAILED:", err.message ?? err);
  process.exit(1);
});
