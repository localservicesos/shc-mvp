import Link from "next/link";
import { cn } from "@/lib/utils";
import { jobDateKeys, monthGridDays } from "@/lib/utils/date";
import type { JobWithRelations } from "@/types/jobs";

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

function monthName(year: number, month: number, tz: string): string {
  const utcNoon = new Date(Date.UTC(year, month - 1, 1, 12));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    month: "long",
  }).format(utcNoon);
}

function navHref(date: string) {
  const params = new URLSearchParams({ view: "day", date });
  return `/app/schedule?${params.toString()}`;
}

function MiniMonth({
  year,
  month,
  jobCounts,
  tz,
  todayDate,
}: {
  year: number;
  month: number; // 1-12
  jobCounts: Map<string, number>;
  tz: string;
  todayDate: string;
}) {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const days = monthGridDays(`${monthKey}-01`);

  return (
    <div className="rounded-md border bg-background p-2">
      <Link
        href={`/app/schedule?view=month&date=${monthKey}-01`}
        className="mb-1 block text-sm font-medium hover:underline"
      >
        {monthName(year, month, tz)}
      </Link>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAY_INITIALS.map((wd, i) => (
          <span key={i} className="text-[10px] text-muted-foreground">
            {wd}
          </span>
        ))}
        {days.map((dateKey) => {
          const inMonth = dateKey.slice(0, 7) === monthKey;
          if (!inMonth) return <span key={dateKey} />;
          const isToday = dateKey === todayDate;
          const hasJobs = (jobCounts.get(dateKey) ?? 0) > 0;
          const dayNum = Number(dateKey.split("-")[2]);
          return (
            <Link
              key={dateKey}
              href={navHref(dateKey)}
              title={hasJobs ? `${jobCounts.get(dateKey)} job(s)` : undefined}
              className={cn(
                "mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums hover:bg-accent",
                isToday && "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                !isToday && hasJobs && "bg-blue-100 font-medium text-blue-900 dark:bg-blue-500/20 dark:text-blue-100",
                !isToday && !hasJobs && "text-foreground",
              )}
            >
              {dayNum}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function YearGrid({
  year,
  jobs,
  tz,
  todayDate,
}: {
  year: number;
  jobs: JobWithRelations[];
  tz: string;
  todayDate: string;
}) {
  // Count jobs per local calendar date, counting a multi-day booking on each
  // day it spans so every covered day lights up.
  const jobCounts = new Map<string, number>();
  for (const job of jobs) {
    if (!job.scheduled_start) continue;
    for (const key of jobDateKeys(job.scheduled_start, job.scheduled_end, tz)) {
      jobCounts.set(key, (jobCounts.get(key) ?? 0) + 1);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => (
        <MiniMonth
          key={i}
          year={year}
          month={i + 1}
          jobCounts={jobCounts}
          tz={tz}
          todayDate={todayDate}
        />
      ))}
    </div>
  );
}
