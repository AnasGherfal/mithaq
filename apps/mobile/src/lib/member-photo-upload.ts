import * as ImageManipulator from "expo-image-manipulator";
import { memberPhotoBucket } from "@/lib/member-photos";
import { supabase } from "@/lib/supabase";

const TARGET_ASPECT = 4 / 5;
const MAX_OUTPUT_WIDTH = 1280;
const MIN_CROP_WIDTH = 480;
const MIN_CROP_HEIGHT = 600;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type MemberPhotoUploadStage = "preparing" | "uploading" | "registering";

export class MemberPhotoUploadError extends Error {
  constructor(
    public readonly code:
      | "unauthorized"
      | "image_too_small"
      | "prepare_failed"
      | "file_too_large"
      | "upload_failed"
      | "registration_failed"
      | "registration_failed_cleanup_pending",
  ) {
    super(code);
    this.name = "MemberPhotoUploadError";
  }
}

type UploadInput = {
  uri: string;
  width: number;
  height: number;
  makePrimary: boolean;
  onStage?: (stage: MemberPhotoUploadStage) => void;
};

export async function prepareAndUploadMemberPhoto({
  uri,
  width,
  height,
  makePrimary,
  onStage,
}: UploadInput) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw new MemberPhotoUploadError("unauthorized");
  }

  const crop = centeredPortraitCrop(width, height);
  if (crop.width < MIN_CROP_WIDTH || crop.height < MIN_CROP_HEIGHT) {
    throw new MemberPhotoUploadError("image_too_small");
  }

  onStage?.("preparing");

  const outputWidth = Math.min(MAX_OUTPUT_WIDTH, Math.floor(crop.width));
  let prepared: ImageManipulator.ImageResult;

  try {
    prepared = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          crop: {
            originX: Math.floor(crop.originX),
            originY: Math.floor(crop.originY),
            width: Math.floor(crop.width),
            height: Math.floor(crop.height),
          },
        },
        { resize: { width: outputWidth } },
      ],
      {
        base64: true,
        compress: 0.82,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
  } catch {
    throw new MemberPhotoUploadError("prepare_failed");
  }

  if (!prepared.base64) {
    throw new MemberPhotoUploadError("prepare_failed");
  }

  const bytes = decodeBase64(prepared.base64);
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new MemberPhotoUploadError("file_too_large");
  }

  const userId = sessionData.session.user.id;
  const storagePath = `${userId}/${createUploadName()}.jpg`;

  onStage?.("uploading");
  const { error: uploadError } = await supabase.storage
    .from(memberPhotoBucket)
    .upload(storagePath, bytes, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new MemberPhotoUploadError("upload_failed");
  }

  onStage?.("registering");
  const { data: photoId, error: registrationError } = await supabase.rpc(
    "register_member_photo",
    {
      p_storage_path: storagePath,
      p_position: null,
      p_make_primary: makePrimary,
    },
  );

  if (registrationError || typeof photoId !== "string") {
    const { error: cleanupError } = await supabase.storage
      .from(memberPhotoBucket)
      .remove([storagePath]);

    throw new MemberPhotoUploadError(
      cleanupError ? "registration_failed_cleanup_pending" : "registration_failed",
    );
  }

  return {
    photoId,
    storagePath,
    width: prepared.width,
    height: prepared.height,
  };
}

function centeredPortraitCrop(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new MemberPhotoUploadError("prepare_failed");
  }

  const sourceAspect = width / height;
  if (sourceAspect > TARGET_ASPECT) {
    const cropWidth = height * TARGET_ASPECT;
    return {
      originX: (width - cropWidth) / 2,
      originY: 0,
      width: cropWidth,
      height,
    };
  }

  const cropHeight = width / TARGET_ASPECT;
  return {
    originX: 0,
    originY: (height - cropHeight) / 2,
    width,
    height: cropHeight,
  };
}

function createUploadName() {
  const random = Math.random().toString(36).slice(2, 12);
  return `${Date.now()}-${random}`;
}

function decodeBase64(value: string): ArrayBuffer {
  const normalized = value.replace(/\s/g, "");

  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of normalized) {
    if (character === "=") break;
    const valueIndex = alphabet.indexOf(character);
    if (valueIndex < 0) continue;

    buffer = (buffer << 6) | valueIndex;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }

  return Uint8Array.from(output).buffer;
}
