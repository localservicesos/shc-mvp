import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { Calendar } from "@/components/schedule/calendar";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { listJobsBetween, type JobWithRelations } from "@/lib/db/jobs";
import {
  dateInTimezone,
  dayRangeFromUtc,
  formatDayLabel,
  formatTime,
  shiftDateString,
} from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/format";

export const metadata = {
  title: "Schedule",
};

type ViewMode = "day" | "week";

function parseView(value: string | undefined): ViewMode {
  return value === "week" ? "week" : "day";
}

function navHref(view: ViewMode, date: string) {
  const params = new URLSearchParams();
  params.set("view", view);
  params.set("date", date);
  return `/app/schedule?${params.toString()}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const business = await getCurrentBusiness();
  const tz = business?.timezone ?? "Australia/Brisbane";
  const today = dateInTimezone(tz);
  const view = parseView(params.view);
  const startDate = params.date ?? today;
  const days = view === "week" ? 7 : 1;

  const { startUtc, endUtc } = dayRangeFromUtc(tz, startDate, days);
  const jobs = await listJobsBetween(startUtc, endUtc);

  // Bucket jobs by local calendar date in the business timezone.
  const grouped = new Map<string, JobWithRelations[]>();
  for (let i = 0; i < days; i++) {
    grouped.set(shiftDateString(startDate, i), []);
  }
  for (const job of jobs) {
    if (!job.scheduled_start) continue;
    const key = dateInTimezone(tz, new Date(job.scheduled_start));
    const bucket = grouped.get(key);
    if (bucket) bucket.push(job);
  }

  const prevDate = shiftDateString(startDate, -days);
  const nextDate = shiftDateString(startDate, days);
  const periodLabel =
    view === "day"
      ? formatDayLabel(startDate, tz)
      : `${formatDayLabel(startDate, tz)} – ${formatDayLabel(shiftDateString(startDate, 6), tz)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Schedule</h1>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <Button asChild>
          <Link href="/app/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New job
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
          <Link
            href={navHref("day", startDate === today ? today : startDate)}
            className={
              view === "day"
                ? "rounded-sm bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
                : "rounded-sm px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            Day
          </Link>
          <Link
            href={navHref("week", startDate)}
            className={
              view === "week"
                ? "rounded-sm bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
                : "rounded-sm px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            Week
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={navHref(view, prevDate)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={navHref(view, today)}>Today</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={navHref(view, nextDate)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="hidden md:block">
        <Calendar
          startDate={startDate}
          days={days}
          jobs={jobs}
          tz={tz}
          todayDate={today}
        />
      </div>

      <div className="space-y-4 md:hidden">
        {Array.from(grouped.entries()).map(([dateKey, dayJobs]) => (
          <Card key={dateKey}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                {formatDayLabel(dateKey, tz)}
                {dateKey === today ? (
                  <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    Today
                  </span>
                ) : null}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {dayJobs.length} {dayJobs.length === 1 ? "job" : "jobs"}
              </span>
            </CardHeader>
            <CardContent>
              {dayJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs.</p>
              ) : (
                <ul className="divide-y">
                  {dayJobs.map((job) => {
                    const vehicleText = job.vehicle
                      ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
                          .filter(Boolean)
                          .join(" ") || job.vehicle.plate
                      : null;
                    return (
                      <li key={job.id} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          href={`/app/jobs/${job.id}`}
                          className="flex items-start justify-between gap-3 rounded-md hover:bg-accent/40"
                        >
                          <div className="flex min-w-0 gap-4">
                            <span className="w-20 shrink-0 text-sm tabular-nums text-muted-foreground">
                              {formatTime(job.scheduled_start) || "—"}
                            </span>
                            <div className="min-w-0 space-y-0.5">
                              <p className="truncate text-sm font-medium">
                                {job.customer?.name ?? "—"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[vehicleText, job.service?.name]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
