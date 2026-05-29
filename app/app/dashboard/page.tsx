import Link from "next/link";
import { CalendarClock, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { SearchBar } from "@/components/search/search-bar";
import { loadSearchIndexAction } from "@/app/app/search-actions";
import { getCurrentBusiness } from "@/lib/db/current-business";
import {
  listJobsBetween,
  listJobsByStatus,
  type JobWithRelations,
} from "@/lib/db/jobs";
import {
  dateInTimezone,
  dayRangeFromUtc,
  dayRangeUtc,
  formatScheduled,
  formatTime,
  shiftDateString,
} from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/format";

export const metadata = {
  title: "Dashboard",
};

const MAX_ROWS = 5;

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

  const [todayJobs, booked, completedRecently] = await Promise.all([
    listJobsBetween(todayStart, todayEnd),
    listJobsByStatus("booked"),
    listJobsBetween(weekStartUtc, weekEndUtc, { status: "completed" }),
  ]);

  return (
    <div className="space-y-6">
      <div className="relative flex items-center justify-between gap-3">
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

      <div className="grid gap-4 md:grid-cols-3">
        <BucketCard
          title="Today"
          icon={<CalendarClock className="h-4 w-4" />}
          jobs={todayJobs}
          emptyText="Nothing on the calendar today."
          dateMode="time"
          viewAllHref={`/app/jobs?from=${today}&to=${today}`}
        />
        <BucketCard
          title="Upcoming"
          icon={<CalendarClock className="h-4 w-4" />}
          jobs={booked}
          emptyText="No upcoming bookings."
          viewAllHref="/app/jobs?status=booked"
        />
        <BucketCard
          title="Completed last 7 days"
          icon={<CheckCircle2 className="h-4 w-4" />}
          jobs={completedRecently}
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
  emptyText,
  viewAllHref,
  dateMode = "scheduled",
}: {
  title: string;
  icon: React.ReactNode;
  jobs: JobWithRelations[];
  emptyText: string;
  viewAllHref: string;
  dateMode?: "time" | "scheduled";
}) {
  const visible = jobs.slice(0, MAX_ROWS);
  const hidden = jobs.length - visible.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
        <span className="text-2xl font-semibold tabular-nums">
          {jobs.length}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
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

        {hidden > 0 || jobs.length > 0 ? (
          <Link
            href={viewAllHref}
            className="block text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {hidden > 0 ? `View all (${jobs.length})` : "View list"} →
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
