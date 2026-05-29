import Link from "next/link";
import { cn } from "@/lib/utils";
import { dateInTimezone, shiftDateString } from "@/lib/utils/date";
import type { JobWithRelations } from "@/types/jobs";
import type { JobStatus } from "@/types/jobs";

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 19;
const HOUR_PX = 60;
const HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, i) => i + GRID_START_HOUR,
);
const GRID_HEIGHT_PX = HOURS.length * HOUR_PX;

const EVENT_STYLES: Record<JobStatus, string> = {
  booked:
    "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100",
  completed:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100",
  cancelled:
    "border-rose-300 bg-rose-50 text-rose-900 line-through opacity-70 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100",
};

type LaidOutEvent = {
  job: JobWithRelations;
  topPx: number;
  heightPx: number;
  lane: number;
  totalLanes: number;
};

function formatHourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

function formatEventTime(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function dayHeaderLabel(dateStr: string, tz: string): { weekday: string; day: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12));
  return {
    weekday: new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      weekday: "short",
    }).format(utcNoon),
    day: new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      day: "numeric",
      month: "short",
    }).format(utcNoon),
  };
}

/**
 * Compute event positions and lane assignments for a single day.
 * Greedy lane assignment: an event goes into the lowest-numbered lane
 * whose previous event has ended.
 */
function layoutDay(
  jobs: JobWithRelations[],
  dateKey: string,
  tz: string,
): LaidOutEvent[] {
  const dayStartTs = new Date(`${dateKey}T00:00:00+10:00`).getTime();
  const dayEndTs = dayStartTs + 24 * 60 * 60 * 1000;

  const processed = jobs
    .map((job) => {
      if (!job.scheduled_start) return null;
      const start = new Date(job.scheduled_start).getTime();
      if (Number.isNaN(start)) return null;
      if (start < dayStartTs || start >= dayEndTs) return null;
      const end = job.scheduled_end
        ? new Date(job.scheduled_end).getTime()
        : start + 60 * 60 * 1000;
      const startMinFromGrid =
        (start - dayStartTs) / 60_000 - GRID_START_HOUR * 60;
      const endMinFromGrid =
        (end - dayStartTs) / 60_000 - GRID_START_HOUR * 60;
      const gridMinutes = (GRID_END_HOUR - GRID_START_HOUR) * 60;
      const clampedStart = Math.max(0, startMinFromGrid);
      const clampedEnd = Math.min(gridMinutes, endMinFromGrid);
      if (clampedEnd <= 0 || clampedStart >= gridMinutes) return null;
      return { job, startMin: clampedStart, endMin: clampedEnd };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.startMin - b.startMin);

  // Lane assignment.
  const laneEnds: number[] = [];
  const assigned: number[] = [];
  for (const e of processed) {
    let lane = laneEnds.findIndex((end) => end <= e.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e.endMin);
    } else {
      laneEnds[lane] = e.endMin;
    }
    assigned.push(lane);
  }
  const totalLanes = Math.max(1, laneEnds.length);

  void tz; // currently unused but reserved for tz-aware rendering later

  return processed.map((e, i) => ({
    job: e.job,
    topPx: e.startMin,
    heightPx: Math.max(20, e.endMin - e.startMin),
    lane: assigned[i],
    totalLanes,
  }));
}

function DayColumn({
  dateKey,
  jobs,
  tz,
  isToday,
}: {
  dateKey: string;
  jobs: JobWithRelations[];
  tz: string;
  isToday: boolean;
}) {
  const events = layoutDay(jobs, dateKey, tz);

  return (
    <div
      className={cn(
        "relative border-l",
        isToday ? "bg-accent/20" : "bg-background",
      )}
      style={{ height: `${GRID_HEIGHT_PX}px` }}
    >
      {HOURS.map((h, i) => (
        <div
          key={h}
          className={cn(
            "absolute left-0 right-0 border-t",
            i === 0 ? "border-transparent" : "border-border/60",
          )}
          style={{ top: `${i * HOUR_PX}px`, height: `${HOUR_PX}px` }}
        />
      ))}

      {events.map(({ job, topPx, heightPx, lane, totalLanes }) => {
        const widthPct = 100 / totalLanes;
        const leftPct = lane * widthPct;
        const vehicleText = job.vehicle
          ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
              .filter(Boolean)
              .join(" ") || job.vehicle.plate
          : null;

        return (
          <Link
            key={job.id}
            href={`/app/jobs/${job.id}`}
            className={cn(
              "absolute overflow-hidden rounded-md border px-1.5 py-1 text-xs shadow-sm hover:z-10 hover:shadow-md",
              EVENT_STYLES[job.status],
            )}
            style={{
              top: `${topPx}px`,
              height: `${heightPx}px`,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
            }}
            title={`${job.customer?.name ?? ""} · ${vehicleText ?? ""} · ${
              job.service?.name ?? ""
            }`}
          >
            <p className="truncate font-medium leading-tight">
              {formatEventTime(job.scheduled_start)} {job.customer?.name ?? "—"}
            </p>
            {heightPx >= 36 && job.service?.name ? (
              <p className="truncate text-[11px] opacity-80">
                {job.service.name}
              </p>
            ) : null}
            {heightPx >= 56 && vehicleText ? (
              <p className="truncate text-[11px] opacity-70">{vehicleText}</p>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

export function Calendar({
  startDate,
  days,
  jobs,
  tz,
  todayDate,
}: {
  startDate: string;
  days: number;
  jobs: JobWithRelations[];
  tz: string;
  todayDate: string;
}) {
  const dayKeys = Array.from({ length: days }, (_, i) =>
    shiftDateString(startDate, i),
  );

  // Group jobs by their local date in the business timezone.
  const jobsByDay = new Map<string, JobWithRelations[]>();
  for (const key of dayKeys) jobsByDay.set(key, []);
  for (const job of jobs) {
    if (!job.scheduled_start) continue;
    const key = dateInTimezone(tz, new Date(job.scheduled_start));
    jobsByDay.get(key)?.push(job);
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <div className="min-w-[640px]">
        <div
          className="grid border-b"
          style={{
            gridTemplateColumns: `60px repeat(${days}, minmax(0, 1fr))`,
          }}
        >
          <div className="border-r" />
          {dayKeys.map((key) => {
            const { weekday, day } = dayHeaderLabel(key, tz);
            const isToday = key === todayDate;
            return (
              <div
                key={key}
                className={cn(
                  "border-l px-2 py-2 text-center text-xs",
                  isToday
                    ? "bg-accent/20 font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <p>{weekday}</p>
                <p className="text-sm">{day}</p>
              </div>
            );
          })}
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: `60px repeat(${days}, minmax(0, 1fr))`,
          }}
        >
          <div className="relative border-r" style={{ height: `${GRID_HEIGHT_PX}px` }}>
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-muted-foreground"
                style={{ top: `${i * HOUR_PX - 6}px` }}
              >
                {i > 0 ? formatHourLabel(h) : null}
              </div>
            ))}
          </div>

          {dayKeys.map((key) => (
            <DayColumn
              key={key}
              dateKey={key}
              jobs={jobsByDay.get(key) ?? []}
              tz={tz}
              isToday={key === todayDate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
