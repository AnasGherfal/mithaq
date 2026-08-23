"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { getOrCreateReferralSessionId } from "@/lib/referral-session";
import type {
  FamilyInvolvementPreference,
  Gender,
  MarriageTimeline,
  MaritalStatus,
  PhotoPrivacyPreference,
  ResidencyType,
  TristatePreference,
} from "@/lib/supabase/database.types";

import { initialWaitlistActionState, submitWaitlist } from "./actions";

type AgeBand = {
  id: number;
  label: string;
};

type InitialData = {
  gender: Gender | "";
  ageBandId: string;
  residencyType: ResidencyType;
  currentCountryCode: string;
  currentCity: string;
  libyanOriginRegion: string;
  maritalStatus: MaritalStatus | "";
  hasChildren: "yes" | "no" | "";
  libyanSelfAttestation: boolean;
  marriageTimeline: MarriageTimeline | "";
  willingIdentityVerification: "yes" | "no" | "";
  photoPrivacyPreference: PhotoPrivacyPreference | "";
  familyInvolvementPreference: FamilyInvolvementPreference | "";
  relocationWillingness: TristatePreference | "";
  openToLibya: boolean;
  openToDiaspora: boolean;
  preferredPartnerAgeMin: string;
  preferredPartnerAgeMax: string;
  acceptsPartnerWithChildren: TristatePreference | "";
  acceptedMaritalStatuses: MaritalStatus[];
};

const countries = [
  ["LY", "ليبيا"],
  ["TN", "تونس"],
  ["EG", "مصر"],
  ["TR", "تركيا"],
  ["AE", "الإمارات"],
  ["SA", "السعودية"],
  ["QA", "قطر"],
  ["JO", "الأردن"],
  ["MT", "مالطا"],
  ["IT", "إيطاليا"],
  ["DE", "ألمانيا"],
  ["FR", "فرنسا"],
  ["GB", "بريطانيا"],
  ["NL", "هولندا"],
  ["SE", "السويد"],
  ["US", "الولايات المتحدة"],
  ["CA", "كندا"],
] as const;

