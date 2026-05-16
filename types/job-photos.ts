export const JOB_PHOTO_TYPES = ["before", "after", "other"] as const;
export type JobPhotoType = (typeof JOB_PHOTO_TYPES)[number];

export const JOB_PHOTO_TYPE_LABELS: Record<JobPhotoType, string> = {
  before: "Before",
  after: "After",
  other: "Other",
};

export type JobPhoto = {
  id: string;
  business_id: string;
  job_id: string;
  photo_url: string; // storage path: <business_id>/<job_id>/<uuid>.<ext>
  type: JobPhotoType;
  caption: string | null;
  created_at: string;
};

export type JobPhotoWithSignedUrl = JobPhoto & {
  signedUrl: string | null;
};
