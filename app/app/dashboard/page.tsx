import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader,
  Plus,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { SearchBar } from "@/components/search/search-bar";
import { loadSearchIndexAction } from "@/app/app/search-actions";
import { getCurrentBusiness } from "@/lib/db/current-business";
import {
  effectiveJobStatus,
  listJobsBetween,
  listJobsByStatus,
  listJobsInProgress,
  listJobsNeedingReview,
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
  const nowUtc = new Date().toISOString();

  const [
    todayJobs,
    booked,
    completedRecently,
    monthCompleted,
    needsReview,
    inProgress,
  ] = await Promise.all([
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
    listJobsNeedingReview(nowUtc, { limit: BUCKET_LIMIT }),
    listJobsInProgress(nowUtc, { limit: BUCKET_LIMIT }),
  ]);

  const monthIncome = monthCompleted.total;
  const monthLabel = new Intl.DateTimeFormat("en-AU", {
    month: "long",
    timeZone: tz,
  }).format(new Date());

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)_minmax(0,1fr)]">
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
        <div className="order-last w-full lg:order-none">
          <SearchBar
            scope="general"
            loadIndex={loadSearchIndexAction}
            placeholder="Search customers, vehicles, jobs, invoices…"
          />
        </div>
        <Button asChild className="lg:justify-self-end">
          <Link href="/app/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New job
          </Link>
        </Button>
      </div>

      <Card className="shrink-0 mx-1">
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

      {/* All status buckets share one uniform 3-column grid. The two
          attention cards (In progress / Needs attention) only appear when they
          have rows, taking the same-sized slots as the rest. */}
      <div className="grid gap-4 mx-1 sm:grid-cols-2 lg:grid-cols-3">
        {needsReview.total > 0 ? (
          <BucketCard
            title="Needs attention"
            icon={
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-300" />
            }
            jobs={needsReview.rows}
            total={needsReview.total}
            emptyText="Nothing waiting on you."
            viewAllHref="/app/jobs?status=needs_attention"
            className="border-orange-300 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/20"
          />
        ) : null}

        {inProgress.total > 0 ? (
          <BucketCard
            title="In progress"
            icon={
              <Loader className="h-4 w-4 text-yellow-600 dark:text-yellow-300" />
            }
            jobs={inProgress.rows}
            total={inProgress.total}
            emptyText="Nothing running right now."
            viewAllHref="/app/jobs?status=in_progress"
            dateMode="time"
            className="border-yellow-300 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-500/10"
          />
        ) : null}

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
  className,
}: {
  title: string;
  icon: React.ReactNode;
  jobs: JobWithRelations[];
  /** Full match count — may exceed jobs.length when the bucket is capped. */
  total: number;
  emptyText: string;
  viewAllHref: string;
  dateMode?: "time" | "scheduled";
  className?: string;
}) {
  const visible = jobs;
  // Snapshot "now" so each row's badge derives in_progress/needs_attention against
  // the same instant.
  const now = new Date().getTime();

  return (
    <Card className={cn("flex flex-col md:max-h-full", className)}>
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
        <span className="text-2xl font-semibold tabular-nums">{total}</span>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          // On mobile the card grows with its content, so cap the list at
          // roughly 10 rows and scroll the rest; md+ is height-bound by the
          // viewport-fit grid instead.
          <ul className="max-h-[36rem] min-h-0 flex-1 space-y-2 overflow-y-auto md:max-h-none">
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
                      <JobStatusBadge status={effectiveJobStatus(job, now)} />
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
