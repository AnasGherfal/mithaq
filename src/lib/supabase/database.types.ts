export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Gender = "woman" | "man";
export type ResidencyType = "libya" | "diaspora";
export type MaritalStatus = "never_married" | "divorced" | "widowed" | "married";
export type MarriageTimeline =
  | "within_6_months"
  | "6_to_12_months"
  | "1_to_2_years"
  | "unsure";
export type PhotoPrivacyPreference =
  | "none"
  | "blurred"
  | "after_mutual_interest"
  | "explicit_approval"
  | "after_family_involvement"
  | "discovery_visible";
export type FamilyInvolvementPreference =
  | "early"
  | "after_initial_interest"
  | "later"
  | "unsure";
export type TristatePreference = "yes" | "no" | "depends";
export type WaitlistStatus =
  | "draft"
  | "submitted"
  | "qualified"
  | "invited"
  | "withdrawn"
  | "declined"
  | "deleted";
export type DeletionScope = "waitlist_data" | "entire_account";
export type DeletionStatus =
  | "requested"
  | "identity_confirmed"
  | "in_progress"
  | "completed"
  | "rejected";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      age_bands: {
        Row: {
          id: number;
          label: string;
          max_age: number | null;
          min_age: number;
          sort_order: number;
        };
        Insert: {
          id: number;
          label: string;
          max_age?: number | null;
          min_age: number;
          sort_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["age_bands"]["Insert"]>;
        Relationships: [];
      };
      deletion_requests: {
        Row: {
          id: string;
          user_id: string;
          request_scope: DeletionScope;
          status: DeletionStatus;
          requested_at: string;
          confirmed_at: string | null;
          due_at: string | null;
          completed_at: string | null;
          user_visible_note_code: string | null;
          processing_started_at: string | null;
          attempt_count: number;
          last_error_code: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          request_scope?: DeletionScope;
          status?: DeletionStatus;
          requested_at?: string;
          confirmed_at?: string | null;
          due_at?: string | null;
          completed_at?: string | null;
          user_visible_note_code?: string | null;
          processing_started_at?: string | null;
          attempt_count?: number;
          last_error_code?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["deletion_requests"]["Insert"]>;
        Relationships: [];
      };
      waitlist_applications: {
        Row: {
          id: string;
          user_id: string;
          status: WaitlistStatus;
          questionnaire_version: string;
          gender: Gender | null;
          age_band_id: number | null;
          residency_type: ResidencyType | null;
          current_country_code: string | null;
          current_city: string | null;
          libyan_origin_region: string | null;
          marital_status: MaritalStatus | null;
          has_children: boolean | null;
          libyan_self_attestation: boolean | null;
          started_at: string;
          questionnaire_completed_at: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: WaitlistStatus;
          questionnaire_version?: string;
          gender?: Gender | null;
          age_band_id?: number | null;
          residency_type?: ResidencyType | null;
          current_country_code?: string | null;
          current_city?: string | null;
          libyan_origin_region?: string | null;
          marital_status?: MaritalStatus | null;
          has_children?: boolean | null;
          libyan_self_attestation?: boolean | null;
          started_at?: string;
          questionnaire_completed_at?: string | null;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["waitlist_applications"]["Insert"]>;
        Relationships: [];
      };
      waitlist_preferences: {
        Row: {
          application_id: string;
          marriage_timeline: MarriageTimeline | null;
          willing_identity_verification: boolean | null;
          photo_privacy_preference: PhotoPrivacyPreference | null;
          family_involvement_preference: FamilyInvolvementPreference | null;
          relocation_willingness: TristatePreference | null;
          open_to_libya: boolean | null;
          open_to_diaspora: boolean | null;
          preferred_partner_age_min: number | null;
          preferred_partner_age_max: number | null;
          accepts_partner_with_children: TristatePreference | null;
          updated_at: string;
        };
        Insert: {
          application_id: string;
          marriage_timeline?: MarriageTimeline | null;
          willing_identity_verification?: boolean | null;
          photo_privacy_preference?: PhotoPrivacyPreference | null;
          family_involvement_preference?: FamilyInvolvementPreference | null;
          relocation_willingness?: TristatePreference | null;
          open_to_libya?: boolean | null;
          open_to_diaspora?: boolean | null;
          preferred_partner_age_min?: number | null;
          preferred_partner_age_max?: number | null;
          accepts_partner_with_children?: TristatePreference | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["waitlist_preferences"]["Insert"]>;
        Relationships: [];
      };
      waitlist_accepted_marital_statuses: {
        Row: {
          application_id: string;
          marital_status: MaritalStatus;
        };
        Insert: {
          application_id: string;
          marital_status: MaritalStatus;
        };
        Update: Partial<Database["public"]["Tables"]["waitlist_accepted_marital_statuses"]["Insert"]>;
        Relationships: [];
      };
      waitlist_preferred_countries: {
        Row: {
          application_id: string;
          country_code: string;
        };
        Insert: {
          application_id: string;
          country_code: string;
        };
        Update: Partial<Database["public"]["Tables"]["waitlist_preferred_countries"]["Insert"]>;
        Relationships: [];
      };
      referral_codes: {
        Row: {
          id: string;
          owner_user_id: string;
          code: string;
          status: string;
          max_uses: number | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          code: string;
          status?: string;
          max_uses?: number | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["referral_codes"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      save_my_waitlist: {
        Args: {
          p_gender: Gender;
          p_age_band_id: number;
          p_residency_type: ResidencyType;
          p_current_country_code: string;
          p_current_city: string;
          p_libyan_origin_region: string;
          p_marital_status: MaritalStatus;
          p_has_children: boolean;
          p_libyan_self_attestation: boolean;
          p_marriage_timeline: MarriageTimeline;
          p_willing_identity_verification: boolean;
          p_photo_privacy_preference: PhotoPrivacyPreference;
          p_family_involvement_preference: FamilyInvolvementPreference;
          p_relocation_willingness: TristatePreference;
          p_open_to_libya: boolean;
          p_open_to_diaspora: boolean;
          p_preferred_partner_age_min: number;
          p_preferred_partner_age_max: number;
          p_accepts_partner_with_children: TristatePreference;
          p_accepted_marital_statuses: MaritalStatus[];
          p_preferred_country_codes?: string[];
        };
        Returns: string;
      };
      finalize_waitlist: {
        Args: {
          p_locale: string;
          p_communications?: boolean;
        };
        Returns: string;
      };
      record_referral_open: {
        Args: {
          p_code: string;
          p_session_id: string;
        };
        Returns: boolean;
      };
      record_referral_milestone: {
        Args: {
          p_session_id: string;
          p_event_type: string;
        };
        Returns: boolean;
      };
      get_my_referral_conversion_count: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      request_account_deletion: {
        Args: {
          p_locale: string;
        };
        Returns: string;
      };
      get_admin_waitlist_analytics: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_my_moderation_access: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          moderation_role: string;
          can_review: boolean;
          can_enforce: boolean;
        }>;
      };
    };
    Enums: {
      gender: Gender;
      residency_type: ResidencyType;
      marital_status: MaritalStatus;
      marriage_timeline: MarriageTimeline;
      photo_privacy_preference: PhotoPrivacyPreference;
      family_involvement_preference: FamilyInvolvementPreference;
      tristate_preference: TristatePreference;
      waitlist_status: WaitlistStatus;
      deletion_scope: DeletionScope;
      deletion_status: DeletionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
