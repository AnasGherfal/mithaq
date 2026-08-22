import { supabase } from "@/lib/supabase";

export type TrustedContactRelationship =
  | "father"
  | "mother"
  | "brother"
  | "sister"
  | "wali_guardian"
  | "relative"
  | "trusted_person"
  | "other";

export type MarriageTrustedContact = {
  contactId: string;
  displayName: string;
  relationship: TrustedContactRelationship;
  phoneE164: string;
  createdAt: string;
  updatedAt: string;
};

export type IntroductionTrustedContactState = {
  myShared: boolean;
  myContactName: string | null;
  myRelationship: TrustedContactRelationship | null;
  myPhoneE164: string | null;
  mySharedAt: string | null;
  otherShared: boolean;
  otherContactName: string | null;
  otherRelationship: TrustedContactRelationship | null;
  otherPhoneE164: string | null;
  otherSharedAt: string | null;
};

type TrustedContactRow = {
  contact_id: string;
  display_name: string;
  relationship: TrustedContactRelationship;
  phone_e164: string;
  created_at: string;
  updated_at: string;
};

type HandoffStateRow = {
  my_shared: boolean | null;
  my_contact_name: string | null;
  my_relationship: TrustedContactRelationship | null;
  my_phone_e164: string | null;
  my_shared_at: string | null;
  other_shared: boolean | null;
  other_contact_name: string | null;
  other_relationship: TrustedContactRelationship | null;
  other_phone_e164: string | null;
  other_shared_at: string | null;
};

export async function listMyMarriageTrustedContacts(): Promise<MarriageTrustedContact[]> {
  const { data, error } = await supabase.rpc("list_my_marriage_trusted_contacts");
  if (error) throw error;

  return ((data ?? []) as TrustedContactRow[]).map((row) => ({
    contactId: row.contact_id,
    displayName: row.display_name,
    relationship: row.relationship,
    phoneE164: row.phone_e164,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function saveMyMarriageTrustedContact(input: {
  contactId?: string | null;
  displayName: string;
  relationship: TrustedContactRelationship;
  phoneE164: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("save_my_marriage_trusted_contact", {
    p_contact_id: input.contactId ?? null,
    p_display_name: input.displayName,
    p_relationship: input.relationship,
    p_phone_e164: input.phoneE164,
  });
  if (error) throw error;
  if (typeof data !== "string") throw new Error("Trusted contact could not be saved");
  return data;
}

export async function removeMyMarriageTrustedContact(contactId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("remove_my_marriage_trusted_contact", {
    p_contact_id: contactId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function getMyIntroductionTrustedContactState(
  introductionId: string,
): Promise<IntroductionTrustedContactState> {
  const { data, error } = await supabase.rpc("get_my_introduction_trusted_contact_state", {
    p_introduction_id: introductionId,
  });
  if (error) throw error;

  const row = ((Array.isArray(data) ? data[0] : data) ?? null) as HandoffStateRow | null;
  return {
    myShared: Boolean(row?.my_shared),
    myContactName: row?.my_contact_name ?? null,
    myRelationship: row?.my_relationship ?? null,
    myPhoneE164: row?.my_phone_e164 ?? null,
    mySharedAt: row?.my_shared_at ?? null,
    otherShared: Boolean(row?.other_shared),
    otherContactName: row?.other_contact_name ?? null,
    otherRelationship: row?.other_relationship ?? null,
    otherPhoneE164: row?.other_phone_e164 ?? null,
    otherSharedAt: row?.other_shared_at ?? null,
  };
}

export async function shareMyTrustedContactForIntroduction(
  introductionId: string,
  contactId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("share_my_trusted_contact_for_introduction", {
    p_introduction_id: introductionId,
    p_contact_id: contactId,
  });
  if (error) throw error;
  return Boolean(data);
}
