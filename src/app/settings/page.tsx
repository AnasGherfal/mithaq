import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { requestAccountDeletion } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-LY", { dateStyle: "long" }).format(new Date(value));
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const { data: deletionRequest } = await supabase
    .from("deletion_requests")
    .select("status,requested_at,due_at")
    .eq("user_id", userId)
    .eq("request_scope", "entire_account")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeDeletion =
    deletionRequest &&
    ["requested", "identity_confirmed", "in_progress"].includes(deletionRequest.status);

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/waitlist" className="inline-flex items-center gap-2 font-black text-[#153d35]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#153d35] text-white">م</span>
            ميثاق
          </Link>
          <Link className="text-sm font-bold text-black/50 hover:text-[#153d35]" href="/waitlist">
            العودة لحسابي
          </Link>
        </div>

        <section className="mt-7 rounded-[2rem] border border-black/7 bg-white/88 p-6 shadow-[0_25px_70px_rgba(35,43,38,.1)] sm:p-9">
          <p className="text-sm font-black text-[#9d702d]">إعدادات الحساب</p>
          <h1 className="mt-2 text-3xl font-black text-[#153d35]">الخصوصية والتحكم في حسابك</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-black/55">
            ميثاق في مرحلة قائمة الانتظار. يمكنك الرجوع لصفحة حسابك أو طلب حذف الحساب والبيانات المرتبطة به.
          </p>

          <div className="mt-7 rounded-3xl border border-black/8 bg-[#f8f5ef] p-5">
            <h2 className="font-black text-[#153d35]">بياناتك في ميثاق</h2>
            <p className="mt-2 text-sm leading-7 text-black/55">
              رقم الهاتف مخصص للدخول والتحقق ولا يظهر لمستخدمي ميثاق الآخرين. تفاصيل قائمة الانتظار ليست دليلاً عاماً للأعضاء.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
              <Link className="rounded-xl bg-white px-4 py-2 text-[#153d35]" href="/privacy">سياسة الخصوصية</Link>
              <Link className="rounded-xl bg-white px-4 py-2 text-[#153d35]" href="/safety">الأمان والثقة</Link>
            </div>
          </div>

          <div className="mt-7 border-t border-black/8 pt-7">
            <p className="text-sm font-black text-red-700">حذف الحساب</p>
            <h2 className="mt-1 text-xl font-black text-black/80">طلب حذف حساب ميثاق بالكامل</h2>

            {activeDeletion ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                <div className="font-black">طلب الحذف مسجل بالفعل.</div>
                <div>تاريخ الطلب: {formatDate(deletionRequest.requested_at)}</div>
                <div>موعد المعالجة المستهدف: {formatDate(deletionRequest.due_at)}</div>
              </div>
            ) : (
              <>
                <p className="mt-3 text-sm leading-7 text-black/55">
                  عند إرسال الطلب يصبح حسابك في حالة انتظار للحذف، يُسحب طلب قائمة الانتظار، وتتوقف موافقتك على الرسائل التسويقية. النظام يحدد موعد المعالجة خلال 30 يوماً.
                </p>

                {error === "confirmation" ? (
                  <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    اكتب العبارة المطلوبة بالضبط قبل إرسال طلب الحذف.
                  </p>
                ) : null}
                {error === "request" ? (
                  <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    تعذر تسجيل طلب الحذف الآن. لم يتم حذف شيء؛ حاول مرة أخرى.
                  </p>
                ) : null}

                <form action={requestAccountDeletion} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-black/65">
                      للتأكيد، اكتب: <span className="text-red-700">حذف حسابي</span>
                    </span>
                    <input
                      autoComplete="off"
                      className="focus-ring w-full rounded-2xl border border-red-200 bg-white px-4 py-4"
                      name="confirmation"
                      required
                    />
                  </label>
                  <button className="focus-ring rounded-2xl bg-red-700 px-5 py-3 font-black text-white hover:bg-red-800" type="submit">
                    طلب حذف الحساب
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
