import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntypedSupabase } from "@/lib/supabase/untyped";

import { addFamilyShieldNumber, removeFamilyShieldNumber } from "./actions";

export const dynamic = "force-dynamic";

type ShieldEntry = {
  exclusion_id: string;
  masked_phone: string;
  created_at: string;
};

const errorCopy: Record<string, string> = {
  phone: "أدخل رقم هاتف صحيحاً مع رمز الدولة، أو رقماً ليبياً محلياً يبدأ بـ 0.",
  own: "هذا رقم حسابك أنت. أضف رقم شخص آخر فقط.",
  limit: "وصلت إلى حد الإضافات المسموح به حالياً. جرّب لاحقاً أو احذف رقماً لم تعد تحتاجه.",
  save: "تعذر إضافة الرقم الآن. لم يتم حفظ الرقم الخام.",
  invalid: "تعذر تحديد السجل المطلوب.",
  remove: "تعذر حذف هذا الرقم من درع العائلة.",
};

export default async function FamilyShieldPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; removed?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const rpc = asUntypedSupabase(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const { data: application } = await supabase
    .from("waitlist_applications")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (application?.status !== "invited") redirect("/waitlist");

  const { data, error } = await rpc.rpc("list_my_marriage_family_shield", {});
  const entries = !error && Array.isArray(data) ? (data as ShieldEntry[]) : [];

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="font-black text-[#153d35]" href="/discovery">← الاستكشاف</Link>
          <Link className="text-sm font-bold text-black/45" href="/member">ملفي</Link>
        </div>

        <section className="mt-7 rounded-[2rem] border border-black/7 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-black text-[#9d702d]">خصوصية إضافية</p>
          <h1 className="mt-2 text-3xl font-black text-[#153d35]">درع العائلة</h1>
          <p className="mt-3 text-sm leading-7 text-black/55">
            أضف أرقام أقارب أو أشخاص تعرفهم ولا تريد أن يحدث بينكما ظهور في ميثاق. إذا كان الرقم مرتبطاً بعضو آخر، يمنع النظام هذا الزوج من الظهور لبعضه في الاستكشاف.
          </p>

          <div className="mt-5 rounded-2xl bg-[#f8f5ef] p-4 text-xs leading-6 text-black/52">
            <strong className="text-[#153d35]">ما الذي نخزنه؟</strong> لا نخزن الرقم الكامل داخل قائمة الدرع. يحوله النظام إلى بصمة غير قابلة للعرض ويحتفظ فقط بآخر أربعة أرقام حتى تستطيع تمييز السجل لاحقاً.
          </div>

          {params.added === "1" ? (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
              تمت إضافة الرقم إلى درع العائلة.
            </div>
          ) : null}
          {params.removed === "1" ? (
            <div className="mt-5 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-bold text-black/55">
              تمت إزالة الرقم من الدرع.
            </div>
          ) : null}
          {params.error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorCopy[params.error] ?? "تعذر تنفيذ العملية."}
            </div>
          ) : null}

          <form action={addFamilyShieldNumber} className="mt-6 rounded-3xl border border-black/8 p-5">
            <label className="block">
              <span className="text-sm font-black text-[#153d35]">رقم الشخص</span>
              <span className="mt-1 block text-xs leading-5 text-black/42">
                مثال: +218912345678. ويمكنك إدخال رقم ليبي محلي مثل 0912345678.
              </span>
              <input
                autoComplete="tel"
                className="focus-ring mt-3 w-full rounded-xl border border-black/10 px-4 py-3 text-left text-base"
                dir="ltr"
                inputMode="tel"
                maxLength={30}
                name="phone"
                placeholder="+218..."
                required
                type="tel"
              />
            </label>
            <button className="mt-3 w-full rounded-xl bg-[#153d35] px-5 py-3 text-sm font-black text-white" type="submit">
              إضافة إلى الدرع
            </button>
          </form>

          <div className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-[#153d35]">الأرقام المحمية</h2>
              <span className="text-xs font-bold text-black/40">{entries.length} / 40</span>
            </div>

            <div className="mt-3 space-y-2">
              {entries.map((entry) => (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/8 bg-[#faf9f6] p-4" key={entry.exclusion_id}>
                  <div>
                    <div className="font-mono text-sm font-black text-[#153d35]" dir="ltr">{entry.masked_phone}</div>
                    <div className="mt-1 text-[11px] font-bold text-black/35">
                      أضيف في {new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium" }).format(new Date(entry.created_at))}
                    </div>
                  </div>
                  <form action={removeFamilyShieldNumber}>
                    <input name="exclusion_id" type="hidden" value={entry.exclusion_id} />
                    <button className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700" type="submit">
                      إزالة
                    </button>
                  </form>
                </div>
              ))}

              {entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/15 p-7 text-center text-sm text-black/42">
                  لم تضف أي أرقام حتى الآن.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
