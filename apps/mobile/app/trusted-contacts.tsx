import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  getMyIntroductionTrustedContactState,
  listMyMarriageTrustedContacts,
  removeMyMarriageTrustedContact,
  saveMyMarriageTrustedContact,
  shareMyTrustedContactForIntroduction,
  type IntroductionTrustedContactState,
  type MarriageTrustedContact,
  type TrustedContactRelationship,
} from "@/lib/trusted-contacts";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

const relationships: TrustedContactRelationship[] = [
  "father",
  "mother",
  "brother",
  "sister",
  "wali_guardian",
  "relative",
  "trusted_person",
  "other",
];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function TrustedContactsScreen() {
  const params = useLocalSearchParams<{ locale?: string; introductionId?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => trustedCopy(locale), [locale]);
  const introductionId = params.introductionId ?? "";
  const introductionMode = uuidPattern.test(introductionId);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [contacts, setContacts] = useState<MarriageTrustedContact[]>([]);
  const [handoff, setHandoff] = useState<IntroductionTrustedContactState | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [confirmShare, setConfirmShare] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<TrustedContactRelationship>("father");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const nextContacts = await listMyMarriageTrustedContacts();
      setContacts(nextContacts);
      setSelectedContactId((current) =>
        current && nextContacts.some((item) => item.contactId === current)
          ? current
          : nextContacts[0]?.contactId ?? null,
      );

      if (introductionMode) {
        try {
          setHandoff(await getMyIntroductionTrustedContactState(introductionId));
        } catch {
          setHandoff(null);
        }
      } else {
        setHandoff(null);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [introductionId, introductionMode, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setRelationship("father");
    setPhone("");
  }

  function edit(contact: MarriageTrustedContact) {
    setEditingId(contact.contactId);
    setName(contact.displayName);
    setRelationship(contact.relationship);
    setPhone(contact.phoneE164);
    setMessage(null);
  }

  async function save() {
    if (saving || !name.trim() || !phone.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const savedId = await saveMyMarriageTrustedContact({
        contactId: editingId,
        displayName: name.trim(),
        relationship,
        phoneE164: phone.trim(),
      });
      const nextContacts = await listMyMarriageTrustedContacts();
      setContacts(nextContacts);
      setSelectedContactId(savedId);
      resetForm();
      setMessage(copy.saved);
    } catch (error) {
      const text = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (text.includes("limit")) setMessage(copy.limitError);
      else if (text.includes("phone") || text.includes("international")) setMessage(copy.phoneError);
      else setMessage(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(contactId: string) {
    if (removingId) return;
    setRemovingId(contactId);
    setMessage(null);
    try {
      await removeMyMarriageTrustedContact(contactId);
      const nextContacts = contacts.filter((item) => item.contactId !== contactId);
      setContacts(nextContacts);
      if (selectedContactId === contactId) setSelectedContactId(nextContacts[0]?.contactId ?? null);
      if (editingId === contactId) resetForm();
      setMessage(copy.removed);
    } catch {
      setMessage(copy.removeError);
    } finally {
      setRemovingId(null);
    }
  }

  async function shareSelected() {
    if (!introductionMode || !selectedContactId || sharing || handoff?.myShared) return;
    if (!confirmShare) {
      setConfirmShare(true);
      setMessage(null);
      return;
    }

    setSharing(true);
    setMessage(null);
    try {
      await shareMyTrustedContactForIntroduction(introductionId, selectedContactId);
      setHandoff(await getMyIntroductionTrustedContactState(introductionId));
      setConfirmShare(false);
      setMessage(copy.shared);
    } catch {
      setMessage(copy.shareError);
    } finally {
      setSharing(false);
    }
  }

  const atLimit = contacts.length >= 3 && !editingId;
  const selectedContact = contacts.find((item) => item.contactId === selectedContactId) ?? null;

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={introductionMode ? copy.handoffTitle : copy.title}
      body={introductionMode ? copy.handoffBody : copy.body}
      rtl={rtl}
      footer={<PrimaryButton tone="quiet" onPress={() => router.back()}>{copy.back}</PrimaryButton>}
    >
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : loadError ? (
        <StateCard rtl={rtl} tone="error" title={copy.loadErrorTitle} body={copy.loadErrorBody} actionLabel={copy.retry} onAction={() => void load()} />
      ) : (
        <View style={styles.stack}>
          <View style={styles.promiseCard}>
            <Text style={[styles.promiseTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.promiseTitle}</Text>
            <Text style={[styles.promiseBody, { textAlign: rtl ? "right" : "left" }]}>{copy.promiseBody}</Text>
          </View>

          {introductionMode ? (
            handoff ? (
              <View style={styles.handoffCard}>
                <Text style={[styles.handoffSectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.handoffSectionTitle}</Text>
                <Text style={[styles.handoffSectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.handoffSectionBody}</Text>

                {handoff.otherShared && handoff.otherContactName && handoff.otherPhoneE164 ? (
                  <View style={styles.sharedContactCard}>
                    <Text style={[styles.sharedLabel, { textAlign: rtl ? "right" : "left" }]}>{copy.theirContact}</Text>
                    <Text style={[styles.sharedName, { textAlign: rtl ? "right" : "left" }]}>{handoff.otherContactName}</Text>
                    <Text style={[styles.sharedMeta, { textAlign: rtl ? "right" : "left" }]}>
                      {handoff.otherRelationship ? copy.relationship(handoff.otherRelationship) : copy.trustedPerson}
                    </Text>
                    <Text style={styles.sharedPhone}>{handoff.otherPhoneE164}</Text>
                    <Text style={[styles.sharedNote, { textAlign: rtl ? "right" : "left" }]}>{copy.theirContactNote}</Text>
                  </View>
                ) : (
                  <View style={styles.waitingContactCard}>
                    <Text style={[styles.waitingContactTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.noOtherContactTitle}</Text>
                    <Text style={[styles.waitingContactBody, { textAlign: rtl ? "right" : "left" }]}>{copy.noOtherContactBody}</Text>
                  </View>
                )}

                {handoff.myShared ? (
                  <View style={styles.mySharedCard}>
                    <Text style={[styles.mySharedTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.mySharedTitle}</Text>
                    <Text style={[styles.mySharedBody, { textAlign: rtl ? "right" : "left" }]}>
                      {copy.mySharedBody(handoff.myContactName ?? copy.trustedPerson)}
                    </Text>
                    <Text style={[styles.irreversibleNote, { textAlign: rtl ? "right" : "left" }]}>{copy.irreversible}</Text>
                  </View>
                ) : contacts.length > 0 ? (
                  <View style={styles.shareSection}>
                    <Text style={[styles.sharePickTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.chooseContact}</Text>
                    <View style={styles.pickList}>
                      {contacts.map((contact) => (
                        <Pressable
                          key={contact.contactId}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: selectedContactId === contact.contactId }}
                          onPress={() => {
                            setSelectedContactId(contact.contactId);
                            setConfirmShare(false);
                          }}
                          style={[
                            styles.pickCard,
                            selectedContactId === contact.contactId ? styles.pickCardSelected : null,
                          ]}
                        >
                          <View style={[styles.pickHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                            <View style={[styles.radio, selectedContactId === contact.contactId ? styles.radioSelected : null]}>
                              {selectedContactId === contact.contactId ? <View style={styles.radioDot} /> : null}
                            </View>
                            <View style={styles.flex}>
                              <Text style={[styles.pickName, { textAlign: rtl ? "right" : "left" }]}>{contact.displayName}</Text>
                              <Text style={[styles.pickMeta, { textAlign: rtl ? "right" : "left" }]}>{copy.relationship(contact.relationship)} · {contact.phoneE164}</Text>
                            </View>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                    {confirmShare && selectedContact ? (
                      <View style={styles.confirmCard}>
                        <Text style={[styles.confirmTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.confirmTitle}</Text>
                        <Text style={[styles.confirmBody, { textAlign: rtl ? "right" : "left" }]}>
                          {copy.confirmBody(selectedContact.displayName, selectedContact.phoneE164)}
                        </Text>
                        <Text style={[styles.irreversibleNote, { textAlign: rtl ? "right" : "left" }]}>{copy.irreversible}</Text>
                      </View>
                    ) : null}
                    <PrimaryButton loading={sharing} disabled={!selectedContactId} onPress={() => void shareSelected()}>
                      {confirmShare ? copy.confirmShare : copy.shareButton}
                    </PrimaryButton>
                    {confirmShare ? <PrimaryButton tone="quiet" disabled={sharing} onPress={() => setConfirmShare(false)}>{copy.cancel}</PrimaryButton> : null}
                    <Text style={[styles.photoRule, { textAlign: rtl ? "right" : "left" }]}>{copy.familyPhotoRule}</Text>
                  </View>
                ) : (
                  <Text style={[styles.needContact, { textAlign: rtl ? "right" : "left" }]}>{copy.needContact}</Text>
                )}
              </View>
            ) : (
              <StateCard rtl={rtl} tone="neutral" title={copy.handoffUnavailableTitle} body={copy.handoffUnavailableBody} />
            )
          ) : null}

          {contacts.length > 0 ? (
            <View style={styles.contactList}>
              {contacts.map((contact) => (
                <View key={contact.contactId} style={styles.contactCard}>
                  <View style={[styles.contactHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <View style={styles.contactInitial}><Text style={styles.contactInitialText}>{contact.displayName.trim().charAt(0) || "م"}</Text></View>
                    <View style={styles.flex}>
                      <Text style={[styles.contactName, { textAlign: rtl ? "right" : "left" }]}>{contact.displayName}</Text>
                      <Text style={[styles.contactMeta, { textAlign: rtl ? "right" : "left" }]}>{copy.relationship(contact.relationship)} · {contact.phoneE164}</Text>
                    </View>
                  </View>
                  <View style={[styles.contactActions, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <Pressable accessibilityRole="button" onPress={() => edit(contact)} style={({ pressed }) => [styles.smallButton, pressed ? styles.pressed : null]}><Text style={styles.smallButtonText}>{copy.edit}</Text></Pressable>
                    <Pressable accessibilityRole="button" disabled={removingId === contact.contactId} onPress={() => void remove(contact.contactId)} style={({ pressed }) => [styles.smallButton, pressed ? styles.pressed : null]}>
                      {removingId === contact.contactId ? <ActivityIndicator size="small" color={colors.danger} /> : <Text style={styles.removeText}>{copy.remove}</Text>}
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.emptyTitle}</Text>
              <Text style={[styles.emptyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.emptyBody}</Text>
            </View>
          )}

          <View style={styles.formCard}>
            <Text style={[styles.formTitle, { textAlign: rtl ? "right" : "left" }]}>{editingId ? copy.editTitle : copy.addTitle}</Text>
            <Text style={[styles.formBody, { textAlign: rtl ? "right" : "left" }]}>{copy.formBody}</Text>
            <TextInput value={name} onChangeText={setName} placeholder={copy.namePlaceholder} placeholderTextColor={colors.mutedSoft} maxLength={80} style={[styles.input, { textAlign: rtl ? "right" : "left" }]} />
            <View style={[styles.relationships, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              {relationships.map((item) => (
                <Pressable key={item} accessibilityRole="button" onPress={() => setRelationship(item)} style={[styles.relationshipChip, relationship === item ? styles.relationshipChipSelected : null]}>
                  <Text style={[styles.relationshipText, relationship === item ? styles.relationshipTextSelected : null]}>{copy.relationship(item)}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={phone} onChangeText={setPhone} placeholder="+218 91 000 0000" placeholderTextColor={colors.mutedSoft} keyboardType="phone-pad" autoCapitalize="none" style={[styles.input, { textAlign: "left", writingDirection: "ltr" }]} />
            <PrimaryButton loading={saving} disabled={atLimit || !name.trim() || !phone.trim()} onPress={() => void save()}>{editingId ? copy.saveChanges : copy.saveContact}</PrimaryButton>
            {editingId ? <PrimaryButton tone="quiet" disabled={saving} onPress={resetForm}>{copy.cancelEdit}</PrimaryButton> : null}
            {atLimit ? <Text style={[styles.helper, { textAlign: rtl ? "right" : "left" }]}>{copy.limitBody}</Text> : null}
          </View>

          <View style={styles.shareRuleCard}>
            <Text style={[styles.shareRuleTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.shareTitle}</Text>
            <Text style={[styles.shareRuleBody, { textAlign: rtl ? "right" : "left" }]}>{copy.shareBody}</Text>
          </View>

          {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { textAlign: rtl ? "right" : "left" }]}>{message}</Text> : null}
        </View>
      )}
    </ScreenShell>
  );
}

function trustedCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  const labels: Record<TrustedContactRelationship, string> = ar
    ? { father: "الأب", mother: "الأم", brother: "الأخ", sister: "الأخت", wali_guardian: "ولي / مسؤول موثوق", relative: "قريب", trusted_person: "شخص موثوق", other: "أخرى" }
    : { father: "Father", mother: "Mother", brother: "Brother", sister: "Sister", wali_guardian: "Wali / guardian", relative: "Relative", trusted_person: "Trusted person", other: "Other" };
  return {
    eyebrow: ar ? "دائرة الثقة" : "TRUSTED CIRCLE",
    title: ar ? "أشخاص تثق بهم" : "People you trust",
    body: ar ? "احفظ حتى ثلاثة أشخاص قد تختار إشراك أحدهم لاحقاً في تعارف جاد. الحفظ وحده لا يشارك أي شيء." : "Save up to three people you may choose to involve later in a serious introduction. Saving alone shares nothing.",
    handoffTitle: ar ? "إشراك شخص تثق به" : "Bring in someone you trust",
    handoffBody: ar ? "هذه الخطوة متاحة لأن القبول أصبح متبادلاً. المشاركة هنا مقصودة ومحصورة بهذا التعارف." : "This step is available because acceptance is mutual. Sharing here is deliberate and scoped to this introduction.",
    back: ar ? "رجوع" : "Back", retry: ar ? "إعادة المحاولة" : "Try again",
    loadErrorTitle: ar ? "تعذر تحميل دائرة الثقة" : "We couldn’t load your trusted contacts",
    loadErrorBody: ar ? "لم يتم تغيير أي شيء. تحقق من اتصالك وحاول مرة أخرى." : "Nothing was changed. Check your connection and try again.",
    promiseTitle: ar ? "الحفظ خاص" : "Saving is private",
    promiseBody: ar ? "لا يرسل ميثاق رسالة أو مكالمة لهذا الشخص، ولا يعرف أنه محفوظ هنا. لا يرى الطرف الآخر بياناته إلا إذا شاركتها أنت بعد قبول متبادل." : "Mithaq does not message or call this person, and they are not told they were saved here. The other member sees nothing unless you explicitly share a contact after mutual acceptance.",
    handoffSectionTitle: ar ? "تسليم عائلي اختياري" : "Optional family handoff",
    handoffSectionBody: ar ? "ليس مطلوباً أن يشارك الطرفان في نفس الوقت. كل طرف يقرر متى يكون مستعداً لإظهار جهة اتصال موثوقة." : "Both people do not have to share at the same time. Each person decides when they are ready to reveal a trusted contact.",
    theirContact: ar ? "جهة الاتصال التي شاركها الطرف الآخر" : "Trusted contact shared by the other member",
    theirContactNote: ar ? "شارك الطرف الآخر هذه البيانات عمداً لهذا التعارف. ميثاق لم يتواصل مع هذا الشخص نيابةً عنه." : "The other member deliberately shared these details for this introduction. Mithaq did not contact this person on their behalf.",
    noOtherContactTitle: ar ? "لم يشارك الطرف الآخر جهة اتصال بعد" : "The other member has not shared a contact yet",
    noOtherContactBody: ar ? "هذا لا يمنعك من مشاركة شخصك الموثوق إذا كنت مستعداً." : "That does not stop you from sharing your trusted contact when you are ready.",
    mySharedTitle: ar ? "تمت مشاركة جهة اتصالك" : "Your trusted contact is shared",
    mySharedBody: (name: string) => ar ? `يمكن للطرف الآخر الآن رؤية بيانات ${name} في هذا التعارف.` : `The other member can now see ${name}’s shared details in this introduction.`,
    chooseContact: ar ? "اختر شخصاً واحداً لهذا التعارف" : "Choose one contact for this introduction",
    confirmTitle: ar ? "تأكيد المشاركة" : "Confirm sharing",
    confirmBody: (name: string, phone: string) => ar ? `سيتمكن الطرف الآخر من رؤية اسم ${name} وصفته ورقم ${phone}. لن يرسل ميثاق رسالة لهذا الشخص.` : `The other member will be able to see ${name}’s name, relationship, and ${phone}. Mithaq will not message this person.`,
    irreversible: ar ? "بعد أن يرى الطرف الآخر هذه البيانات لا يمكن جعلها كأنها لم تُرَ. لذلك لا نوفر زر «تراجع» مضللاً." : "Once the other member has seen these details, they cannot be made unseen. Mithaq does not provide a misleading “undo” button.",
    shareButton: ar ? "مشاركة جهة الاتصال في هذا التعارف" : "Share contact in this introduction",
    confirmShare: ar ? "نعم، شارك هذه البيانات" : "Yes, share these details",
    cancel: ar ? "إلغاء" : "Cancel",
    familyPhotoRule: ar ? "إذا اخترت سابقاً أن تظهر صورتك «بعد إشراك العائلة»، فإن مشاركة جهة اتصالك هنا تعتبر بدء تلك المرحلة لصورتك أنت فقط." : "If your saved photo choice is “after family involvement,” sharing your own contact here starts that stage for your photo only.",
    needContact: ar ? "أضف شخصاً موثوقاً أدناه أولاً، ثم يمكنك اختياره لهذا التعارف." : "Add a trusted contact below first, then you can choose them for this introduction.",
    handoffUnavailableTitle: ar ? "التسليم العائلي غير متاح" : "Family handoff is unavailable",
    handoffUnavailableBody: ar ? "تتوفر المشاركة فقط داخل تعارف مقبول من الطرفين وما زال مؤهلاً وآمناً." : "Sharing is available only inside a mutually accepted introduction that remains eligible and safe.",
    emptyTitle: ar ? "لا يوجد شخص موثوق محفوظ بعد" : "No trusted contact saved yet",
    emptyBody: ar ? "يمكن أن يكون أباً أو أماً أو أخاً أو أختاً أو ولياً أو شخصاً تثق برأيه." : "This can be a parent, sibling, wali, guardian, relative, or another person whose judgment you trust.",
    edit: ar ? "تعديل" : "Edit", remove: ar ? "إزالة" : "Remove",
    addTitle: ar ? "إضافة شخص موثوق" : "Add a trusted contact", editTitle: ar ? "تعديل الشخص الموثوق" : "Edit trusted contact",
    formBody: ar ? "اكتب الاسم الذي ستتعرف به عليه والطريقة الصحيحة للتواصل معه." : "Use the name you would introduce them by and the correct number for reaching them.",
    namePlaceholder: ar ? "الاسم" : "Name", saveContact: ar ? "حفظ بشكل خاص" : "Save privately", saveChanges: ar ? "حفظ التعديلات" : "Save changes", cancelEdit: ar ? "إلغاء التعديل" : "Cancel editing",
    limitBody: ar ? "يمكن حفظ ثلاثة أشخاص كحد أقصى في هذه المرحلة." : "You can save up to three trusted contacts in this version.",
    shareTitle: ar ? "المشاركة قرار منفصل" : "Sharing is a separate decision",
    shareBody: ar ? "عند المشاركة نحفظ لقطة ثابتة من الاسم والصفة والرقم لذلك التعارف. تعديل الشخص المحفوظ لاحقاً لا يغير ما سبق أن شاركته." : "When you share, Mithaq keeps a fixed snapshot of the name, relationship, and number for that introduction. Editing the saved contact later does not silently change what you already shared.",
    saved: ar ? "تم حفظ الشخص الموثوق بشكل خاص." : "Trusted contact saved privately.", removed: ar ? "تمت إزالة الشخص من قائمتك الخاصة." : "The contact was removed from your private list.", shared: ar ? "تمت مشاركة جهة الاتصال لهذا التعارف." : "Trusted contact shared for this introduction.",
    phoneError: ar ? "اكتب رقم الهاتف بصيغة دولية تبدأ بعلامة +." : "Enter an international phone number beginning with +.", limitError: ar ? "وصلت إلى الحد الأقصى لثلاثة أشخاص." : "You already have the maximum of three trusted contacts.", saveError: ar ? "تعذر حفظ الشخص الآن. حاول مرة أخرى." : "We couldn’t save that contact right now. Try again.", removeError: ar ? "تعذر إزالة الشخص الآن. حاول مرة أخرى." : "We couldn’t remove that contact right now. Try again.", shareError: ar ? "تعذر مشاركة جهة الاتصال الآن. لم يتم كشف أي بيانات جديدة." : "We couldn’t share that contact. No new contact details were revealed.",
    trustedPerson: ar ? "شخص موثوق" : "Trusted person", relationship: (value: TrustedContactRelationship) => labels[value],
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, loading: { minHeight: 300, alignItems: "center", justifyContent: "center" }, stack: { width: "100%", gap: 14 },
  promiseCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 15 }, promiseTitle: { color: colors.primaryStrong, fontSize: 14, lineHeight: 22, fontWeight: "900" }, promiseBody: { color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 4 },
  handoffCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.goldSoft, backgroundColor: colors.surfaceRaised, padding: 16, gap: 12, ...shadows.card }, handoffSectionTitle: { color: colors.foreground, fontSize: 17, lineHeight: 26, fontWeight: "900" }, handoffSectionBody: { color: colors.muted, fontSize: 11, lineHeight: 19 },
  sharedContactCard: { borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 14 }, sharedLabel: { color: colors.primary, fontSize: 9, fontWeight: "900" }, sharedName: { color: colors.foreground, fontSize: 17, lineHeight: 25, fontWeight: "900", marginTop: 5 }, sharedMeta: { color: colors.muted, fontSize: 11, marginTop: 2 }, sharedPhone: { color: colors.primaryStrong, fontSize: 17, lineHeight: 25, fontWeight: "900", marginTop: 8, textAlign: "left", writingDirection: "ltr" }, sharedNote: { color: colors.muted, fontSize: 9, lineHeight: 16, marginTop: 7 },
  waitingContactCard: { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, padding: 13 }, waitingContactTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900" }, waitingContactBody: { color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 3 },
  mySharedCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 14 }, mySharedTitle: { color: colors.primaryStrong, fontSize: 13, fontWeight: "900" }, mySharedBody: { color: colors.foreground, fontSize: 11, lineHeight: 18, marginTop: 4 }, irreversibleNote: { color: colors.muted, fontSize: 9, lineHeight: 16, marginTop: 7 },
  shareSection: { gap: 9 }, sharePickTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900" }, pickList: { gap: 7 }, pickCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 12 }, pickCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash }, pickHeader: { alignItems: "center", gap: 10 }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" }, radioSelected: { borderColor: colors.primary }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }, pickName: { color: colors.foreground, fontSize: 12, fontWeight: "900" }, pickMeta: { color: colors.muted, fontSize: 9, lineHeight: 15, marginTop: 2 }, confirmCard: { borderRadius: radius.md, backgroundColor: colors.goldSoft, padding: 12 }, confirmTitle: { color: colors.foreground, fontSize: 12, fontWeight: "900" }, confirmBody: { color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 3 }, photoRule: { color: colors.muted, fontSize: 9, lineHeight: 16 }, needContact: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  contactList: { width: "100%", gap: 9 }, contactCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 14, ...shadows.card }, contactHeader: { alignItems: "center", gap: 11 }, contactInitial: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryWash }, contactInitialText: { color: colors.primaryStrong, fontSize: 18, fontWeight: "900" }, contactName: { color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: "900" }, contactMeta: { color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 2 }, contactActions: { justifyContent: "flex-end", gap: 8, marginTop: 10 }, smallButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: 10 }, smallButtonText: { color: colors.primary, fontSize: 11, fontWeight: "800" }, removeText: { color: colors.danger, fontSize: 11, fontWeight: "800" },
  emptyCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 16 }, emptyTitle: { color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "900" }, emptyBody: { color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 4 },
  formCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 16, gap: 11, ...shadows.card }, formTitle: { color: colors.foreground, fontSize: 16, lineHeight: 24, fontWeight: "900" }, formBody: { color: colors.muted, fontSize: 11, lineHeight: 18 }, input: { minHeight: 54, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, color: colors.foreground, paddingHorizontal: 13, fontSize: 14 }, relationships: { flexWrap: "wrap", gap: 7 }, relationshipChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 8 }, relationshipChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash }, relationshipText: { color: colors.muted, fontSize: 10, fontWeight: "800" }, relationshipTextSelected: { color: colors.primaryStrong }, helper: { color: colors.muted, fontSize: 10, lineHeight: 17 },
  shareRuleCard: { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, padding: 15 }, shareRuleTitle: { color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "900" }, shareRuleBody: { color: colors.muted, fontSize: 10, lineHeight: 18, marginTop: 4 }, message: { color: colors.primary, fontSize: 11, lineHeight: 18, fontWeight: "700" }, pressed: { opacity: 0.6 },
});
