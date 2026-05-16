"use server";

import { revalidatePath } from "next/cache";
import {
  JOB_PHOTO_TYPES,
  uploadJobPhoto,
  deleteJobPhoto,
  type JobPhotoType,
} from "@/lib/db/job-photos";

export async function uploadJobPhotoAction(
  jobId: string,
  formData: FormData,
): Promise<void> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Pick a file to upload.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File is too large (max 10MB).");
  }

  const typeRaw = String(formData.get("type") ?? "other");
  const type = (
    JOB_PHOTO_TYPES.includes(typeRaw as JobPhotoType)
      ? typeRaw
      : "other"
  ) as JobPhotoType;

  const caption = String(formData.get("caption") ?? "").trim();

  await uploadJobPhoto({
    jobId,
    file,
    type,
    caption: caption ? caption : null,
  });

  revalidatePath(`/app/jobs/${jobId}`);
}

export async function deleteJobPhotoAction(
  jobId: string,
  photoId: string,
): Promise<void> {
  await deleteJobPhoto(photoId);
  revalidatePath(`/app/jobs/${jobId}`);
}
