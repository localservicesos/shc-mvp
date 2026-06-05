"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  JOB_PHOTO_TYPES,
  JOB_PHOTO_TYPE_LABELS,
  type JobPhotoType,
} from "@/types/job-photos";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&_option]:bg-popover [&_option]:text-popover-foreground";

export function PhotoUploader({
  action,
}: {
  action: (formData: FormData) => Promise<void> | void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<JobPhotoType>("before");
  const [caption, setCaption] = useState("");
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await action(formData);
        formRef.current?.reset();
        setCaption("");
        setFileName("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-md border border-dashed p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="flex flex-col gap-1">
          <Label htmlFor="photo-file" className="text-xs">
            File
          </Label>
          <Input
            id="photo-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            disabled={isPending}
            className="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="photo-type" className="text-xs">
            Type
          </Label>
          <select
            id="photo-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as JobPhotoType)}
            disabled={isPending}
            className={cn(selectClass)}
          >
            {JOB_PHOTO_TYPES.map((t) => (
              <option key={t} value={t}>
                {JOB_PHOTO_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" disabled={isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="photo-caption" className="text-xs">
          Caption (optional)
        </Label>
        <Input
          id="photo-caption"
          name="caption"
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={isPending}
          placeholder="e.g. Front bumper before wash"
        />
      </div>
      {fileName ? (
        <p className="truncate text-xs text-muted-foreground">
          Selected: {fileName}
        </p>
      ) : null}
    </form>
  );
}
