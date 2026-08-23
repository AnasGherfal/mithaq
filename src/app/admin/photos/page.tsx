import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

import { moderatePhoto } from "./actions";

export const dynamic = "force-dynamic";

type QueueItem = {
  item_kind: string;
  item_id: string;
  target_user_id: string | null;
  reporter_user_id: string | null;
  state: string;
  category: string | null;
  display_label: string;
  queued_at: string;
  priority: number;
};

type ReviewPhoto = QueueItem & {
  storagePath: string | null;
  signedUrl: string | null;
};

const stateLabels: Record<string, string> = {
  pending: "قيد المراجعة",
  needs_changes: "تحتاج تغييراً",
};

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect("/join");

  const { data: access } = await supabase.rpc("get_my_moderation_access", {});
  if (!access?.some((item) => item.can_review)) notFound();

  const { data: queueData, error: queueError } = await rpc.rpc("list_moderation_queue", {
    p_kind: "photo",
    p_limit: 50,
  });

  if (queueError) notFound();

  const queue = (Array.isArray(queueData) ? queueData : []) as QueueItem[];
  const photos: ReviewPhoto[] = await Promise.all(
    queue.map(async (item) => {
      const { data: storagePath, error: pathError } = await rpc.rpc(
        "get_moderation_photo_storage_path",
        { p_photo_id: item.item_id },
      );

      if (pathError || typeof storagePath !== "string") {
        return { ...item, storagePath: null, signedUrl: null };
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from("member-profile-photos")
        .createSignedUrl(storagePath, 5 * 60);

      return {
        ...item,
        storagePath,
        signedUrl: signedError ? null : signed.signedUrl,
      };
    }),
  );

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="font-black text-[#153d35]" href="/admin">إدارة ميثاق</Link>
            <h1 className="mt-2 text-3xl font-black text-[#153d35]">مراجعة الصور</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-black/48">
              الصور تبقى داخل مساحة التخزين الخاصة. هذه الصفحة تنشئ روابط مؤقتة لمدة خمس دقائق للمراجعين المخولين فقط.
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#153d35]">
            {photos.length} صورة في الطابور
          </div>
        </div>

        {params.updated === "1" ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
            تم تسجيل قرار المراجعة في سجل الإشراف.
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            تعذر حفظ قرار المراجعة. لم تتغير حالة الصورة.
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo) => (
            <article className="overflow-hidden rounded-3xl border border-black/8 bg-white shadow-sm" key={photo.item_id}>
              <div className="aspect-[4/5] bg-black/5">
                {photo.signedUrl ? (
                  <img alt="صورة للمراجعة" className="h-full w-full object-cover" src={photo.signedUrl} />
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center text-xs font-bold text-red-700">
                    تعذر إنشاء رابط المراجعة المؤقت لهذه الصورة.
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                    {stateLabels[photo.state] ?? photo.state}
                  </span>
                  <span className="text-xs font-bold text-black/38">
                    {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium" }).format(new Date(photo.queued_at))}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-black text-[#153d35]">{photo.display_label}</h2>
                <div className="mt-1 font-mono text-[11px] font-bold text-black/30" dir="ltr">
                  {photo.item_id.slice(0, 8).toUpperCase()}
                </div>

                <form action={moderatePhoto} className="mt-5 space-y-3">
                  <input name="photo_id" type="hidden" value={photo.item_id} />
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-black/50">سبب مختصر عند طلب التغيير أو الرفض</span>
                    <input
                      className="focus-ring w-full rounded-xl border border-black/10 px-3 py-3 text-sm"
                      maxLength={80}
                      name="reason"
                      placeholder="مثال: الصورة غير واضحة"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      className="rounded-xl bg-green-700 px-3 py-3 text-xs font-black text-white"
                      name="state"
                      type="submit"
                      value="approved"
                    >
                      قبول
                    </button>
                    <button
                      className="rounded-xl bg-orange-100 px-3 py-3 text-xs font-black text-orange-800"
                      name="state"
                      type="submit"
                      value="needs_changes"
                    >
                      تغيير
                    </button>
                    <button
                      className="rounded-xl bg-red-100 px-3 py-3 text-xs font-black text-red-700"
                      name="state"
                      type="submit"
                      value="rejected"
                    >
                      رفض
                    </button>
                  </div>
                </form>
              </div>
            </article>
          ))}

          {photos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/15 bg-white p-10 text-center md:col-span-2 xl:col-span-3">
              <div className="text-lg font-black text-[#153d35]">لا توجد صور تنتظر المراجعة</div>
              <p className="mt-2 text-sm text-black/42">سيظهر هنا أي رفع جديد بحالة قيد المراجعة أو يحتاج تغييراً.</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
