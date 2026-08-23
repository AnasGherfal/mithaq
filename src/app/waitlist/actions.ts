"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type WaitlistActionState = {
  error: string | null;
};

export const initialWaitlistActionState: WaitlistActionState = { error: null };

const schema = z
  .object({
    gender: z.enum(["woman", "man"]),
    ageBandId: z.coerce.number().int().min(1),
    residencyType: z.enum(["libya", "diaspora"]),
    currentCountryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
    currentCity: z.string().trim().min(2).max(80),
    libyanOriginRegion: z.string().trim().max(80),
    maritalStatus: z.enum(["never_married", "divorced", "widowed", "married"]),
    hasChildren: z.enum(["yes", "no"]).transform((value) => value === "yes"),
    libyanSelfAttestation: z.literal(true),
    marriageTimeline: z.enum(["within_6_months", "6_to_12_months", "1_to_2_years", "unsure"]),
    willingIdentityVerification: z.enum(["yes", "no"]).transform((value) => value === "yes"),
    photoPrivacyPreference: z.enum([
      "none",
      "blurred",
      "after_mutual_interest",
      "explicit_approval",
      "after_family_involvement",
      "discovery_visible",
    ]),
    familyInvolvementPreference: z.enum(["early", "after_initial_interest", "later", "unsure"]),
    relocationWillingness: z.enum(["yes", "no", "depends"]),
    openToLibya: z.boolean(),
    openToDiaspora: z.boolean(),
    preferredPartnerAgeMin: z.coerce.number().int().min(18).max(80),
    preferredPartnerAgeMax: z.coerce.number().int().min(18).max(80),
    acceptsPartnerWithChildren: z.enum(["yes", "no", "depends"]),
    acceptedMaritalStatuses: z
      .array(z.enum(["never_married", "divorced", "widowed", "married"]))
      .min(1),
    confirmAge: z.literal(true),
    acceptTerms: z.literal(true),
    acceptPrivacy: z.literal(true),
    acceptProcessing: z.literal(true),
    communications: z.boolean(),
    referralSessionId: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (!value.openToLibya && !value.openToDiaspora) {
      context.addIssue({
        code: "custom",
        path: ["openToLibya"],
        message: "اختر ليبيا أو الخارج على الأقل.",
      });
    }
    if (value.preferredPartnerAgeMax < value.preferredPartnerAgeMin) {
      context.addIssue({
        code: "custom",
        path: ["preferredPartnerAgeMax"],
        message: "الحد الأعلى للعمر يجب أن يكون أكبر من أو يساوي الحد الأدنى.",
      });
    }
  });

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function friendlyDatabaseError(message: string) {
  if (message.includes("authentication required")) return "انتهت جلسة الدخول. سجل الدخول مرة أخرى.";
  if (message.includes("account unavailable")) return "هذا الحساب غير متاح حالياً.";
  if (message.includes("questionnaire incomplete")) return "تأكد من إكمال كل أسئلة التسجيل قبل الإرسال.";
  return "حدث خطأ أثناء حفظ التسجيل. لم نفقد حسابك؛ حاول الإرسال مرة أخرى.";
}

export async function submitWaitlist(
  _previousState: WaitlistActionState,
  formData: FormData,
): Promise<WaitlistActionState> {
  const sessionValue = formData.get("referral_session_id");
  const parsed = schema.safeParse({
    gender: formData.get("gender"),
    ageBandId: formData.get("age_band_id"),
    residencyType: formData.get("residency_type"),
    currentCountryCode: formData.get("current_country_code"),
    currentCity: formData.get("current_city"),
    libyanOriginRegion: formData.get("libyan_origin_region") ?? "",
    maritalStatus: formData.get("marital_status"),
    hasChildren: formData.get("has_children"),
    libyanSelfAttestation: checked(formData, "libyan_self_attestation"),
    marriageTimeline: formData.get("marriage_timeline"),
    willingIdentityVerification: formData.get("willing_identity_verification"),
    photoPrivacyPreference: formData.get("photo_privacy_preference"),
    familyInvolvementPreference: formData.get("family_involvement_preference"),
    relocationWillingness: formData.get("relocation_willingness"),
    openToLibya: checked(formData, "open_to_libya"),
    openToDiaspora: checked(formData, "open_to_diaspora"),
    preferredPartnerAgeMin: formData.get("preferred_partner_age_min"),
    preferredPartnerAgeMax: formData.get("preferred_partner_age_max"),
    acceptsPartnerWithChildren: formData.get("accepts_partner_with_children"),
    acceptedMaritalStatuses: formData.getAll("accepted_marital_statuses").map(String),
    confirmAge: checked(formData, "confirm_age"),
    acceptTerms: checked(formData, "accept_terms"),
    acceptPrivacy: checked(formData, "accept_privacy"),
    acceptProcessing: checked(formData, "accept_processing"),
    communications: checked(formData, "communications"),
    referralSessionId:
      typeof sessionValue === "string" && sessionValue.length > 0 ? sessionValue : undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "تأكد من إكمال كل الحقول المطلوبة.",
    };
  }

  const value = parsed.data;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    return { error: "انتهت جلسة الدخول. سجل الدخول مرة أخرى." };
  }

  const { error: saveError } = await supabase.rpc("save_my_waitlist", {
    p_gender: value.gender,
    p_age_band_id: value.ageBandId,
    p_residency_type: value.residencyType,
    p_current_country_code: value.currentCountryCode,
    p_current_city: value.currentCity,
    p_libyan_origin_region: value.libyanOriginRegion,
    p_marital_status: value.maritalStatus,
    p_has_children: value.hasChildren,
    p_libyan_self_attestation: value.libyanSelfAttestation,
    p_marriage_timeline: value.marriageTimeline,
    p_willing_identity_verification: value.willingIdentityVerification,
    p_photo_privacy_preference: value.photoPrivacyPreference,
    p_family_involvement_preference: value.familyInvolvementPreference,
    p_relocation_willingness: value.relocationWillingness,
    p_open_to_libya: value.openToLibya,
    p_open_to_diaspora: value.openToDiaspora,
    p_preferred_partner_age_min: value.preferredPartnerAgeMin,
    p_preferred_partner_age_max: value.preferredPartnerAgeMax,
    p_accepts_partner_with_children: value.acceptsPartnerWithChildren,
    p_accepted_marital_statuses: value.acceptedMaritalStatuses,
    p_preferred_country_codes: [],
  });

  if (saveError) return { error: friendlyDatabaseError(saveError.message) };

  const { error: finalizeError } = await supabase.rpc("finalize_waitlist", {
    p_locale: "ar",
    p_communications: value.communications,
  });

  if (finalizeError) return { error: friendlyDatabaseError(finalizeError.message) };

  if (value.referralSessionId) {
    await supabase.rpc("record_referral_milestone", {
      p_event_type: "submitted",
      p_session_id: value.referralSessionId,
    });
  }

  revalidatePath("/waitlist");
  redirect("/waitlist?submitted=1");
}
