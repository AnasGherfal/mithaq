import { supabase } from "@/lib/supabase";

export type IntroductionPhotoPreference =
  | "discovery_visible"
  | "none"
  | "blurred"
  | "after_mutual_interest"
  | "explicit_approval"
  | "after_family_involvement";

export type IntroductionRevealState = {
  photoPreference: IntroductionPhotoPreference;
  approvedPhotoAvailable: boolean;
  photoRevealed: boolean;
  canRevealPhoto: boolean;
  otherPhotoRevealed: boolean;
};

type RevealStateRow = {
  photo_preference: IntroductionPhotoPreference | null;
  approved_photo_available: boolean | null;
  photo_revealed: boolean | null;
  can_reveal_photo: boolean | null;
  other_photo_revealed: boolean | null;
};

export async function getMyIntroductionRevealState(
  introductionId: string,
): Promise<IntroductionRevealState> {
  const { data, error } = await supabase.rpc("get_my_introduction_reveal_state", {
    p_introduction_id: introductionId,
  });
  if (error) throw error;

  const row = ((Array.isArray(data) ? data[0] : data) ?? null) as RevealStateRow | null;
  return {
    photoPreference: row?.photo_preference ?? "none",
    approvedPhotoAvailable: Boolean(row?.approved_photo_available),
    photoRevealed: Boolean(row?.photo_revealed),
    canRevealPhoto: Boolean(row?.can_reveal_photo),
    otherPhotoRevealed: Boolean(row?.other_photo_revealed),
  };
}

export async function revealMyIntroductionPhoto(introductionId: string) {
  const { error } = await supabase.rpc("reveal_my_introduction_photo", {
    p_introduction_id: introductionId,
  });
  if (error) throw error;
}
