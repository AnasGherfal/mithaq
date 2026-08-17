"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  waitlistQuestionnaireSchema,
  type WaitlistQuestionnaireInput,
} from "./schema";

export type SaveWaitlistResult =
  { ok: true } | { ok: false; reason: "unauthorized" | "invalid" | "database" };

export async function saveWaitlistQuestionnaire(
  input: WaitlistQuestionnaireInput,
): Promise<SaveWaitlistResult> {
  const parsed = waitlistQuestionnaireSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return { ok: false, reason: "unauthorized" };
  }

  const { data: existingApplication, error: existingApplicationError } =
    await supabase
      .from("waitlist_applications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

  if (existingApplicationError) {
    return { ok: false, reason: "database" };
  }

  const wasSubmitted = existingApplication?.status === "submitted";
  const value = parsed.data;
  const now = new Date().toISOString();

  const { data: application, error: applicationError } = await supabase
    .from("waitlist_applications")
    .upsert(
      {
        user_id: userId,
        status: wasSubmitted ? "submitted" : "draft",
        questionnaire_version: "2026-08-17.v1",
        gender: value.gender,
        age_band_id: value.ageBandId,
        residency_type: value.residencyType,
        current_country_code: value.currentCountryCode,
        current_city: value.currentCity,
        libyan_origin_region: value.libyanOriginRegion || null,
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
    return { ok: false, reason: "database" };
  }

  const { error: preferencesError } = await supabase
    .from("waitlist_preferences")
    .upsert({
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

  if (preferencesError) {
    return { ok: false, reason: "database" };
  }

  const { error: deleteStatusesError } = await supabase
    .from("waitlist_accepted_marital_statuses")
    .delete()
    .eq("application_id", application.id);

  if (deleteStatusesError) {
    return { ok: false, reason: "database" };
  }

  const { error: statusesError } = await supabase
    .from("waitlist_accepted_marital_statuses")
    .insert(
      value.acceptedMaritalStatuses.map((maritalStatus) => ({
        application_id: application.id,
        marital_status: maritalStatus,
      })),
    );

  if (statusesError) {
    return { ok: false, reason: "database" };
  }

  const { error: deleteCountriesError } = await supabase
    .from("waitlist_preferred_countries")
    .delete()
    .eq("application_id", application.id);

  if (deleteCountriesError) {
    return { ok: false, reason: "database" };
  }

  if (value.preferredCountries.length > 0) {
    const { error: countriesError } = await supabase
      .from("waitlist_preferred_countries")
      .insert(
        value.preferredCountries.map((countryCode) => ({
          application_id: application.id,
          country_code: countryCode,
        })),
      );

    if (countriesError) {
      return { ok: false, reason: "database" };
    }
  }

  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer") ?? "";
  const locale = referer.includes("/en/") ? "en" : "ar";

  if (wasSubmitted) {
    redirect(`/${locale}/waitlist/status?updated=questionnaire`);
  }

  redirect(`/${locale}/waitlist/consent`);
}
