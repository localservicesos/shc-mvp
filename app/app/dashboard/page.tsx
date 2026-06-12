import Link from "next/link";
import { CalendarClock, CheckCircle2, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { SearchBar } from "@/components/search/search-bar";
import { loadSearchIndexAction } from "@/app/app/search-actions";
import { getCurrentBusiness } from "@/lib/db/current-business";
import {
  listJobsBetween,
  listJobsByStatus,
  sumJobPrices,
  type JobWithRelations,
} from "@/lib/db/jobs";
import {
  dateInTimezone,
  dayRangeFromUtc,
  dayRangeUtc,
  formatScheduled,
  formatTime,
  monthRangeUtc,
  shiftDateString,
} from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/format";

export const metadata = {
  title: "Dashboard",
};

// Each bucket card shows at most this many rows; the headline number still
// reflects the full count and "View list →" links to the filtered Jobs page.
const BUCKET_LIMIT = 15;

export default async function DashboardPage() {
  const business = await getCurrentBusiness();
  const tz = business?.timezone ?? "Australia/Brisbane";
  const today = dateInTimezone(tz);
  const { startUtc: todayStart, endUtc: todayEnd } = dayRangeUtc(tz, today);
  const weekStart = shiftDateString(today, -6);
  const { startUtc: weekStartUtc, endUtc: weekEndUtc } = dayRangeFromUtc(
    tz,
    weekStart,
    7,
  );
  const { startUtc: monthStartUtc, endUtc: monthEndUtc } = monthRangeUtc(
    tz,
    today,
  );
  const tomorrow = shiftDateString(today, 1);
  const { startUtc: tomorrowStartUtc } = dayRangeUtc(tz, tomorrow);

  const [todayJobs, booked, completedRecently, monthCompleted] =
    await Promise.all([
      listJobsBetween(todayStart, todayEnd, { limit: BUCKET_LIMIT }),
      listJobsByStatus("booked", {
        fromUtc: tomorrowStartUtc,
        limit: BUCKET_LIMIT,
      }),
      listJobsBetween(weekStartUtc, weekEndUtc, {
        status: "completed",
        limit: BUCKET_LIMIT,
      }),
      sumJobPrices(monthStartUtc, monthEndUtc, "completed"),
    ]);

  const monthIncome = monthCompleted.total;
  const monthLabel = new Intl.DateTimeFormat("en-AU", {
    month: "long",
    timeZone: tz,
  }).format(new Date());

  return (
    <div className="flex h-full flex-col gap-6 md:overflow-hidden">
      <div className="relative flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Intl.DateTimeFormat("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: tz,
            }).format(new Date())}
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <div className="pointer-events-auto w-full max-w-sm">
            <SearchBar
              scope="general"
              loadIndex={loadSearchIndexAction}
              placeholder="Search customers, vehicles, jobs, invoices…"
            />
          </div>
        </div>
        <Button asChild>
          <Link href="/app/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New job
          </Link>
        </Button>
      </div>

      <Card className="shrink-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            Income · {monthLabel}
          </CardTitle>
          <Link
            href={`/app/jobs?status=completed&from=${today.slice(0, 7)}-01&to=${today}`}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View completed →
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
            {formatMoney(monthIncome, business?.currency ?? "AUD")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {monthCompleted.count}{" "}
            {monthCompleted.count === 1 ? "completed job" : "completed jobs"}{" "}
            this month
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:min-h-0 md:flex-1 md:grid-cols-3 md:items-start">
        <BucketCard
          title="Today"
          icon={<CalendarClock className="h-4 w-4" />}
          jobs={todayJobs.rows}
          total={todayJobs.total}
          emptyText="Nothing on the calendar today."
          dateMode="time"
          viewAllHref={`/app/jobs?from=${today}&to=${today}`}
        />
        <BucketCard
          title="Upcoming"
          icon={<CalendarClock className="h-4 w-4" />}
          jobs={booked.rows}
          total={booked.total}
          emptyText="No upcoming bookings."
          viewAllHref={`/app/jobs?status=booked&from=${tomorrow}`}
        />
        <BucketCard
          title="Completed last 7 days"
          icon={<CheckCircle2 className="h-4 w-4" />}
          jobs={completedRecently.rows}
          total={completedRecently.total}
          emptyText="No completions in the last 7 days."
          viewAllHref={`/app/jobs?status=completed&from=${weekStart}&to=${today}`}
        />
      </div>
    </div>
  );
}

function BucketCard({
  title,
  icon,
  jobs,
  total,
  emptyText,
  viewAllHref,
  dateMode = "scheduled",
}: {
  title: string;
  icon: React.ReactNode;
  jobs: JobWithRelations[];
  /** Full match count — may exceed jobs.length when the bucket is capped. */
  total: number;
  emptyText: string;
  viewAllHref: string;
  dateMode?: "time" | "scheduled";
}) {
  const visible = jobs;

  return (
    <Card className="flex flex-col md:max-h-full">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
        <span className="text-2xl font-semibold tabular-nums">
          {total}
        </span>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {visible.map((job) => {
              const vehicleText = job.vehicle
                ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
                    .filter(Boolean)
                    .join(" ") || job.vehicle.plate
                : null;
              const when =
                dateMode === "time"
                  ? formatTime(job.scheduled_start) || "Anytime"
                  : formatScheduled(job.scheduled_start);
              return (
                <li key={job.id} className="text-sm">
                  <Link
                    href={`/app/jobs/${job.id}`}
                    className="flex items-start justify-between gap-2 rounded-md p-2 hover:bg-accent"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-medium">
                        {job.customer?.name ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[when, vehicleText, job.service?.name]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      {job.price !== null ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatMoney(job.price)}
                        </span>
                      ) : null}
                      <JobStatusBadge status={job.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {total > 0 ? (
          <Link
            href={viewAllHref}
            className="block shrink-0 pt-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {total > jobs.length ? `View all ${total} →` : "View list →"}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
