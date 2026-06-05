import Link from "next/link";
import { cn } from "@/lib/utils";
import { jobDateKeys, shiftDateString } from "@/lib/utils/date";
import type { JobWithRelations } from "@/types/jobs";
import type { JobStatus } from "@/types/jobs";

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 19;
const HOURS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR },
  (_, i) => i + GRID_START_HOUR,
);
const GRID_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60;

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
  topPct: number;
  heightPct: number;
  durationMin: number;
  lane: number;
  totalLanes: number;
  /** Booking started on an earlier day (this block carries over from midnight). */
  continuesFromPrev: boolean;
  /** Booking runs past this day into the next. */
  continuesToNext: boolean;
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
 *
 * Positions are returned as percentages of the visible grid so the column
 * can fill whatever height it's given (the schedule sizes it to the
 * viewport) rather than a fixed pixel height.
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
      const end = job.scheduled_end
        ? new Date(job.scheduled_end).getTime()
        : start + 60 * 60 * 1000;
      // Keep any booking that overlaps this day, not only ones starting in it,
      // so a multi-day booking shows on each day it covers.
      if (start >= dayEndTs || end <= dayStartTs) return null;
      const startMinFromGrid =
        (start - dayStartTs) / 60_000 - GRID_START_HOUR * 60;
      const endMinFromGrid =
        (end - dayStartTs) / 60_000 - GRID_START_HOUR * 60;
      const clampedStart = Math.max(0, startMinFromGrid);
      const clampedEnd = Math.min(GRID_MINUTES, endMinFromGrid);
      if (clampedEnd <= 0 || clampedStart >= GRID_MINUTES) return null;
      return {
        job,
        startMin: clampedStart,
        endMin: clampedEnd,
        continuesFromPrev: start < dayStartTs,
        continuesToNext: end > dayEndTs,
      };
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

  return processed.map((e, i) => {
    const durationMin = e.endMin - e.startMin;
    return {
      job: e.job,
      topPct: (e.startMin / GRID_MINUTES) * 100,
      heightPct: (durationMin / GRID_MINUTES) * 100,
      durationMin,
      lane: assigned[i],
      totalLanes,
      continuesFromPrev: e.continuesFromPrev,
      continuesToNext: e.continuesToNext,
    };
  });
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
        "relative h-full border-l",
        isToday ? "bg-accent/20" : "bg-background",
      )}
    >
      {HOURS.map((h, i) => (
        <div
          key={h}
          className={cn(
            "absolute left-0 right-0 border-t",
            i === 0 ? "border-transparent" : "border-border/60",
          )}
          style={{ top: `${(i / HOURS.length) * 100}%` }}
        />
      ))}

      {events.map(({ job, topPct, heightPct, durationMin, lane, totalLanes, continuesFromPrev, continuesToNext }) => {
        const widthPct = 100 / totalLanes;
        const leftPct = lane * widthPct;
        const vehicleText = job.vehicle
          ? [job.vehicle.year, job.vehicle.make, job.vehicle.model]
              .filter(Boolean)
              .join(" ") || job.vehicle.plate
          : null;

        return (
          <Link
            key={`${dateKey}-${job.id}`}
            href={`/app/jobs/${job.id}`}
            className={cn(
              "absolute overflow-hidden rounded-md border px-1.5 py-1 text-xs shadow-sm hover:z-10 hover:shadow-md",
              EVENT_STYLES[job.status],
              // Square off the edge that bleeds into an adjacent day to signal
              // the booking continues there.
              continuesFromPrev && "rounded-t-none",
              continuesToNext && "rounded-b-none",
            )}
            style={{
              top: `${topPct}%`,
              height: `${heightPct}%`,
              minHeight: "18px",
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
            }}
            title={`${job.customer?.name ?? ""} · ${vehicleText ?? ""} · ${
              job.service?.name ?? ""
            }`}
          >
            <p className="truncate font-medium leading-tight">
              {continuesFromPrev
                ? "↑ cont."
                : formatEventTime(job.scheduled_start)}{" "}
              {job.customer?.name ?? "—"}
            </p>
            {durationMin >= 36 && job.service?.name ? (
              <p className="truncate text-[11px] opacity-80">
                {job.service.name}
              </p>
            ) : null}
            {durationMin >= 56 && vehicleText ? (
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

  // Group jobs by every local date they span, so a booking that runs past
  // midnight appears on each day (clipped per day inside layoutDay).
  const jobsByDay = new Map<string, JobWithRelations[]>();
  for (const key of dayKeys) jobsByDay.set(key, []);
  for (const job of jobs) {
    if (!job.scheduled_start) continue;
    for (const key of jobDateKeys(job.scheduled_start, job.scheduled_end, tz)) {
      jobsByDay.get(key)?.push(job);
    }
  }

  const gridCols = `60px repeat(${days}, minmax(0, 1fr))`;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border bg-background">
      <div className="flex min-h-0 flex-1 overflow-x-auto">
        <div className="flex min-h-0 w-full min-w-[640px] flex-col">
          <div
            className="grid shrink-0 border-b"
            style={{ gridTemplateColumns: gridCols }}
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
            className="grid min-h-0 flex-1"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div className="relative h-full border-r">
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-2 text-[10px] text-muted-foreground"
                  style={{ top: `calc(${(i / HOURS.length) * 100}% - 6px)` }}
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
    </div>
  );
}
