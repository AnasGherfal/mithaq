import { z } from "zod";

export const waitlistQuestionnaireSchema = z
  .object({
    gender: z.enum(["woman", "man"]),
    ageBandId: z.number().int().min(1).max(8),
    residencyType: z.enum(["libya", "diaspora"]),
    currentCountryCode: z.string().regex(/^[A-Z]{2}$/),
    currentCity: z.string().trim().min(1).max(100),
    libyanOriginRegion: z.string().trim().max(100).optional(),
    maritalStatus: z.enum(["never_married", "divorced", "widowed"]),
    hasChildren: z.boolean(),
    libyanSelfAttestation: z.boolean(),
    marriageTimeline: z.enum([
      "within_6_months",
      "6_to_12_months",
      "1_to_2_years",
      "unsure",
    ]),
    preferredPartnerAgeMin: z.number().int().min(18).max(100),
    preferredPartnerAgeMax: z.number().int().min(18).max(100),
    acceptedMaritalStatuses: z
      .array(z.enum(["never_married", "divorced", "widowed"]))
      .min(1),
    acceptsPartnerWithChildren: z.enum(["yes", "no", "depends"]),
    openToLibya: z.boolean(),
    openToDiaspora: z.boolean(),
    relocationWillingness: z.enum(["yes", "no", "depends"]),
    preferredCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(20),
    willingIdentityVerification: z.boolean(),
    photoPrivacyPreference: z.enum([
      "none",
      "blurred",
      "after_mutual_interest",
      "explicit_approval",
      "after_family_involvement",
    ]),
    familyInvolvementPreference: z.enum([
      "early",
      "after_initial_interest",
      "later",
      "unsure",
    ]),
  })
  .superRefine((value, context) => {
    if (!value.libyanSelfAttestation) {
      context.addIssue({
        code: "custom",
        path: ["libyanSelfAttestation"],
        message: "Libyan origin self-attestation is required.",
      });
    }

    if (value.preferredPartnerAgeMax < value.preferredPartnerAgeMin) {
      context.addIssue({
        code: "custom",
        path: ["preferredPartnerAgeMax"],
        message: "Maximum preferred age must be at least the minimum preferred age.",
      });
    }

    if (!value.openToLibya && !value.openToDiaspora) {
      context.addIssue({
        code: "custom",
        path: ["openToLibya"],
        message: "At least one location preference is required.",
      });
    }
  });

export type WaitlistQuestionnaireInput = z.infer<
  typeof waitlistQuestionnaireSchema
>;
