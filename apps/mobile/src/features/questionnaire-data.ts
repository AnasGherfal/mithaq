import { supabase } from "@/lib/supabase";

export type MaritalStatus = "never_married" | "divorced" | "widowed";
export type YesNoDepends = "yes" | "no" | "depends";

export type QuestionnaireDraft = {
  gender: "woman" | "man";
  ageBandId: number;
  residencyType: "libya" | "diaspora";
  currentCountryCode: string;
  currentCity: string;
  libyanOriginRegion: string;
  maritalStatus: MaritalStatus;
  hasChildren: boolean;
  libyanSelfAttestation: boolean;
  marriageTimeline: "within_6_months" | "6_to_12_months" | "1_to_2_years" | "unsure";
  preferredPartnerAgeMin: number;
  preferredPartnerAgeMax: number;
  acceptedMaritalStatuses: MaritalStatus[];
  acceptsPartnerWithChildren: YesNoDepends;
  openToLibya: boolean;
  openToDiaspora: boolean;
  relocationWillingness: YesNoDepends;
  preferredCountries: string[];
  willingIdentityVerification: boolean;
  photoPrivacyPreference:
    "none" | "blurred" | "after_mutual_interest" | "explicit_approval" | "after_family_involvement";
  familyInvolvementPreference: "early" | "after_initial_interest" | "later" | "unsure";
};

export const defaultQuestionnaire: QuestionnaireDraft = {
  gender: "man",
  ageBandId: 2,
  residencyType: "libya",
  currentCountryCode: "LY",
  currentCity: "",
  libyanOriginRegion: "",
  maritalStatus: "never_married",
  hasChildren: false,
  libyanSelfAttestation: true,
  marriageTimeline: "6_to_12_months",
  preferredPartnerAgeMin: 22,
  preferredPartnerAgeMax: 35,
  acceptedMaritalStatuses: ["never_married"],
  acceptsPartnerWithChildren: "depends",
  openToLibya: true,
  openToDiaspora: true,
  relocationWillingness: "depends",
  preferredCountries: [],
  willingIdentityVerification: true,
  photoPrivacyPreference: "after_mutual_interest",
  familyInvolvementPreference: "after_initial_interest",
};

export function validateQuestionnaire(value: QuestionnaireDraft): string | null {
  if (!/^[A-Z]{2}$/.test(value.currentCountryCode.trim().toUpperCase())) {
    return "country";
  }
  if (!value.currentCity.trim() || value.currentCity.trim().length > 100) {
    return "city";
  }
  if (!value.libyanSelfAttestation) return "libyan";
  if (value.preferredPartnerAgeMin < 18 || value.preferredPartnerAgeMax > 100) {
    return "age";
  }
  if (value.preferredPartnerAgeMax < value.preferredPartnerAgeMin) {
    return "age";
  }
  if (value.acceptedMaritalStatuses.length === 0) return "status";
  if (!value.openToLibya && !value.openToDiaspora) return "location";
  if (value.preferredCountries.some((country) => !/^[A-Z]{2}$/.test(country.trim().toUpperCase()))) {
    return "countries";
  }
  return null;
}

