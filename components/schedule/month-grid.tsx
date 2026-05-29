import Link from "next/link";
import { cn } from "@/lib/utils";
import { dateInTimezone, monthGridDays } from "@/lib/utils/date";
import type { JobStatus, JobWithRelations } from "@/types/jobs";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

const CHIP_STYLES: Record<JobStatus, string> = {
  booked:
    "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100",
  completed: "border-border bg-muted text-muted-foreground",
  cancelled:
    "border-rose-300 bg-rose-50 text-rose-900 line-through opacity-70 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100",
};

function formatChipTime(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function navHref(date: string) {
  const params = new URLSearchParams({ view: "day", date });
  return `/app/schedule?${params.toString()}`;
}

export function MonthGrid({
  monthDate,
  jobs,
  tz,
  todayDate,
}: {
  /** Any date within the month to render ("YYYY-MM-..."). */
  monthDate: string;
  jobs: JobWithRelations[];
  tz: string;
  todayDate: string;
}) {
  const days = monthGridDays(monthDate);
  const viewedMonth = monthDate.slice(0, 7);

  // Group jobs by their local date in the business timezone.
  const jobsByDay = new Map<string, JobWithRelations[]>();
  for (const key of days) jobsByDay.set(key, []);
  for (const job of jobs) {
    if (!job.scheduled_start) continue;
    const key = dateInTimezone(tz, new Date(job.scheduled_start));
    jobsByDay.get(key)?.push(job);
  }

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((dateKey, i) => {
          const dayJobs = jobsByDay.get(dateKey) ?? [];
          const inMonth = dateKey.slice(0, 7) === viewedMonth;
          const isToday = dateKey === todayDate;
          const dayNum = Number(dateKey.split("-")[2]);
          const visible = dayJobs.slice(0, MAX_CHIPS);
          const overflow = dayJobs.length - visible.length;

          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[96px] border-b border-l p-1 sm:min-h-[120px]",
                i % 7 === 0 && "border-l-0",
                i >= 35 && "border-b-0",
                !inMonth && "bg-muted/30",
              )}
            >
              <div className="flex justify-end">
                <Link
                  href={navHref(dateKey)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums hover:bg-accent",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {dayNum}
                </Link>
              </div>

              <div className="mt-0.5 space-y-0.5">
                {visible.map((job) => {
                  const vehicleText = job.vehicle
                    ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
                        .filter(Boolean)
                        .join(" ") || job.vehicle.plate
                    : null;
                  return (
                    <Link
                      key={job.id}
                      href={`/app/jobs/${job.id}`}
                      title={`${formatChipTime(job.scheduled_start)} ${
                        job.customer?.name ?? ""
                      } · ${job.service?.name ?? ""}`}
                      className={cn(
                        "block truncate rounded border px-1 py-0.5 text-[11px] leading-tight hover:shadow-sm",
                        CHIP_STYLES[job.status],
                      )}
                    >
                      <span className="tabular-nums opacity-70">
                        {formatChipTime(job.scheduled_start)}
                      </span>{" "}
                      {job.customer?.name ?? vehicleText ?? "Job"}
                    </Link>
                  );
                })}
                {overflow > 0 ? (
                  <Link
                    href={navHref(dateKey)}
                    className="block px-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    +{overflow} more
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
