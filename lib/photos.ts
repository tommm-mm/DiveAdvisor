// Public URL of a file in the "center-photos" Storage bucket (shared by server and client code).
export const PHOTO_BUCKET = "center-photos";
export const MAX_PHOTOS = 8;

export const photoUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
