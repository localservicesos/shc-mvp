import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";
import type {
  JobPhoto,
  JobPhotoType,
  JobPhotoWithSignedUrl,
} from "@/types/job-photos";

export type {
  JobPhoto,
  JobPhotoType,
  JobPhotoWithSignedUrl,
} from "@/types/job-photos";
export { JOB_PHOTO_TYPES, JOB_PHOTO_TYPE_LABELS } from "@/types/job-photos";

const BUCKET = "job-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export async function listJobPhotos(
  jobId: string,
): Promise<JobPhotoWithSignedUrl[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_photos")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const photos = (data ?? []) as JobPhoto[];
  if (photos.length === 0) return [];

  // Batch sign all URLs for efficiency.
  const paths = photos.map((p) => p.photo_url);
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (signErr) throw signErr;

  const signedByPath = new Map<string, string>();
  for (const item of signed ?? []) {
    if (item.signedUrl && item.path) {
      signedByPath.set(item.path, item.signedUrl);
    }
  }

  return photos.map((p) => ({
    ...p,
    signedUrl: signedByPath.get(p.photo_url) ?? null,
  }));
}

export async function uploadJobPhoto(input: {
  jobId: string;
  file: File;
  type: JobPhotoType;
  caption: string | null;
}): Promise<JobPhoto> {
  const business = await getCurrentBusiness();
  if (!business) throw new Error("No current business");

  const supabase = await createClient();

  const dotIndex = input.file.name.lastIndexOf(".");
  const extRaw =
    dotIndex >= 0 ? input.file.name.slice(dotIndex + 1).toLowerCase() : "jpg";
  const ext = /^[a-z0-9]{2,5}$/.test(extRaw) ? extRaw : "jpg";

  const path = `${business.id}/${input.jobId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, {
      contentType: input.file.type || undefined,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("job_photos")
    .insert({
      business_id: business.id,
      job_id: input.jobId,
      photo_url: path,
      type: input.type,
      caption: input.caption,
    })
    .select("*")
    .single();

  if (error) {
    // Best-effort cleanup on row insert failure.
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data as JobPhoto;
}

export async function deleteJobPhoto(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error: fetchErr } = await supabase
    .from("job_photos")
    .select("photo_url")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) return;

  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .remove([data.photo_url]);
  if (storageErr) {
    // Log but proceed to delete the row so the UI stays consistent.
    console.error("Failed to remove storage object", storageErr);
  }

  const { error } = await supabase.from("job_photos").delete().eq("id", id);
  if (error) throw error;
}
