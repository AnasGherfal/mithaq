import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  waitlistQuestionnaireSchema,
  type WaitlistQuestionnaireInput,
} from "./schema";

export async function loadMyWaitlistQuestionnaire(
  userId: string,
): Promise<WaitlistQuestionnaireInput | null> {
  const supabase = await createSupabaseServerClient();
  const { data: application, error: applicationError } = await supabase
    .from("waitlist_applications")
    .select(
      "id, gender, age_band_id, residency_type, current_country_code, current_city, libyan_origin_region, marital_status, has_children, libyan_self_attestation",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (applicationError || !application) {
    return null;
  }

  const [preferencesResult, statusesResult, countriesResult] = await Promise.all([
    supabase
      .from("waitlist_preferences")
      .select(
        "marriage_timeline, willing_identity_verification, photo_privacy_preference, family_involvement_preference, relocation_willingness, open_to_libya, open_to_diaspora, preferred_partner_age_min, preferred_partner_age_max, accepts_partner_with_children",
      )
      .eq("application_id", application.id)
      .maybeSingle(),
    supabase
      .from("waitlist_accepted_marital_statuses")
      .select("marital_status")
      .eq("application_id", application.id),
    supabase
      .from("waitlist_preferred_countries")
      .select("country_code")
      .eq("application_id", application.id),
  ]);

  if (
    preferencesResult.error ||
    statusesResult.error ||
    countriesResult.error ||
    !preferencesResult.data
  ) {
    return null;
  }

  const candidate = {
    gender: application.gender,
    ageBandId: application.age_band_id,
    residencyType: application.residency_type,
    currentCountryCode: application.current_country_code,
    currentCity: application.current_city,
    libyanOriginRegion: application.libyan_origin_region ?? undefined,
    maritalStatus: application.marital_status,
    hasChildren: application.has_children,
    libyanSelfAttestation: application.libyan_self_attestation,
    marriageTimeline: preferencesResult.data.marriage_timeline,
    preferredPartnerAgeMin: preferencesResult.data.preferred_partner_age_min,
    preferredPartnerAgeMax: preferencesResult.data.preferred_partner_age_max,
    acceptedMaritalStatuses: statusesResult.data.map((row) => row.marital_status),
    acceptsPartnerWithChildren:
      preferencesResult.data.accepts_partner_with_children,
    openToLibya: preferencesResult.data.open_to_libya,
    openToDiaspora: preferencesResult.data.open_to_diaspora,
    relocationWillingness: preferencesResult.data.relocation_willingness,
    preferredCountries: countriesResult.data.map((row) => row.country_code),
    willingIdentityVerification:
      preferencesResult.data.willing_identity_verification,
    photoPrivacyPreference: preferencesResult.data.photo_privacy_preference,
    familyInvolvementPreference:
      preferencesResult.data.family_involvement_preference,
  };

  const parsed = waitlistQuestionnaireSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
