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
  listMyMarriageTrustedContacts,
  removeMyMarriageTrustedContact,
  saveMyMarriageTrustedContact,
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

export default function TrustedContactsScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => trustedCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [contacts, setContacts] = useState<MarriageTrustedContact[]>([]);
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
      setContacts(await listMyMarriageTrustedContacts());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

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
      await saveMyMarriageTrustedContact({
        contactId: editingId,
        displayName: name.trim(),
        relationship,
        phoneE164: phone.trim(),
      });
      setContacts(await listMyMarriageTrustedContacts());
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
      setContacts((current) => current.filter((item) => item.contactId !== contactId));
      if (editingId === contactId) resetForm();
      setMessage(copy.removed);
    } catch {
      setMessage(copy.removeError);
    } finally {
      setRemovingId(null);
    }
  }

  const atLimit = contacts.length >= 3 && !editingId;

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={
        <PrimaryButton tone="quiet" onPress={() => router.back()}>
          {copy.back}
        </PrimaryButton>
      }
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.loadErrorTitle}
          body={copy.loadErrorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.stack}>
          <View style={styles.promiseCard}>
            <Text style={[styles.promiseTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.promiseTitle}</Text>
            <Text style={[styles.promiseBody, { textAlign: rtl ? "right" : "left" }]}>{copy.promiseBody}</Text>
          </View>

          {contacts.length > 0 ? (
            <View style={styles.contactList}>
              {contacts.map((contact) => (
                <View key={contact.contactId} style={styles.contactCard}>
                  <View style={[styles.contactHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <View style={styles.contactInitial}>
                      <Text style={styles.contactInitialText}>{contact.displayName.trim().charAt(0) || "م"}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.contactName, { textAlign: rtl ? "right" : "left" }]}>{contact.displayName}</Text>
                      <Text style={[styles.contactMeta, { textAlign: rtl ? "right" : "left" }]}>
                        {copy.relationship(contact.relationship)} · {contact.phoneE164}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.contactActions, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => edit(contact)}
                      style={({ pressed }) => [styles.smallButton, pressed ? styles.pressed : null]}
                    >
                      <Text style={styles.smallButtonText}>{copy.edit}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={removingId === contact.contactId}
                      onPress={() => void remove(contact.contactId)}
                      style={({ pressed }) => [styles.smallButton, pressed ? styles.pressed : null]}
                    >
                      {removingId === contact.contactId ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Text style={styles.removeText}>{copy.remove}</Text>
                      )}
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
            <Text style={[styles.formTitle, { textAlign: rtl ? "right" : "left" }]}>
              {editingId ? copy.editTitle : copy.addTitle}
            </Text>
            <Text style={[styles.formBody, { textAlign: rtl ? "right" : "left" }]}>{copy.formBody}</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={copy.namePlaceholder}
              placeholderTextColor={colors.mutedSoft}
              maxLength={80}
              style={[styles.input, { textAlign: rtl ? "right" : "left" }]}
            />

            <View style={[styles.relationships, { flexDirection: rtl ? "row-reverse" : "row" }]}>
              {relationships.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setRelationship(item)}
                  style={[
                    styles.relationshipChip,
                    relationship === item ? styles.relationshipChipSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.relationshipText,
                      relationship === item ? styles.relationshipTextSelected : null,
                    ]}
                  >
                    {copy.relationship(item)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+218 91 000 0000"
              placeholderTextColor={colors.mutedSoft}
              keyboardType="phone-pad"
              autoCapitalize="none"
              style={[styles.input, { textAlign: "left", writingDirection: "ltr" }]}
            />

            <PrimaryButton
              loading={saving}
              disabled={atLimit || !name.trim() || !phone.trim()}
              onPress={() => void save()}
            >
              {editingId ? copy.saveChanges : copy.saveContact}
            </PrimaryButton>
            {editingId ? (
              <PrimaryButton tone="quiet" disabled={saving} onPress={resetForm}>
                {copy.cancelEdit}
              </PrimaryButton>
            ) : null}
            {atLimit ? (
              <Text style={[styles.helper, { textAlign: rtl ? "right" : "left" }]}>{copy.limitBody}</Text>
            ) : null}
          </View>

          <View style={styles.shareRuleCard}>
            <Text style={[styles.shareRuleTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.shareTitle}</Text>
            <Text style={[styles.shareRuleBody, { textAlign: rtl ? "right" : "left" }]}>{copy.shareBody}</Text>
          </View>

          {message ? (
            <Text accessibilityLiveRegion="polite" style={[styles.message, { textAlign: rtl ? "right" : "left" }]}>
              {message}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function trustedCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  const relationshipLabels: Record<TrustedContactRelationship, string> = ar
    ? {
        father: "الأب",
        mother: "الأم",
        brother: "الأخ",
        sister: "الأخت",
        wali_guardian: "ولي / مسؤول موثوق",
        relative: "قريب",
        trusted_person: "شخص موثوق",
        other: "أخرى",
      }
    : {
        father: "Father",
        mother: "Mother",
        brother: "Brother",
        sister: "Sister",
        wali_guardian: "Wali / guardian",
        relative: "Relative",
        trusted_person: "Trusted person",
        other: "Other",
      };

  return {
    eyebrow: ar ? "دائرة الثقة" : "TRUSTED CIRCLE",
    title: ar ? "أشخاص تثق بهم" : "People you trust",
    body: ar
      ? "احفظ حتى ثلاثة أشخاص قد تختار إشراك أحدهم لاحقاً في تعارف جاد. الحفظ وحده لا يشارك أي شيء."
      : "Save up to three people you may choose to involve later in a serious introduction. Saving alone shares nothing.",
    back: ar ? "رجوع" : "Back",
    retry: ar ? "إعادة المحاولة" : "Try again",
    loadErrorTitle: ar ? "تعذر تحميل دائرة الثقة" : "We couldn’t load your trusted contacts",
    loadErrorBody: ar ? "لم يتم تغيير أي شيء. تحقق من اتصالك وحاول مرة أخرى." : "Nothing was changed. Check your connection and try again.",
    promiseTitle: ar ? "الحفظ خاص" : "Saving is private",
    promiseBody: ar
      ? "لا يرسل ميثاق رسالة أو مكالمة لهذا الشخص، ولا يعرف أنه محفوظ هنا. لا يرى الطرف الآخر بياناته إلا إذا شاركتها أنت بعد قبول متبادل."
      : "Mithaq does not message or call this person, and they are not told they were saved here. The other member sees nothing unless you explicitly share a contact after mutual acceptance.",
    emptyTitle: ar ? "لا يوجد شخص موثوق محفوظ بعد" : "No trusted contact saved yet",
    emptyBody: ar ? "يمكن أن يكون أباً أو أماً أو أخاً أو أختاً أو ولياً أو شخصاً تثق برأيه." : "This can be a parent, sibling, wali, guardian, relative, or another person whose judgment you trust.",
    edit: ar ? "تعديل" : "Edit",
    remove: ar ? "إزالة" : "Remove",
    addTitle: ar ? "إضافة شخص موثوق" : "Add a trusted contact",
    editTitle: ar ? "تعديل الشخص الموثوق" : "Edit trusted contact",
    formBody: ar ? "اكتب الاسم الذي ستتعرف به عليه والطريقة الصحيحة للتواصل معه." : "Use the name you would introduce them by and the correct number for reaching them.",
    namePlaceholder: ar ? "الاسم" : "Name",
    saveContact: ar ? "حفظ بشكل خاص" : "Save privately",
    saveChanges: ar ? "حفظ التعديلات" : "Save changes",
    cancelEdit: ar ? "إلغاء التعديل" : "Cancel editing",
    limitBody: ar ? "يمكن حفظ ثلاثة أشخاص كحد أقصى في هذه المرحلة." : "You can save up to three trusted contacts in this version.",
    shareTitle: ar ? "المشاركة قرار منفصل" : "Sharing is a separate decision",
    shareBody: ar
      ? "بعد قبول تعارف من الطرفين يمكنك اختيار شخص واحد ومشاركة لقطة ثابتة من اسمه وصفته ورقمه داخل ذلك التعارف فقط. تعديل هذا السجل لاحقاً لا يغير ما تمت مشاركته سابقاً."
      : "After an introduction is mutually accepted, you can choose one contact and share a fixed snapshot of their name, relationship, and phone number in that introduction only. Editing this saved contact later does not change what was already shared.",
    saved: ar ? "تم حفظ الشخص الموثوق بشكل خاص." : "Trusted contact saved privately.",
    removed: ar ? "تمت إزالة الشخص من قائمتك الخاصة." : "The contact was removed from your private list.",
    phoneError: ar ? "اكتب رقم الهاتف بصيغة دولية تبدأ بعلامة +." : "Enter an international phone number beginning with +.",
    limitError: ar ? "وصلت إلى الحد الأقصى لثلاثة أشخاص." : "You already have the maximum of three trusted contacts.",
    saveError: ar ? "تعذر حفظ الشخص الآن. حاول مرة أخرى." : "We couldn’t save that contact right now. Try again.",
    removeError: ar ? "تعذر إزالة الشخص الآن. حاول مرة أخرى." : "We couldn’t remove that contact right now. Try again.",
    relationship: (value: TrustedContactRelationship) => relationshipLabels[value],
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { minHeight: 300, alignItems: "center", justifyContent: "center" },
  stack: { width: "100%", gap: 14 },
  promiseCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 15 },
  promiseTitle: { color: colors.primaryStrong, fontSize: 14, lineHeight: 22, fontWeight: "900" },
  promiseBody: { color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 4 },
  contactList: { width: "100%", gap: 9 },
  contactCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 14, ...shadows.card },
  contactHeader: { alignItems: "center", gap: 11 },
  contactInitial: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryWash },
  contactInitialText: { color: colors.primaryStrong, fontSize: 18, fontWeight: "900" },
  contactName: { color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: "900" },
  contactMeta: { color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 2 },
  contactActions: { justifyContent: "flex-end", gap: 8, marginTop: 10 },
  smallButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: 10 },
  smallButtonText: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  removeText: { color: colors.danger, fontSize: 11, fontWeight: "800" },
  emptyCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 16 },
  emptyTitle: { color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "900" },
  emptyBody: { color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 4 },
  formCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 16, gap: 11, ...shadows.card },
  formTitle: { color: colors.foreground, fontSize: 16, lineHeight: 24, fontWeight: "900" },
  formBody: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  input: { minHeight: 54, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, color: colors.foreground, paddingHorizontal: 13, fontSize: 14 },
  relationships: { flexWrap: "wrap", gap: 7 },
  relationshipChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 8 },
  relationshipChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  relationshipText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  relationshipTextSelected: { color: colors.primaryStrong },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 17 },
  shareRuleCard: { borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, padding: 15 },
  shareRuleTitle: { color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "900" },
  shareRuleBody: { color: colors.muted, fontSize: 10, lineHeight: 18, marginTop: 4 },
  message: { color: colors.primary, fontSize: 11, lineHeight: 18, fontWeight: "700" },
  pressed: { opacity: 0.6 },
});
