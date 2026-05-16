import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  JOB_PHOTO_TYPES,
  JOB_PHOTO_TYPE_LABELS,
  type JobPhotoType,
  type JobPhotoWithSignedUrl,
} from "@/types/job-photos";
import { deleteJobPhotoAction } from "@/app/app/jobs/[id]/photos/actions";

export function PhotoGrid({
  jobId,
  photos,
}: {
  jobId: string;
  photos: JobPhotoWithSignedUrl[];
}) {
  if (photos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No photos yet. Upload before/after shots above.
      </p>
    );
  }

  const grouped = new Map<JobPhotoType, JobPhotoWithSignedUrl[]>();
  for (const t of JOB_PHOTO_TYPES) grouped.set(t, []);
  for (const p of photos) grouped.get(p.type)?.push(p);

  return (
    <div className="space-y-4">
      {JOB_PHOTO_TYPES.map((t) => {
        const group = grouped.get(t) ?? [];
        if (group.length === 0) return null;
        return (
          <div key={t} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {JOB_PHOTO_TYPE_LABELS[t]} ({group.length})
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {group.map((p) => (
                <li
                  key={p.id}
                  className="group relative overflow-hidden rounded-md border bg-muted"
                >
                  {p.signedUrl ? (
                    <a
                      href={p.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.signedUrl}
                        alt={p.caption ?? `${t} photo`}
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-xs text-muted-foreground">
                      Unavailable
                    </div>
                  )}
                  {p.caption ? (
                    <p className="truncate p-1 text-xs text-muted-foreground">
                      {p.caption}
                    </p>
                  ) : null}
                  <form
                    action={deleteJobPhotoAction.bind(null, jobId, p.id)}
                    className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Button
                      type="submit"
                      size="icon"
                      variant="destructive"
                      aria-label="Delete photo"
                      className="h-7 w-7"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
