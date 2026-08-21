import { supabase } from "@/lib/supabase";

export type IntroductionPhotoRef = {
  photoId: string;
  position: number;
  isPrimary: boolean;
};

type IntroductionPhotoRefRow = {
  photo_id: string;
  position: number | string;
  is_primary: boolean;
};

type SignedIntroductionPhotoResponse = {
  photoId?: unknown;
  signedUrl?: unknown;
  expiresIn?: unknown;
};

export async function listIntroductionPhotoRefs(
  introductionId: string,
): Promise<IntroductionPhotoRef[]> {
  const { data, error } = await supabase.rpc("list_introduction_photo_refs", {
    p_introduction_id: introductionId,
  });

  if (error) throw error;

  return ((data ?? []) as IntroductionPhotoRefRow[])
    .map((row) => ({
      photoId: row.photo_id,
      position: Number(row.position),
      isPrimary: row.is_primary,
    }))
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.position - b.position;
    });
}

export async function getIntroductionPhotoUrl(
  introductionId: string,
  photoId: string,
) {
  const { data, error } = await supabase.functions.invoke(
    "introduction-photo-url",
    {
      body: { introductionId, photoId },
    },
  );

  if (error) throw error;

  const response = (data ?? {}) as SignedIntroductionPhotoResponse;
  if (typeof response.signedUrl !== "string") {
    throw new Error("introduction photo unavailable");
  }

  return {
    photoId:
      typeof response.photoId === "string" ? response.photoId : photoId,
    signedUrl: response.signedUrl,
    expiresIn:
      typeof response.expiresIn === "number" ? response.expiresIn : 90,
  };
}

export async function getPrimaryIntroductionPhotoUrl(introductionId: string) {
  const refs = await listIntroductionPhotoRefs(introductionId);
  const primary = refs.find((photo) => photo.isPrimary) ?? refs[0];
  if (!primary) return null;

  try {
    return await getIntroductionPhotoUrl(introductionId, primary.photoId);
  } catch {
    return null;
  }
}
