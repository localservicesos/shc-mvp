import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { Calendar } from "@/components/schedule/calendar";
import { MonthGrid } from "@/components/schedule/month-grid";
import { YearGrid } from "@/components/schedule/year-grid";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { listJobsOverlapping, type JobWithRelations } from "@/lib/db/jobs";
import {
  dateInTimezone,
  dayRangeFromUtc,
  formatDayLabel,
  jobDateKeys,
  formatMonthLabel,
  formatTime,
  monthGridDays,
  shiftDateString,
  shiftMonthString,
  startOfWeekString,
} from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/format";

export const metadata = {
  title: "Schedule",
};

type ViewMode = "day" | "week" | "month" | "year";

function parseView(value: string | undefined): ViewMode {
  if (value === "day") return "day";
  if (value === "month") return "month";
  if (value === "year") return "year";
  // Default (e.g. opening Schedule from the nav) lands on the week view.
  return "week";
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
  // Day/week use the fixed-time grid, which we size to fill the viewport so
  // the whole day is visible without scrolling. Month/year flow normally.
  const fitToViewport = view === "day" || view === "week";
  const selectedDate = params.date ?? today;
  // The week view always runs Sunday → Saturday, so snap its anchor back to
  // the Sunday of the selected week. Other views use the selected date as-is.
  const startDate =
    view === "week" ? startOfWeekString(selectedDate) : selectedDate;

  const year = Number(startDate.slice(0, 4));

  // The month view renders a full 6-week grid (spilling into adjacent months)
  // and the year view spans all 12 months, so fetch the whole visible range
  // rather than just one day/week.
  let fetchStart = startDate;
  let fetchDays = view === "week" ? 7 : 1;
  if (view === "month") {
    const gridDays = monthGridDays(startDate);
    fetchStart = gridDays[0];
    fetchDays = gridDays.length;
  } else if (view === "year") {
    fetchStart = `${year}-01-01`;
    fetchDays = 366;
  }

  const { startUtc, endUtc } = dayRangeFromUtc(tz, fetchStart, fetchDays);
  const jobs = await listJobsOverlapping(startUtc, endUtc);

  // Bucket jobs by local calendar date in the business timezone (mobile list).
  // A multi-day booking lands in every day it spans, so it shows as a
  // continuation on each following day rather than only on its start day.
  const days = view === "week" ? 7 : 1;
  const grouped = new Map<string, JobWithRelations[]>();
  for (let i = 0; i < days; i++) {
    grouped.set(shiftDateString(startDate, i), []);
  }
  for (const job of jobs) {
    if (!job.scheduled_start) continue;
    for (const key of jobDateKeys(job.scheduled_start, job.scheduled_end, tz)) {
      grouped.get(key)?.push(job);
    }
  }

  let prevDate: string;
  let nextDate: string;
  if (view === "month") {
    prevDate = shiftMonthString(startDate, -1);
    nextDate = shiftMonthString(startDate, 1);
  } else if (view === "year") {
    prevDate = `${year - 1}-01-01`;
    nextDate = `${year + 1}-01-01`;
  } else {
    prevDate = shiftDateString(startDate, -days);
    nextDate = shiftDateString(startDate, days);
  }
  const periodLabel =
    view === "day"
      ? formatDayLabel(startDate, tz)
      : view === "month"
        ? formatMonthLabel(startDate, tz)
        : view === "year"
          ? String(year)
          : `${formatDayLabel(startDate, tz)} – ${formatDayLabel(shiftDateString(startDate, 6), tz)}`;

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        // The week grid needs ~640px, which tablets don't have next to the
        // sidebar — they get the stacked day list instead, so only pin the
        // page to the viewport where the grid actually shows.
        fitToViewport &&
          (days > 1 ? "lg:h-full lg:min-h-0" : "md:h-full md:min-h-0"),
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <Button asChild>
          <Link href="/app/jobs/new">
            <Plus className="mr-2 h-4 w-4" />
            New job
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-1 justify-self-start rounded-md border bg-background p-1">
          <Link
            href={navHref("day", selectedDate)}
            className={
              view === "day"
                ? "rounded-sm bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground"
                : "rounded-sm px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            Day
          </Link>
          <Link
            href={navHref("week", startDate)}
            className={
              view === "week"
                ? "rounded-sm bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground"
                : "rounded-sm px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            Week
          </Link>
          <Link
            href={navHref("month", startDate)}
            className={
              view === "month"
                ? "rounded-sm bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground"
                : "rounded-sm px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            Month
          </Link>
          <Link
            href={navHref("year", startDate)}
            className={
              view === "year"
                ? "rounded-sm bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground"
                : "rounded-sm px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            Year
          </Link>
        </div>

        <p className="order-last w-full text-center text-sm font-medium sm:order-none sm:w-auto">
          {periodLabel}
        </p>

        <div className="flex items-center gap-2 justify-self-end">
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

      {view === "year" ? (
        <YearGrid year={year} jobs={jobs} tz={tz} todayDate={today} />
      ) : view === "month" ? (
        <MonthGrid
          monthDate={startDate}
          jobs={jobs}
          tz={tz}
          todayDate={today}
        />
      ) : (
        <>
      <div
        className={cn(
          "hidden min-h-0 flex-1",
          days > 1 ? "lg:block" : "md:block",
        )}
      >
        <Calendar
          startDate={startDate}
          days={days}
          jobs={jobs}
          tz={tz}
          todayDate={today}
        />
      </div>

      <div className={cn("space-y-4", days > 1 ? "lg:hidden" : "md:hidden")}>
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
                    // True on the day(s) after the booking's start day — the
                    // job is carrying over from midnight, so show "cont."
                    // instead of the original start time.
                    const isContinuation =
                      job.scheduled_start != null &&
                      dateInTimezone(tz, new Date(job.scheduled_start)) !==
                        dateKey;
                    return (
                      <li
                        key={`${dateKey}-${job.id}`}
                        className="py-3 first:pt-0 last:pb-0"
                      >
                        <Link
                          href={`/app/jobs/${job.id}`}
                          className="flex items-start justify-between gap-3 rounded-md hover:bg-accent/40"
                        >
                          <div className="flex min-w-0 gap-4">
                            <span className="w-20 shrink-0 text-sm tabular-nums text-muted-foreground">
                              {isContinuation
                                ? "cont."
                                : formatTime(job.scheduled_start) || "—"}
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
        </>
      )}
    </div>
  );
}
