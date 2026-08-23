"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

const MAX_BYTES = 8 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function PhotoUploader({ userId, photoCount }: { userId: string; photoCount: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage(null);
    setError(null);

    if (photoCount >= 5) {
      setError("يمكنك إضافة خمس صور كحد أقصى.");
      return;
    }

    const extension = extensions[file.type];
    if (!extension) {
      setError("الصورة يجب أن تكون JPG أو PNG أو WebP.");
      return;
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      setError("حجم الصورة يجب ألا يتجاوز 8 ميجابايت.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const rpc = asUntypedSupabase(supabase);
    const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("member-profile-photos")
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setBusy(false);
      setError("تعذر رفع الصورة. تأكد من النوع والحجم وحاول مرة أخرى.");
      return;
    }

    const { error: registerError } = await rpc.rpc("register_member_photo", {
      p_storage_path: storagePath,
      p_position: null,
      p_make_primary: photoCount === 0,
    });

    if (registerError) {
      const { error: cleanupError } = await supabase.storage
        .from("member-profile-photos")
        .remove([storagePath]);

      if (cleanupError) {
        await rpc.rpc("queue_my_member_photo_cleanup", {
          p_storage_path: storagePath,
          p_reason: "registration_failure",
        });
      }

      setBusy(false);
      setError(
        registerError.message.includes("limit")
          ? "وصلت إلى الحد الأقصى وهو خمس صور."
          : "تم رفع الملف لكن تعذر تسجيل الصورة؛ ألغينا الرفع بأمان. حاول مرة أخرى.",
      );
      return;
    }

    setBusy(false);
    setMessage("تم رفع الصورة وأُرسلت للمراجعة.");
    router.refresh();
  }

  return (
    <div>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={busy || photoCount >= 5}
        onChange={onFile}
        ref={inputRef}
        type="file"
      />
      <button
        className="focus-ring w-full rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy || photoCount >= 5}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {busy ? "جاري رفع الصورة..." : photoCount >= 5 ? "وصلت للحد الأقصى" : "إضافة صورة"}
      </button>
      <p className="mt-2 text-center text-xs leading-5 text-black/38">JPG أو PNG أو WebP · حتى 8 MB · بحد أقصى 5 صور</p>
      {message ? <p className="mt-3 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">{message}</p> : null}
      {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">{error}</p> : null}
    </div>
  );
}
