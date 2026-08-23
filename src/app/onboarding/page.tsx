import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { savePrivacy, savePriorities, saveProfile } from "./actions";

export const dynamic = "force-dynamic";

type Step = "profile" | "priorities" | "privacy";

const stepMeta: Array<{ key: Step; label: string }> = [
  { key: "profile", label: "ملفك" },
  { key: "priorities", label: "الأولويات" },
  { key: "privacy", label: "الخصوصية" },
];

const errorCopy: Record<string, string> = {
  profile: "راجع الاسم ونبذة التعريف. النبذة يجب أن تكون 40 حرفاً على الأقل.",
  priorities: "اختر إجابة لكل سؤال قبل المتابعة.",
  privacy: "اختر طريقة ظهور ملفك قبل المتابعة.",
  invite: "هذه المرحلة متاحة للحسابات التي وصلتها دعوة فقط.",
  save: "تعذر حفظ التغييرات الآن. لم يتم حذف بياناتك؛ حاول مرة أخرى.",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-sm font-black text-[#153d35]">{children}</span>;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/join");

  const [{ data: application }, { data: profile }, { data: spaces }] = await Promise.all([
    supabase
      .from("waitlist_applications")
      .select("status,libyan_origin_region")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("member_profiles")
      .select("display_name,about_me,occupation,education,profile_completed_at,share_occupation,share_education,share_origin_region")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("list_my_connection_spaces", {}),
  ]);

  if (application?.status !== "invited") redirect("/waitlist");

  const hasMarriageSpace =
    spaces?.some((space) => space.space === "marriage" && space.membership_state === "active") ?? false;

  let priorities:
    | {
        living_arrangement: string;
        children_plan: string;
        work_after_marriage: string;
        wedding_style: string;
        completed_at: string;
      }
    | undefined;
  let visibility: "standard" | "private" = "private";

  if (hasMarriageSpace) {
    const [{ data: priorityRows }, { data: visibilityMode }] = await Promise.all([
      supabase.rpc("get_my_marriage_practical_priorities", {}),
      supabase.rpc("get_my_marriage_visibility", {}),
    ]);
    priorities = priorityRows?.[0];
    visibility = visibilityMode ?? "private";
  }

  const profileComplete = Boolean(profile?.profile_completed_at);
  const prioritiesComplete = Boolean(priorities?.completed_at);
  const requested = stepMeta.some((item) => item.key === params.step) ? (params.step as Step) : null;

  if (profileComplete && prioritiesComplete && !requested) redirect("/member");

  let step: Step = requested ?? "profile";
  if (!profileComplete && step !== "profile") step = "profile";
  if (profileComplete && !prioritiesComplete && step === "privacy") step = "priorities";
  if (!requested && profileComplete && !prioritiesComplete) step = "priorities";
  if (!requested && profileComplete && prioritiesComplete) step = "privacy";

  const stepIndex = stepMeta.findIndex((item) => item.key === step);

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/waitlist" className="inline-flex items-center gap-2 font-black text-[#153d35]">
            <span className="grid size-9 place-items-center rounded-xl bg-[#153d35] text-white">م</span>
            ميثاق
          </Link>
          <form action="/auth/signout" method="post">
            <button className="focus-ring rounded-xl px-3 py-2 text-sm font-bold text-black/45 hover:bg-white" type="submit">
              تسجيل الخروج
            </button>
          </form>
        </div>

        <section className="mt-7 rounded-[2rem] border border-black/7 bg-white/88 p-6 shadow-[0_25px_70px_rgba(35,43,38,.1)] sm:p-9">
          <p className="text-sm font-black text-[#9d702d]">وصلتك دعوة</p>
          <h1 className="mt-2 text-3xl font-black text-[#153d35]">جهّز ملفك للمرحلة الخاصة</h1>
          <p className="mt-3 text-sm leading-7 text-black/55">
            لن نفتح الاستكشاف أو المحادثة الآن. هذه الخطوات تجهز ملفك وتحدد ما الذي يمكن مشاركته عندما تبدأ المرحلة التالية.
          </p>

          <div className="mt-7 grid grid-cols-3 gap-2">
            {stepMeta.map((item, index) => {
              const active = item.key === step;
              const available = index <= stepIndex || (profileComplete && index === 0) || (prioritiesComplete && index <= 1);
              return available ? (
                <Link
                  className={
                    active
                      ? "rounded-2xl bg-[#153d35] px-3 py-3 text-center text-xs font-black text-white"
                      : "rounded-2xl bg-[#f8f5ef] px-3 py-3 text-center text-xs font-bold text-black/50"
                  }
                  href={`/onboarding?step=${item.key}`}
                  key={item.key}
                >
                  {index + 1}. {item.label}
                </Link>
              ) : (
                <div className="rounded-2xl bg-black/4 px-3 py-3 text-center text-xs font-bold text-black/25" key={item.key}>
                  {index + 1}. {item.label}
                </div>
              );
            })}
          </div>

          {params.error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
              {errorCopy[params.error] ?? "تعذر حفظ هذه الخطوة. حاول مرة أخرى."}
            </div>
          ) : null}

          {step === "profile" ? (
            <form action={saveProfile} className="mt-7 space-y-5">
              <div>
                <h2 className="text-xl font-black text-[#153d35]">كيف تريد أن يظهر ملفك؟</h2>
                <p className="mt-2 text-sm leading-6 text-black/48">استخدم اسماً مناسباً للعرض. لا تضع رقم هاتف أو وسيلة تواصل في النبذة.</p>
              </div>

              <label className="block">
                <FieldLabel>الاسم الظاهر</FieldLabel>
                <input
                  className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4"
                  defaultValue={profile?.display_name ?? ""}
                  maxLength={50}
                  minLength={2}
                  name="display_name"
                  placeholder="مثال: أحمد"
                  required
                />
              </label>

              <label className="block">
                <FieldLabel>نبذة عنك</FieldLabel>
                <textarea
                  className="focus-ring min-h-36 w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-4 leading-7"
                  defaultValue={profile?.about_me ?? ""}
                  maxLength={600}
                  minLength={40}
                  name="about_me"
                  placeholder="تكلم باختصار عن شخصيتك، حياتك، وما يهمك في الزواج..."
                  required
                />
                <span className="mt-2 block text-xs text-black/38">من 40 إلى 600 حرف.</span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <FieldLabel>المهنة <span className="font-normal text-black/35">(اختياري)</span></FieldLabel>
                  <input className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={profile?.occupation ?? ""} maxLength={100} name="occupation" />
                </label>
                <label>
                  <FieldLabel>التعليم <span className="font-normal text-black/35">(اختياري)</span></FieldLabel>
                  <input className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={profile?.education ?? ""} maxLength={100} name="education" />
                </label>
              </div>

              <button className="focus-ring w-full rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white hover:bg-[#0f2c27]" type="submit">
                حفظ ومتابعة
              </button>
            </form>
          ) : null}

          {step === "priorities" ? (
            <form action={savePriorities} className="mt-7 space-y-5">
              <div>
                <h2 className="text-xl font-black text-[#153d35]">أمور عملية تستحق الوضوح مبكراً</h2>
                <p className="mt-2 text-sm leading-6 text-black/48">هذه الإجابات ليست حكماً على أحد؛ هدفها تقليل التعارف غير المناسب من البداية.</p>
              </div>

              <label className="block">
                <FieldLabel>السكن بعد الزواج</FieldLabel>
                <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={priorities?.living_arrangement ?? ""} name="living_arrangement" required>
                  <option disabled value="">اختر</option>
                  <option value="independent_home">بيت مستقل</option>
                  <option value="with_family_initially">مع العائلة في البداية</option>
                  <option value="with_family_long_term">مع العائلة على المدى الطويل</option>
                  <option value="flexible">مرن حسب الظروف</option>
                </select>
              </label>

              <label className="block">
                <FieldLabel>الأطفال مستقبلاً</FieldLabel>
                <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={priorities?.children_plan ?? ""} name="children_plan" required>
                  <option disabled value="">اختر</option>
                  <option value="want_children">أرغب في أطفال</option>
                  <option value="do_not_want_children">لا أرغب في أطفال</option>
                  <option value="unsure">غير متأكد</option>
                </select>
              </label>

              <label className="block">
                <FieldLabel>العمل بعد الزواج</FieldLabel>
                <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={priorities?.work_after_marriage ?? ""} name="work_after_marriage" required>
                  <option disabled value="">اختر</option>
                  <option value="both_work">أفضل استمرار الطرفين في العمل</option>
                  <option value="one_may_pause">قد يتوقف أحد الطرفين فترة</option>
                  <option value="open_to_discuss">موضوع للنقاش بيننا</option>
                  <option value="no_preference">لا توجد لدي أفضلية محددة</option>
                </select>
              </label>

              <label className="block">
                <FieldLabel>أسلوب حفل الزواج</FieldLabel>
                <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={priorities?.wedding_style ?? ""} name="wedding_style" required>
                  <option disabled value="">اختر</option>
                  <option value="simple">بسيط</option>
                  <option value="moderate">متوسط</option>
                  <option value="large">كبير</option>
                  <option value="discuss_together">نقرر معاً</option>
                </select>
              </label>

              <div className="flex gap-3">
                <Link className="focus-ring flex-1 rounded-2xl border border-black/10 px-5 py-4 text-center font-black text-black/55" href="/onboarding?step=profile">السابق</Link>
                <button className="focus-ring flex-[2] rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white" type="submit">حفظ ومتابعة</button>
              </div>
            </form>
          ) : null}

          {step === "privacy" ? (
            <form action={savePrivacy} className="mt-7 space-y-5">
              <div>
                <h2 className="text-xl font-black text-[#153d35]">أنت تتحكم فيما يظهر</h2>
                <p className="mt-2 text-sm leading-6 text-black/48">الوضع الافتراضي في ميثاق خاص. يمكنك اختيار المعلومات الإضافية التي تسمح بمشاركتها.</p>
              </div>

              <div>
                <FieldLabel>طريقة ظهور ملفك عند فتح التعارف</FieldLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="cursor-pointer rounded-2xl border border-black/10 bg-white p-4 has-[:checked]:border-[#153d35] has-[:checked]:bg-[#153d35]/5">
                    <input className="ml-2 accent-[#153d35]" defaultChecked={visibility === "private"} name="visibility" type="radio" value="private" />
                    <span className="font-black text-[#153d35]">خاص</span>
                    <span className="mt-1 block text-xs leading-5 text-black/45">تقليل الظهور قدر الإمكان ضمن مسار التعارف.</span>
                  </label>
                  <label className="cursor-pointer rounded-2xl border border-black/10 bg-white p-4 has-[:checked]:border-[#153d35] has-[:checked]:bg-[#153d35]/5">
                    <input className="ml-2 accent-[#153d35]" defaultChecked={visibility === "standard"} name="visibility" type="radio" value="standard" />
                    <span className="font-black text-[#153d35]">عادي</span>
                    <span className="mt-1 block text-xs leading-5 text-black/45">السماح باستخدام ملفك في تجربة التعارف العادية عند فتحها.</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                {profile?.occupation ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/9 bg-white p-4">
                    <input className="mt-1 size-4 accent-[#153d35]" defaultChecked={profile.share_occupation} name="share_occupation" type="checkbox" />
                    <span className="text-sm font-bold leading-6 text-black/62">السماح بإظهار المهنة: <span className="text-[#153d35]">{profile.occupation}</span></span>
                  </label>
                ) : null}
                {profile?.education ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/9 bg-white p-4">
                    <input className="mt-1 size-4 accent-[#153d35]" defaultChecked={profile.share_education} name="share_education" type="checkbox" />
                    <span className="text-sm font-bold leading-6 text-black/62">السماح بإظهار التعليم: <span className="text-[#153d35]">{profile.education}</span></span>
                  </label>
                ) : null}
                {application.libyan_origin_region ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/9 bg-white p-4">
                    <input className="mt-1 size-4 accent-[#153d35]" defaultChecked={profile?.share_origin_region ?? false} name="share_origin_region" type="checkbox" />
                    <span className="text-sm font-bold leading-6 text-black/62">السماح بإظهار المنطقة الأصلية: <span className="text-[#153d35]">{application.libyan_origin_region}</span></span>
                  </label>
                ) : null}
              </div>

              <div className="rounded-2xl bg-[#f8f5ef] p-4 text-xs leading-6 text-black/48">
                الصور ليست جزءاً من هذه الخطوة. سنضيف إدارة الصور والتحقق في المرحلة التالية مع احترام تفضيل الخصوصية الذي اخترته في قائمة الانتظار.
              </div>

              <div className="flex gap-3">
                <Link className="focus-ring flex-1 rounded-2xl border border-black/10 px-5 py-4 text-center font-black text-black/55" href="/onboarding?step=priorities">السابق</Link>
                <button className="focus-ring flex-[2] rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white" type="submit">حفظ وإنهاء الإعداد</button>
              </div>
            </form>
          ) : null}
        </section>

        <p className="mt-5 text-center text-xs leading-6 text-black/40">
          <Link className="font-bold text-[#8b6228] underline" href="/safety">الأمان والثقة</Link> · لا تضع رقم هاتف أو حساب تواصل داخل ملفك.
        </p>
      </div>
    </main>
  );
}