export async function loadQuestionnaire(): Promise<QuestionnaireDraft | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data: application } = await supabase
    .from("waitlist_applications")
    .select(
      "id, gender, age_band_id, residency_type, current_country_code, current_city, libyan_origin_region, marital_status, has_children, libyan_self_attestation",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!application) return null;

  const [preferencesResult, statusesResult, countriesResult] = await Promise.all([
    supabase
      .from("waitlist_preferences")
      .select(
        "marriage_timeline, willing_identity_verification, photo_privacy_preference, family_involvement_preference, relocation_willingness, open_to_libya, open_to_diaspora, preferred_partner_age_min, preferred_partner_age_max, accepts_partner_with_children",
      )
      .eq("application_id", application.id)
      .maybeSingle(),
    supabase.from("waitlist_accepted_marital_statuses").select("marital_status").eq("application_id", application.id),
    supabase.from("waitlist_preferred_countries").select("country_code").eq("application_id", application.id),
  ]);

  const preferences = preferencesResult.data;
  if (!preferences) return null;

  return {
    gender: application.gender as QuestionnaireDraft["gender"],
    ageBandId: application.age_band_id,
    residencyType: application.residency_type as QuestionnaireDraft["residencyType"],
    currentCountryCode: application.current_country_code,
    currentCity: application.current_city,
    libyanOriginRegion: application.libyan_origin_region ?? "",
    maritalStatus: application.marital_status as MaritalStatus,
    hasChildren: application.has_children,
    libyanSelfAttestation: application.libyan_self_attestation,
    marriageTimeline: preferences.marriage_timeline as QuestionnaireDraft["marriageTimeline"],
    preferredPartnerAgeMin: preferences.preferred_partner_age_min,
    preferredPartnerAgeMax: preferences.preferred_partner_age_max,
    acceptedMaritalStatuses: (statusesResult.data ?? []).map((row) => row.marital_status as MaritalStatus),
    acceptsPartnerWithChildren: preferences.accepts_partner_with_children as YesNoDepends,
    openToLibya: preferences.open_to_libya,
    openToDiaspora: preferences.open_to_diaspora,
    relocationWillingness: preferences.relocation_willingness as YesNoDepends,
    preferredCountries: (countriesResult.data ?? []).map((row) => row.country_code),
    willingIdentityVerification: preferences.willing_identity_verification,
    photoPrivacyPreference: preferences.photo_privacy_preference as QuestionnaireDraft["photoPrivacyPreference"],
    familyInvolvementPreference:
      preferences.family_involvement_preference as QuestionnaireDraft["familyInvolvementPreference"],
  };
}

export async function saveQuestionnaire(value: QuestionnaireDraft) {
  const invalid = validateQuestionnaire(value);
  if (invalid) return { ok: false as const, reason: invalid };

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { ok: false as const, reason: "unauthorized" };

  const { data: existingApplication } = await supabase
    .from("waitlist_applications")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date().toISOString();
  const { data: application, error: applicationError } = await supabase
    .from("waitlist_applications")
    .upsert(
      {
        user_id: userId,
        questionnaire_version: "2026-08-17.v1",
        gender: value.gender,
        age_band_id: value.ageBandId,
        residency_type: value.residencyType,
        current_country_code: value.currentCountryCode.trim().toUpperCase(),
        current_city: value.currentCity.trim(),
        libyan_origin_region: value.libyanOriginRegion.trim() || null,
        marital_status: value.maritalStatus,
        has_children: value.hasChildren,
        libyan_self_attestation: value.libyanSelfAttestation,
        questionnaire_completed_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select("id")
    .single();

  if (applicationError || !application) {
    return { ok: false as const, reason: "database" };
  }

  const { error: preferencesError } = await supabase.from("waitlist_preferences").upsert({
    application_id: application.id,
    marriage_timeline: value.marriageTimeline,
    willing_identity_verification: value.willingIdentityVerification,
    photo_privacy_preference: value.photoPrivacyPreference,
    family_involvement_preference: value.familyInvolvementPreference,
    relocation_willingness: value.relocationWillingness,
    open_to_libya: value.openToLibya,
    open_to_diaspora: value.openToDiaspora,
    preferred_partner_age_min: value.preferredPartnerAgeMin,
    preferred_partner_age_max: value.preferredPartnerAgeMax,
    accepts_partner_with_children: value.acceptsPartnerWithChildren,
    updated_at: now,
  });

  if (preferencesError) return { ok: false as const, reason: "database" };

  const { error: deleteStatusesError } = await supabase
    .from("waitlist_accepted_marital_statuses")
    .delete()
    .eq("application_id", application.id);
  if (deleteStatusesError) return { ok: false as const, reason: "database" };

  const { error: statusesError } = await supabase.from("waitlist_accepted_marital_statuses").insert(
    value.acceptedMaritalStatuses.map((maritalStatus) => ({
      application_id: application.id,
      marital_status: maritalStatus,
    })),
  );
  if (statusesError) return { ok: false as const, reason: "database" };

  const { error: deleteCountriesError } = await supabase
    .from("waitlist_preferred_countries")
    .delete()
    .eq("application_id", application.id);
  if (deleteCountriesError) return { ok: false as const, reason: "database" };

  if (value.preferredCountries.length > 0) {
    const { error: countriesError } = await supabase.from("waitlist_preferred_countries").insert(
      value.preferredCountries.map((countryCode) => ({
        application_id: application.id,
        country_code: countryCode.trim().toUpperCase(),
      })),
    );
    if (countriesError) return { ok: false as const, reason: "database" };
  }

  return {
    ok: true as const,
    wasSubmitted: existingApplication?.status === "submitted",
  };
}
