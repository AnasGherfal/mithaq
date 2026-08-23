"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PhotoRecord = {
  photo_id: string;
  storage_path: string;
  position: number;
  is_primary: boolean;
  review_state: "pending" | "approved" | "needs_changes" | "rejected";
  review_after: string | null;
  created_at: string;
};

async function requirePhotoMember() {
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const [{ data: application }, { data: profile }, { data: spaces }] = await Promise.all([
    supabase
      .from("waitlist_applications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("member_profiles")
      .select("profile_completed_at")
      .eq("user_id", userId)
      .maybeSingle(),
    rpc.rpc("list_my_connection_spaces"),
  ]);

  const activeMarriageSpace = Array.isArray(spaces)
    ? spaces.some(
        (space: { space?: string; membership_state?: string }) =>
          space.space === "marriage" && space.membership_state === "active",
      )
    : false;

  if (application?.status !== "invited" || !profile?.profile_completed_at || !activeMarriageSpace) {
    redirect("/member");
  }

  return { supabase, rpc };
}

export async function removePhoto(formData: FormData) {
  const photoId = String(formData.get("photo_id") ?? "");
  if (!uuidPattern.test(photoId)) redirect("/photos?error=invalid");

  const { supabase, rpc } = await requirePhotoMember();
  const { data: storagePath, error } = await rpc.rpc("remove_member_photo", {
    p_photo_id: photoId,
  });

  if (error || typeof storagePath !== "string") redirect("/photos?error=remove");

  const { error: storageError } = await supabase.storage
    .from("member-profile-photos")
    .remove([storagePath]);

  if (storageError) {
    await rpc.rpc("queue_my_member_photo_cleanup", {
      p_storage_path: storagePath,
      p_reason: "delete",
    });
  }

  revalidatePath("/photos");
  revalidatePath("/member");
  redirect("/photos?updated=removed");
}

export async function setPrimaryPhoto(formData: FormData) {
  const photoId = String(formData.get("photo_id") ?? "");
  if (!uuidPattern.test(photoId)) redirect("/photos?error=invalid");

  const { rpc } = await requirePhotoMember();
  const { error } = await rpc.rpc("set_primary_member_photo", {
    p_photo_id: photoId,
  });

  if (error) redirect("/photos?error=primary");

  revalidatePath("/photos");
  revalidatePath("/member");
  redirect("/photos?updated=primary");
}

export async function movePhoto(formData: FormData) {
  const photoId = String(formData.get("photo_id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!uuidPattern.test(photoId) || !["up", "down"].includes(direction)) {
    redirect("/photos?error=invalid");
  }

  const { rpc } = await requirePhotoMember();
  const { data, error: listError } = await rpc.rpc("list_my_member_photos");
  if (listError || !Array.isArray(data)) redirect("/photos?error=order");

  const photos = (data as PhotoRecord[]).sort((a, b) => a.position - b.position);
  const index = photos.findIndex((photo) => photo.photo_id === photoId);
  if (index < 0) redirect("/photos?error=order");

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= photos.length) redirect("/photos");

  [photos[index], photos[swapIndex]] = [photos[swapIndex], photos[index]];
  const { error } = await rpc.rpc("reorder_member_photos", {
    p_photo_ids: photos.map((photo) => photo.photo_id),
  });

  if (error) redirect("/photos?error=order");

  revalidatePath("/photos");
  redirect("/photos?updated=order");
}