const maritalOptions: Array<[MaritalStatus, string]> = [
  ["never_married", "لم يسبق له/لها الزواج"],
  ["divorced", "مطلق/مطلقة"],
  ["widowed", "أرمل/أرملة"],
  ["married", "متزوج/متزوجة"],
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-sm font-black text-[#153d35]">{children}</span>;
}

function RadioCard({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="cursor-pointer rounded-2xl border border-black/10 bg-white p-4 transition has-[:checked]:border-[#153d35] has-[:checked]:bg-[#153d35]/5">
      <input className="ml-2 accent-[#153d35]" defaultChecked={defaultChecked} name={name} required type="radio" value={value} />
      <span className="text-sm font-bold text-black/68">{label}</span>
    </label>
  );
}

export function WaitlistForm({ ageBands, initialData }: { ageBands: AgeBand[]; initialData: InitialData }) {
  const [step, setStep] = useState(0);
  const [state, formAction, pending] = useActionState(submitWaitlist, initialWaitlistActionState);
  const [referralSessionId, setReferralSessionId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const totalSteps = 4;

  useEffect(() => {
    setReferralSessionId(getOrCreateReferralSessionId() ?? "");
  }, []);

  function validateCurrentStep() {
    const section = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (!section) return true;

    const controls = Array.from(section.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    for (const control of controls) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return false;
      }
    }

    if (step === 2) {
      const form = formRef.current;
      if (!form) return false;
      const locationSelected =
        (form.elements.namedItem("open_to_libya") as HTMLInputElement | null)?.checked ||
        (form.elements.namedItem("open_to_diaspora") as HTMLInputElement | null)?.checked;
      if (!locationSelected) {
        window.alert("اختر ليبيا أو الخارج على الأقل ضمن أماكن الشريك المقبولة.");
        return false;
      }

      const acceptedStatuses = form.querySelectorAll<HTMLInputElement>('input[name="accepted_marital_statuses"]:checked');
      if (acceptedStatuses.length === 0) {
        window.alert("اختر حالة اجتماعية واحدة على الأقل تقبلها في الشريك.");
        return false;
      }

      const min = Number((form.elements.namedItem("preferred_partner_age_min") as HTMLInputElement | null)?.value);
      const max = Number((form.elements.namedItem("preferred_partner_age_max") as HTMLInputElement | null)?.value);
      if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
        window.alert("الحد الأعلى للعمر يجب أن يكون أكبر من أو يساوي الحد الأدنى.");
        return false;
      }
    }

    return true;
  }

  function next() {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(totalSteps - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form action={formAction} ref={formRef}>
      <input name="referral_session_id" type="hidden" value={referralSessionId} readOnly />

      <div className="mb-7">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-black/45">
          <span>الخطوة {step + 1} من {totalSteps}</span>
          <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/7">
          <div className="h-full rounded-full bg-[#c99a52] transition-all" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>

      <section className={step === 0 ? "space-y-6" : "hidden"} data-step="0">
        <div>
          <p className="text-sm font-black text-[#9d702d]">أولاً</p>
          <h2 className="mt-1 text-2xl font-black text-[#153d35]">معلومات أساسية عنك</h2>
          <p className="mt-2 text-sm leading-6 text-black/50">نسأل فقط ما نحتاجه لبناء تجربة تعارف مناسبة لاحقاً.</p>
        </div>

        <div>
          <FieldLabel>أنا</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <RadioCard name="gender" value="man" label="رجل" defaultChecked={initialData.gender === "man"} />
            <RadioCard name="gender" value="woman" label="امرأة" defaultChecked={initialData.gender === "woman"} />
          </div>
        </div>

        <label className="block">
          <FieldLabel>الفئة العمرية</FieldLabel>
          <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.ageBandId} name="age_band_id" required>
            <option value="" disabled>اختر الفئة العمرية</option>
            {ageBands.map((band) => <option key={band.id} value={band.id}>{band.label}</option>)}
          </select>
        </label>

        <div>
          <FieldLabel>مكان الإقامة</FieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <RadioCard name="residency_type" value="libya" label="داخل ليبيا" defaultChecked={initialData.residencyType === "libya"} />
            <RadioCard name="residency_type" value="diaspora" label="خارج ليبيا" defaultChecked={initialData.residencyType === "diaspora"} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <FieldLabel>الدولة الحالية</FieldLabel>
            <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.currentCountryCode} name="current_country_code" required>
              {countries.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label>
            <FieldLabel>المدينة الحالية</FieldLabel>
            <input className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.currentCity} maxLength={80} name="current_city" placeholder="مثال: طرابلس" required />
          </label>
        </div>

        <label className="block">
          <FieldLabel>المنطقة/المدينة الليبية الأصلية <span className="font-normal text-black/35">(اختياري)</span></FieldLabel>
          <input className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.libyanOriginRegion} maxLength={80} name="libyan_origin_region" placeholder="مثال: طرابلس، مصراتة، بنغازي..." />
        </label>

        <div>
          <FieldLabel>الحالة الاجتماعية</FieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {maritalOptions.map(([value, label]) => (
              <RadioCard key={value} name="marital_status" value={value} label={label} defaultChecked={initialData.maritalStatus === value} />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>هل لديك أطفال؟</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <RadioCard name="has_children" value="yes" label="نعم" defaultChecked={initialData.hasChildren === "yes"} />
            <RadioCard name="has_children" value="no" label="لا" defaultChecked={initialData.hasChildren === "no"} />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#c99a52]/25 bg-[#c99a52]/8 p-4">
          <input className="mt-1 size-4 accent-[#153d35]" defaultChecked={initialData.libyanSelfAttestation} name="libyan_self_attestation" required type="checkbox" />
          <span className="text-sm font-bold leading-6 text-black/65">أؤكد أنني ليبي/ليبية وأن المعلومات التي قدمتها صحيحة بقدر علمي.</span>
        </label>
      </section>

      <section className={step === 1 ? "space-y-6" : "hidden"} data-step="1">
        <div>
          <p className="text-sm font-black text-[#9d702d]">ثانياً</p>
          <h2 className="mt-1 text-2xl font-black text-[#153d35]">ما الذي يناسبك في التجربة؟</h2>
        </div>

        <label className="block">
          <FieldLabel>متى تفكر في الزواج بجدية؟</FieldLabel>
          <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.marriageTimeline} name="marriage_timeline" required>
            <option value="" disabled>اختر</option>
            <option value="within_6_months">خلال 6 أشهر</option>
            <option value="6_to_12_months">خلال 6–12 شهراً</option>
            <option value="1_to_2_years">خلال سنة إلى سنتين</option>
            <option value="unsure">غير متأكد بعد</option>
          </select>
        </label>

        <div>
          <FieldLabel>هل أنت مستعد لإثبات الهوية عندما نفتح هذه المرحلة؟</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <RadioCard name="willing_identity_verification" value="yes" label="نعم" defaultChecked={initialData.willingIdentityVerification === "yes"} />
            <RadioCard name="willing_identity_verification" value="no" label="ليس الآن" defaultChecked={initialData.willingIdentityVerification === "no"} />
          </div>
        </div>

        <label className="block">
          <FieldLabel>كيف تفضل ظهور الصور؟</FieldLabel>
          <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.photoPrivacyPreference} name="photo_privacy_preference" required>
            <option value="" disabled>اختر</option>
            <option value="after_mutual_interest">بعد وجود اهتمام متبادل</option>
            <option value="explicit_approval">بعد موافقتي الصريحة</option>
            <option value="after_family_involvement">بعد دخول العائلة</option>
            <option value="blurred">صورة مموهة في البداية</option>
            <option value="discovery_visible">يمكن إظهارها أثناء الاستكشاف</option>
            <option value="none">لا أريد عرض صورة</option>
          </select>
        </label>

        <label className="block">
          <FieldLabel>متى تفضل إشراك العائلة؟</FieldLabel>
          <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.familyInvolvementPreference} name="family_involvement_preference" required>
            <option value="" disabled>اختر</option>
            <option value="early">من وقت مبكر</option>
            <option value="after_initial_interest">بعد وجود اهتمام أولي</option>
            <option value="later">في مرحلة لاحقة</option>
            <option value="unsure">غير متأكد</option>
          </select>
        </label>
      </section>

      <section className={step === 2 ? "space-y-6" : "hidden"} data-step="2">
        <div>
          <p className="text-sm font-black text-[#9d702d]">ثالثاً</p>
          <h2 className="mt-1 text-2xl font-black text-[#153d35]">تفضيلات أساسية في الشريك</h2>
          <p className="mt-2 text-sm leading-6 text-black/50">هذه ليست نقاط تقييم؛ نستخدمها لتجنب اقتراح تعارف غير مناسب من الأساس.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label>
            <FieldLabel>العمر من</FieldLabel>
            <input className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.preferredPartnerAgeMin} max={80} min={18} name="preferred_partner_age_min" required type="number" />
          </label>
          <label>
            <FieldLabel>إلى</FieldLabel>
            <input className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.preferredPartnerAgeMax} max={80} min={18} name="preferred_partner_age_max" required type="number" />
          </label>
        </div>

        <div>
          <FieldLabel>أين يمكن أن يكون الشريك؟</FieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="cursor-pointer rounded-2xl border border-black/10 bg-white p-4 has-[:checked]:border-[#153d35] has-[:checked]:bg-[#153d35]/5">
              <input className="ml-2 accent-[#153d35]" defaultChecked={initialData.openToLibya} name="open_to_libya" type="checkbox" />
              <span className="text-sm font-bold">داخل ليبيا</span>
            </label>
            <label className="cursor-pointer rounded-2xl border border-black/10 bg-white p-4 has-[:checked]:border-[#153d35] has-[:checked]:bg-[#153d35]/5">
              <input className="ml-2 accent-[#153d35]" defaultChecked={initialData.openToDiaspora} name="open_to_diaspora" type="checkbox" />
              <span className="text-sm font-bold">خارج ليبيا</span>
            </label>
          </div>
        </div>

        <label className="block">
          <FieldLabel>الانتقال لمدينة أو دولة أخرى</FieldLabel>
          <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.relocationWillingness} name="relocation_willingness" required>
            <option value="" disabled>اختر</option>
            <option value="yes">ممكن</option>
            <option value="no">غير ممكن</option>
            <option value="depends">حسب الظروف</option>
          </select>
        </label>

        <div>
          <FieldLabel>الحالات الاجتماعية المقبولة في الشريك</FieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {maritalOptions.map(([value, label]) => (
              <label key={value} className="cursor-pointer rounded-2xl border border-black/10 bg-white p-4 has-[:checked]:border-[#153d35] has-[:checked]:bg-[#153d35]/5">
                <input className="ml-2 accent-[#153d35]" defaultChecked={initialData.acceptedMaritalStatuses.includes(value)} name="accepted_marital_statuses" type="checkbox" value={value} />
                <span className="text-sm font-bold">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <FieldLabel>هل تقبل شريكاً لديه أطفال؟</FieldLabel>
          <select className="focus-ring w-full rounded-2xl border border-black/10 bg-white px-4 py-4" defaultValue={initialData.acceptsPartnerWithChildren} name="accepts_partner_with_children" required>
            <option value="" disabled>اختر</option>
            <option value="yes">نعم</option>
            <option value="no">لا</option>
            <option value="depends">حسب الظروف</option>
          </select>
        </label>
      </section>

      <section className={step === 3 ? "space-y-6" : "hidden"} data-step="3">
        <div>
          <p className="text-sm font-black text-[#9d702d]">أخيراً</p>
          <h2 className="mt-1 text-2xl font-black text-[#153d35]">راجع الموافقات قبل الإرسال</h2>
          <p className="mt-2 text-sm leading-6 text-black/50">التسجيل في قائمة الانتظار لا يعني قبولك في الخدمة ولا يفتح التعارف فوراً.</p>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/9 bg-white p-4">
            <input className="mt-1 size-4 accent-[#153d35]" name="confirm_age" required type="checkbox" />
            <span className="text-sm font-bold leading-6 text-black/65">أؤكد مرة أخرى أن عمري 18 سنة أو أكثر.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/9 bg-white p-4">
            <input className="mt-1 size-4 accent-[#153d35]" name="accept_terms" required type="checkbox" />
            <span className="text-sm font-bold leading-6 text-black/65">أوافق على <Link className="text-[#8b6228] underline" href="/terms" target="_blank">شروط الاستخدام</Link> الخاصة بمرحلة ما قبل الإطلاق.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/9 bg-white p-4">
            <input className="mt-1 size-4 accent-[#153d35]" name="accept_privacy" required type="checkbox" />
            <span className="text-sm font-bold leading-6 text-black/65">قرأت وأوافق على <Link className="text-[#8b6228] underline" href="/privacy" target="_blank">سياسة الخصوصية</Link>.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/9 bg-white p-4">
            <input className="mt-1 size-4 accent-[#153d35]" name="accept_processing" required type="checkbox" />
            <span className="text-sm font-bold leading-6 text-black/65">أوافق على معالجة بيانات هذا الاستبيان لإدارة قائمة الانتظار وتقييم ملاءمة الإطلاق.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#c99a52]/22 bg-[#c99a52]/7 p-4">
            <input className="mt-1 size-4 accent-[#153d35]" name="communications" type="checkbox" />
            <span className="text-sm font-bold leading-6 text-black/60">أرغب في استلام تحديثات ميثاق ودعوات الإطلاق. <span className="font-normal text-black/40">(اختياري)</span></span>
          </label>
        </div>

        {state.error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">{state.error}</div> : null}
      </section>

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <button className="focus-ring min-h-12 flex-1 rounded-2xl border border-black/10 bg-white px-5 py-3 font-black text-black/60" onClick={back} type="button">
            السابق
          </button>
        ) : null}
        {step < totalSteps - 1 ? (
          <button className="focus-ring min-h-12 flex-[2] rounded-2xl bg-[#153d35] px-5 py-3 font-black text-white" onClick={next} type="button">
            التالي
          </button>
        ) : (
          <button className="focus-ring min-h-12 flex-[2] rounded-2xl bg-[#153d35] px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-55" disabled={pending} type="submit">
            {pending ? "جاري حفظ التسجيل..." : "أرسل طلب الانضمام"}
          </button>
        )}
      </div>
    </form>
  );
}
