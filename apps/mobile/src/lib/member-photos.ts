import { supabase } from "@/lib/supabase";

export const memberPhotoBucket = "member-profile-photos";

export type MemberPhotoReviewState =
  | "pending"
  | "approved"
  | "needs_changes"
  | "rejected";

export type MemberPhotoExtension = "jpg" | "png" | "webp";

export type PreparedMemberPhotoUpload = {
  bytes: ArrayBuffer;
  extension: MemberPhotoExtension;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  position?: number | null;
  makePrimary?: boolean;
};

export type MemberPhoto = {
  photoId: string;
  storagePath: string;
  position: number;
  isPrimary: boolean;
  reviewState: MemberPhotoReviewState;
  reviewAfter: string | null;
  createdAt: string;
  signedUrl: string | null;
};

type MemberPhotoRow = {
  photo_id: string;
  storage_path: string;
  position: number | string;
  is_primary: boolean;
  review_state: MemberPhotoReviewState;
  review_after: string | null;
  created_at: string;
};

export function isPhotoFeatureUnavailable(error: unknown) {
  const value = normalizeError(error);
  return (
    value.includes("list_my_member_photos") &&
    (value.includes("schema cache") || value.includes("could not find the function"))
  );
}

export async function listMyMemberPhotos(): Promise<MemberPhoto[]> {
  const { data, error } = await supabase.rpc("list_my_member_photos");
  if (error) throw error;

  const rows = ((data ?? []) as MemberPhotoRow[]).sort(
    (a, b) => Number(a.position) - Number(b.position),
  );

  return Promise.all(
    rows.map(async (row) => {
      const { data: signedData } = await supabase.storage
        .from(memberPhotoBucket)
        .createSignedUrl(row.storage_path, 10 * 60);

      return {
        photoId: row.photo_id,
        storagePath: row.storage_path,
        position: Number(row.position),
        isPrimary: row.is_primary,
        reviewState: row.review_state,
        reviewAfter: row.review_after,
        createdAt: row.created_at,
        signedUrl: signedData?.signedUrl ?? null,
      } satisfies MemberPhoto;
    }),
  );
}

export async function uploadPreparedMemberPhoto(
  input: PreparedMemberPhotoUpload,
) {
  if (input.bytes.byteLength === 0) {
    throw new Error("member photo file is empty");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("authentication required");

  const objectId = createObjectId();
  const storagePath = `${userId}/${objectId}.${input.extension}`;

  const { error: uploadError } = await supabase.storage
    .from(memberPhotoBucket)
    .upload(storagePath, input.bytes, {
      cacheControl: "3600",
      contentType: input.contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: registrationData, error: registrationError } = await supabase.rpc(
    "register_member_photo",
    {
      p_storage_path: storagePath,
      p_position: input.position ?? null,
      p_make_primary: input.makePrimary ?? false,
    },
  );

  if (registrationError || typeof registrationData !== "string") {
    const { error: cleanupError } = await supabase.storage
      .from(memberPhotoBucket)
      .remove([storagePath]);

    if (cleanupError) {
      throw new Error("member photo registration failed and secure cleanup must be retried", {
        cause: registrationError ?? cleanupError,
      });
    }

    throw registrationError ?? new Error("member photo registration failed");
  }

  return {
    photoId: registrationData,
    storagePath,
  };
}

export async function setPrimaryMemberPhoto(photoId: string) {
  const { error } = await supabase.rpc("set_primary_member_photo", {
    p_photo_id: photoId,
  });
  if (error) throw error;
}

export async function reorderMemberPhotos(photoIds: string[]) {
  const { error } = await supabase.rpc("reorder_member_photos", {
    p_photo_ids: photoIds,
  });
  if (error) throw error;
}

export async function removeMemberPhoto(photoId: string) {
  const { data, error } = await supabase.rpc("remove_member_photo", {
    p_photo_id: photoId,
  });
  if (error) throw error;

  const storagePath = typeof data === "string" ? data : null;
  if (!storagePath) throw new Error("member photo cleanup path unavailable");

  const { error: storageError } = await supabase.storage
    .from(memberPhotoBucket)
    .remove([storagePath]);

  return {
    storagePath,
    storageCleanupFailed: Boolean(storageError),
  };
}

function createObjectId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto);
  }

  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${randomPart}`;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").toLowerCase();
  }
  return String(error ?? "").toLowerCase();
}
