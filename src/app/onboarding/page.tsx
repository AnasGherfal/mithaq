import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { savePrivacy, savePriorities, saveProfile } from "./actions";

export const dynamic = "force-dynamic";

type Step = "profile" | "priorities" | "privacy";

const stepMeta: Array<{
  key: Step;
  label: string;
  eyebrow: string;
  description: string;
}> = [
  {
    key: "profile",
    label: "ملفك",
    eyebrow: "01",
    description: "الاسم الظاهر والنبذة والمعلومات الاختيارية.",
  },
  {
    key: "priorities",
    label: "أولويات الزواج",
    eyebrow: "02",
    description: "أمور عملية نريد وضوحها قبل أي تعارف.",
  },
  {
    key: "privacy",
    label: "الخصوصية",
    eyebrow: "03",
    description: "أنت تختار ما يمكن مشاركته عند فتح الاستكشاف.",
  },
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

function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select
        className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm font-bold text-black/70"
        defaultValue={defaultValue}
        name={name}
        required
      >
        <option disabled value="">اختر</option>
        {children}
      </select>
    </label>
  );
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
  const progress = Math.round(((stepIndex + 1) / stepMeta.length) * 100);

  return (
    <main className="min-h-screen px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/waitlist" className="inline-flex items-center gap-3 font-black text-[#153d35]">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#153d35] text-lg text-white shadow-sm">م</span>
            <span>
              <span className="block text-lg">ميثاق</span>
              <span className="block text-[10px] font-bold tracking-[.16em] text-black/35" dir="ltr">MEMBER SETUP</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link className="focus-ring rounded-xl px-3 py-2 text-xs font-black text-black/45 hover:bg-white" href="/safety">
              الأمان والخصوصية
            </Link>
            <form action="/auth/signout" method="post">
              <button className="focus-ring rounded-xl px-3 py-2 text-xs font-black text-black/45 hover:bg-white" type="submit">
                تسجيل الخروج
              </button>
            </form>
          </div>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
          <aside className="lg:sticky lg:top-6">
            <section className="overflow-hidden rounded-[2rem] bg-[#153d35] p-6 text-white shadow-[0_26px_70px_rgba(21,61,53,.2)] sm:p-7">
              <p className="text-xs font-black tracking-[.16em] text-[#e5bd7e]">INVITED MEMBER</p>
              <h1 className="mt-4 text-3xl font-black leading-[1.35]">جهّز ملفاً واضحاً قبل أن يراك أي شخص.</h1>
              <p className="mt-4 text-sm leading-7 text-white/68">
                الدعوة فتحت لك إعداد العضوية فقط. لن تدخل الاستكشاف حتى يكتمل ملفك ويُراجع، ولن تفتح أي محادثة بدون مقدمة وموافقة صريحة من الطرفين.
              </p>

              <div className="mt-7 rounded-2xl border border-white/10 bg-white/6 p-4">
                <div className="flex items-center justify-between text-xs font-black text-white/70">
                  <span>تقدم الإعداد</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#e5bd7e]" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {stepMeta.map((item, index) => {
                  const active = item.key === step;
                  const complete = index === 0 ? profileComplete : index === 1 ? prioritiesComplete : false;
                  const available = index <= stepIndex || complete;
                  const body = (
                    <div
                      className={`rounded-2xl border p-4 transition ${
                        active
                          ? "border-[#e5bd7e]/55 bg-[#e5bd7e]/10"
                          : complete
                            ? "border-white/10 bg-white/6"
                            : "border-white/8 bg-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${active ? "bg-[#e5bd7e] text-[#153d35]" : complete ? "bg-white/12 text-white" : "bg-white/6 text-white/45"}`}>
                          {complete ? "✓" : item.eyebrow}
                        </span>
                        <div>
                          <div className={`text-sm font-black ${available ? "text-white" : "text-white/38"}`}>{item.label}</div>
                          <p className={`mt-1 text-xs leading-5 ${available ? "text-white/55" : "text-white/28"}`}>{item.description}</p>
                        </div>
                      </div>
                    </div>
                  );

                  return available ? (
                    <Link href={`/onboarding?step=${item.key}`} key={item.key}>{body}</Link>
                  ) : (
                    <div key={item.key}>{body}</div>
                  );
                })}
              </div>
            </section>

            <div className="mt-4 rounded-2xl border border-black/7 bg-white/72 p-4 text-xs leading-6 text-black/48">
              <span className="font-black text-[#153d35]">ما لا نطلبه هنا:</span> رقم هاتف للعرض، حسابات تواصل، مستندات هوية أو مشاركة صور عامة.
            </div>
          </aside>

          <section className="rounded-[2rem] border border-black/7 bg-white/90 p-6 shadow-[0_24px_70px_rgba(35,43,38,.08)] sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/7 pb-6">
              <div>
                <p className="text-xs font-black text-[#9d702d]">الخطوة {stepIndex + 1} من {stepMeta.length}</p>
                <h2 className="mt-2 text-2xl font-black text-[#153d35]">{stepMeta[stepIndex]?.label}</h2>
              </div>
              <span className="rounded-full bg-[#f8f5ef] px-4 py-2 text-[11px] font-black text-black/45">
                الحفظ يتم في حسابك الخاص
              </span>
            </div>

            {params.error ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
                {errorCopy[params.error] ?? "تعذر حفظ هذه الخطوة. حاول مرة أخرى."}
              </div>
            ) : null}

            {step === "profile" ? (
              <form action={saveProfile} className="mt-7 space-y-6">
                <div>
                  <h3 className="text-xl font-black text-[#153d35]">عرّف بنفسك بدون كشف معلوماتك الخاصة</h3>
                  <p className="mt-2 text-sm leading-7 text-black/48">
                    هذا هو النص الذي سيخضع للمراجعة قبل الاستكشاف. لا تضع رقم هاتف، اسم مستخدم على منصة أخرى، أو وسيلة تواصل خارج ميثاق.
                  </p>
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
                  <span className="mt-2 block text-xs leading-5 text-black/38">اسم مناسب للعرض، وليس ضرورياً أن يكون اسمك القانوني الكامل.</span>
                </label>

                <label className="block">
                  <FieldLabel>نبذة عنك</FieldLabel>
                  <textarea
                    className="focus-ring min-h-44 w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-4 leading-8"
                    defaultValue={profile?.about_me ?? ""}
                    maxLength={600}
                    minLength={40}
                    name="about_me"
                    placeholder="تكلم عن شخصيتك، يومك، ما تقدّره في الحياة، وما الذي يعنيه لك الزواج الجاد..."
                    required
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-black/38">
                    <span>من 40 إلى 600 حرف.</span>
                    <span>المحتوى يمر بمراجعة قبل الظهور.</span>
                  </div>
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

                <div className="rounded-2xl bg-[#f8f5ef] p-4 text-xs leading-6 text-black/48">
                  المهنة والتعليم لا يظهران تلقائياً. ستختار في خطوة الخصوصية إن كنت تريد مشاركتهما.
                </div>

                <button className="focus-ring w-full rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white hover:bg-[#0f2c27]" type="submit">
                  حفظ الملف والانتقال للأولويات
                </button>
              </form>
            ) : null}

            {step === "priorities" ? (
              <form action={savePriorities} className="mt-7 space-y-6">
                <div>
                  <h3 className="text-xl font-black text-[#153d35]">وضوح عملي قبل الانجذاب</h3>
                  <p className="mt-2 text-sm leading-7 text-black/48">
                    هذه ليست نقاط تقييم ولا أسئلة لإظهار “إجابة صحيحة”. نستخدمها لتقليل مقدمات لا تناسب الطرفين من الأساس.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField label="السكن بعد الزواج" name="living_arrangement" defaultValue={priorities?.living_arrangement ?? ""}>
                    <option value="independent_home">بيت مستقل</option>
                    <option value="with_family_initially">مع العائلة في البداية</option>
                    <option value="with_family_long_term">مع العائلة على المدى الطويل</option>
                    <option value="flexible">مرن حسب الظروف</option>
                  </SelectField>

                  <SelectField label="الأطفال مستقبلاً" name="children_plan" defaultValue={priorities?.children_plan ?? ""}>
                    <option value="want_children">أرغب في أطفال</option>
                    <option value="do_not_want_children">لا أرغب في أطفال</option>
                    <option value="unsure">غير متأكد</option>
                  </SelectField>

                  <SelectField label="العمل بعد الزواج" name="work_after_marriage" defaultValue={priorities?.work_after_marriage ?? ""}>
                    <option value="both_work">أفضل استمرار الطرفين في العمل</option>
                    <option value="one_may_pause">قد يتوقف أحد الطرفين فترة</option>
                    <option value="open_to_discuss">موضوع للنقاش بيننا</option>
                    <option value="no_preference">لا توجد لدي أفضلية محددة</option>
                  </SelectField>

                  <SelectField label="أسلوب حفل الزواج" name="wedding_style" defaultValue={priorities?.wedding_style ?? ""}>
                    <option value="simple">بسيط</option>
                    <option value="moderate">متوسط</option>
                    <option value="large">كبير</option>
                    <option value="discuss_together">نقرر معاً</option>
                  </SelectField>
                </div>

                <div className="rounded-2xl border border-[#c99a52]/20 bg-[#c99a52]/7 p-4 text-xs leading-6 text-black/52">
                  يمكنك تعديل هذه الأولويات لاحقاً. تعديلها لا يفتح تواصلاً مع أي عضو ولا يرسل إشعاراً لأشخاص آخرين.
                </div>

                <div className="flex gap-3">
                  <Link className="focus-ring flex-1 rounded-2xl border border-black/10 px-5 py-4 text-center font-black text-black/55" href="/onboarding?step=profile">السابق</Link>
                  <button className="focus-ring flex-[2] rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white" type="submit">حفظ والانتقال للخصوصية</button>
                </div>
              </form>
            ) : null}

            {step === "privacy" ? (
              <form action={savePrivacy} className="mt-7 space-y-6">
                <div>
                  <h3 className="text-xl font-black text-[#153d35]">اختر أقل قدر من المعلومات يكفيك</h3>
                  <p className="mt-2 text-sm leading-7 text-black/48">
                    رقم هاتفك لا يدخل هذه الخيارات ولا يُشارك تلقائياً. هنا تختار فقط طريقة ظهور الملف والمعلومات الإضافية التي تسمح بها.
                  </p>
                </div>

                <div>
                  <FieldLabel>طريقة ظهور ملفك عند فتح الاستكشاف</FieldLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="cursor-pointer rounded-2xl border border-black/10 bg-white p-5 transition has-[:checked]:border-[#153d35] has-[:checked]:bg-[#153d35]/5">
                      <div className="flex items-start gap-3">
                        <input className="mt-1 accent-[#153d35]" defaultChecked={visibility === "private"} name="visibility" required type="radio" value="private" />
                        <div>
                          <span className="font-black text-[#153d35]">خاص</span>
                          <span className="mt-1 block text-xs leading-6 text-black/45">تقليل الظهور قدر الإمكان ضمن تجربة الاستكشاف.</span>
                        </div>
                      </div>
                    </label>
                    <label className="cursor-pointer rounded-2xl border border-black/10 bg-white p-5 transition has-[:checked]:border-[#153d35] has-[:checked]:bg-[#153d35]/5">
                      <div className="flex items-start gap-3">
                        <input className="mt-1 accent-[#153d35]" defaultChecked={visibility === "standard"} name="visibility" required type="radio" value="standard" />
                        <div>
                          <span className="font-black text-[#153d35]">عادي</span>
                          <span className="mt-1 block text-xs leading-6 text-black/45">استخدام ملفك ضمن تجربة الاستكشاف العادية بعد الاعتماد.</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <FieldLabel>معلومات إضافية اختيارية</FieldLabel>
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
                    {application?.libyan_origin_region ? (
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/9 bg-white p-4">
                        <input className="mt-1 size-4 accent-[#153d35]" defaultChecked={profile?.share_origin_region ?? false} name="share_origin_region" type="checkbox" />
                        <span className="text-sm font-bold leading-6 text-black/62">السماح بإظهار المنطقة الأصلية: <span className="text-[#153d35]">{application.libyan_origin_region}</span></span>
                      </label>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#153d35]/12 bg-[#153d35]/5 p-5">
                  <p className="text-xs font-black text-[#153d35]">ماذا يحدث بعد الضغط على إنهاء؟</p>
                  <ol className="mt-3 space-y-2 text-xs leading-6 text-black/52">
                    <li><span className="font-black text-[#153d35]">1.</span> يكتمل إعداد العضوية.</li>
                    <li><span className="font-black text-[#153d35]">2.</span> ملفك يبقى خارج الاستكشاف إلى أن يمر بالمراجعة المطلوبة.</li>
                    <li><span className="font-black text-[#153d35]">3.</span> بعد الاعتماد فقط يصبح الاستكشاف متاحاً إذا بقيت كل شروط المشاركة متحققة.</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Link className="focus-ring flex-1 rounded-2xl border border-black/10 px-5 py-4 text-center font-black text-black/55" href="/onboarding?step=priorities">السابق</Link>
                  <button className="focus-ring flex-[2] rounded-2xl bg-[#153d35] px-5 py-4 font-black text-white" type="submit">إنهاء وإرسال الملف للمراجعة</button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
