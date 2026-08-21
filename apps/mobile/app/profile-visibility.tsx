import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  addMarriageFamilyShield,
  listMarriageFamilyShield,
  removeMarriageFamilyShield,
  type MarriageFamilyShieldEntry,
} from "@/lib/marriage-family-shield";
import { getMyIdentityTrustSummary, type IdentityTrustSummary } from "@/lib/marriage-privacy";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type DisclosurePreferences = {
  share_occupation: boolean;
  share_education: boolean;
  share_origin_region: boolean;
};

const defaultPreferences: DisclosurePreferences = {
  share_occupation: false,
  share_education: false,
  share_origin_region: false,
};

const emptyTrust: IdentityTrustSummary = {
  phoneVerified: false,
  approvedPhoto: false,
  realPersonVerified: false,
  age18PlusVerified: false,
  identityVerified: false,
};

export default function ProfileVisibilityScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => visibilityCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shieldSaving, setShieldSaving] = useState(false);
  const [preferences, setPreferences] = useState<DisclosurePreferences>(defaultPreferences);
  const [savedPreferences, setSavedPreferences] = useState<DisclosurePreferences>(defaultPreferences);
  const [trust, setTrust] = useState<IdentityTrustSummary>(emptyTrust);
  const [shield, setShield] = useState<MarriageFamilyShieldEntry[]>([]);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setMessage(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const userId = sessionData.session.user.id;
      const [profileResult, trustResult, shieldResult] = await Promise.all([
        supabase
          .from("member_profiles")
          .select("share_occupation, share_education, share_origin_region")
          .eq("user_id", userId)
          .maybeSingle(),
        getMyIdentityTrustSummary(),
        listMarriageFamilyShield(),
      ]);

      if (profileResult.error) throw profileResult.error;
      const nextPreferences: DisclosurePreferences = {
        share_occupation: Boolean(profileResult.data?.share_occupation),
        share_education: Boolean(profileResult.data?.share_education),
        share_origin_region: Boolean(profileResult.data?.share_origin_region),
      };
      setPreferences(nextPreferences);
      setSavedPreferences(nextPreferences);
      setTrust(trustResult);
      setShield(shieldResult);
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty =
    preferences.share_occupation !== savedPreferences.share_occupation ||
    preferences.share_education !== savedPreferences.share_education ||
    preferences.share_origin_region !== savedPreferences.share_origin_region;

  async function saveDisclosure() {
    if (!dirty || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.rpc("set_profile_disclosure_preferences", {
        p_share_occupation: preferences.share_occupation,
        p_share_education: preferences.share_education,
        p_share_origin_region: preferences.share_origin_region,
      });
      if (error) throw error;
      setSavedPreferences(preferences);
      setMessage(copy.saved);
    } catch {
      setMessage(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function addShield() {
    if (shieldSaving || !phone.trim()) return;
    setShieldSaving(true);
    setMessage(null);
    try {
      await addMarriageFamilyShield(phone.trim());
      setPhone("");
      setShield(await listMarriageFamilyShield());
      setMessage(copy.shieldAdded);
    } catch (error) {
      const text = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      setMessage(text.includes("phone") ? copy.phoneError : copy.shieldError);
    } finally {
      setShieldSaving(false);
    }
  }

  async function removeShield(entry: MarriageFamilyShieldEntry) {
    if (shieldSaving) return;
    setShieldSaving(true);
    setMessage(null);
    try {
      await removeMarriageFamilyShield(entry.exclusionId);
      setShield((current) => current.filter((item) => item.exclusionId !== entry.exclusionId));
      setMessage(copy.shieldRemoved);
    } catch {
      setMessage(copy.shieldError);
    } finally {
      setShieldSaving(false);
    }
  }

  return (
    <ScreenShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      footer={<PrimaryButton tone="quiet" onPress={() => router.back()}>{copy.back}</PrimaryButton>}
    >
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : loadError ? (
        <StateCard rtl={rtl} tone="error" title={copy.loadErrorTitle} body={copy.loadErrorBody} actionLabel={copy.retry} onAction={() => void load()} />
      ) : (
        <View style={styles.stack}>
          <View style={styles.privateCard}>
            <Text style={[styles.privateTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.privateTitle}</Text>
            <Text style={[styles.privateBody, { textAlign: rtl ? "right" : "left" }]}>{copy.privateBody}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.shieldTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.shieldBody}</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={copy.phonePlaceholder}
              placeholderTextColor={colors.mutedSoft}
              keyboardType="phone-pad"
              autoCapitalize="none"
              style={[styles.input, { textAlign: rtl ? "right" : "left", writingDirection: "ltr" }]}
            />
            <PrimaryButton loading={shieldSaving} disabled={!phone.trim()} onPress={() => void addShield()}>{copy.addShield}</PrimaryButton>
            {shield.length > 0 ? (
              <View style={styles.shieldList}>
                {shield.map((entry) => (
                  <View key={entry.exclusionId} style={[styles.shieldRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <View style={styles.flex}>
                      <Text style={[styles.shieldPhone, { textAlign: rtl ? "right" : "left" }]}>{entry.maskedPhone}</Text>
                      <Text style={[styles.shieldMeta, { textAlign: rtl ? "right" : "left" }]}>{copy.shieldRowBody}</Text>
                    </View>
                    <Pressable accessibilityRole="button" disabled={shieldSaving} onPress={() => void removeShield(entry)} style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null]}>
                      <Text style={styles.removeText}>{copy.remove}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { textAlign: rtl ? "right" : "left" }]}>{copy.shieldEmpty}</Text>
            )}
            <Text style={[styles.helper, { textAlign: rtl ? "right" : "left" }]}>{copy.shieldPrivacy}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.detailsTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.detailsBody}</Text>
            <DisclosureToggle rtl={rtl} label={copy.occupationTitle} body={copy.occupationBody} value={preferences.share_occupation} onChange={(value) => setPreferences((current) => ({ ...current, share_occupation: value }))} />
            <View style={styles.rule} />
            <DisclosureToggle rtl={rtl} label={copy.educationTitle} body={copy.educationBody} value={preferences.share_education} onChange={(value) => setPreferences((current) => ({ ...current, share_education: value }))} />
            <View style={styles.rule} />
            <DisclosureToggle rtl={rtl} label={copy.originTitle} body={copy.originBody} value={preferences.share_origin_region} onChange={(value) => setPreferences((current) => ({ ...current, share_origin_region: value }))} />
            <PrimaryButton disabled={!dirty} loading={saving} onPress={() => void saveDisclosure()}>{dirty ? copy.save : copy.savedState}</PrimaryButton>
          </View>

          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.trustTitle}</Text>
            <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left" }]}>{copy.trustBody}</Text>
            <TrustRow rtl={rtl} label={copy.phoneVerified} value={trust.phoneVerified} />
            <TrustRow rtl={rtl} label={copy.photoReviewed} value={trust.approvedPhoto} optional />
            <TrustRow rtl={rtl} label={copy.realPerson} value={trust.realPersonVerified} optional />
            <TrustRow rtl={rtl} label={copy.ageVerified} value={trust.age18PlusVerified} optional />
            <TrustRow rtl={rtl} label={copy.identityVerified} value={trust.identityVerified} optional />
            <Text style={[styles.helper, { textAlign: rtl ? "right" : "left" }]}>{copy.trustNote}</Text>
          </View>

          {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { textAlign: rtl ? "right" : "left" }]}>{message}</Text> : null}
        </View>
      )}
    </ScreenShell>
  );
}

function DisclosureToggle({ rtl, label, body, value, onChange }: { rtl: boolean; label: string; body: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={[styles.toggleRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.flex}>
        <Text style={[styles.toggleTitle, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
        <Text style={[styles.toggleBody, { textAlign: rtl ? "right" : "left" }]}>{body}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.borderStrong, true: colors.primarySoft }} thumbColor={value ? colors.primary : colors.surfaceRaised} />
    </View>
  );
}

function TrustRow({ rtl, label, value, optional = false }: { rtl: boolean; label: string; value: boolean; optional?: boolean }) {
  const state = value
    ? rtl ? "تم التحقق" : "Verified"
    : optional
      ? rtl ? "اختياري · غير متحقق" : "Optional · not verified"
      : rtl ? "غير متحقق" : "Not verified";
  return (
    <View style={[styles.trustRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <Text style={[styles.trustLabel, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
      <Text style={[styles.trustValue, value ? styles.trustValueOn : null]}>{state}</Text>
    </View>
  );
}

function visibilityCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "خصوصية الزواج" : "MARRIAGE PRIVACY",
    title: ar ? "الخصوصية قبل الظهور" : "Privacy before visibility",
    body: ar ? "الاكتشاف يبدأ بدون اسم أو صورة أو تفاصيل تعريفية. أنت تقرر ما يُكشف لاحقاً." : "Discover starts without your name, photo, or identifying details. You decide what can be revealed later.",
    back: ar ? "رجوع" : "Back",
    retry: ar ? "إعادة المحاولة" : "Try again",
    loadErrorTitle: ar ? "تعذر تحميل إعدادات الخصوصية" : "We couldn’t load your privacy settings",
    loadErrorBody: ar ? "لم نغيّر أي إعداد. تحقق من الاتصال ثم حاول مرة أخرى." : "No setting was changed. Check your connection and try again.",
    privateTitle: ar ? "الاكتشاف مجهول افتراضياً" : "Discover is anonymous by default",
    privateBody: ar ? "قبل التعارف المتحكم به لا نعرض اسمك أو صورتك أو عملك أو تعليمك. يظهر فقط سياق عام يساعد على التوافق." : "Before a controlled introduction, Mithaq does not show your name, photo, work, or education. Only broad context used for fit is shown.",
    shieldTitle: ar ? "درع العائلة والمعارف" : "Family & people shield",
    shieldBody: ar ? "أضف رقم شخص لا تريد أن تظهر له أو يظهر لك. إذا كان يستخدم ميثاق الآن أو انضم لاحقاً، لن تُعرضا لبعضكما. لا نخبره أنك أضفته." : "Add someone you never want to be shown to or shown. If they use Mithaq now or join later, neither of you appears to the other. We never tell them you added them.",
    phonePlaceholder: ar ? "+218 91 000 0000" : "+218 91 000 0000",
    addShield: ar ? "إضافة إلى الدرع" : "Add to shield",
    remove: ar ? "إزالة" : "Remove",
    shieldRowBody: ar ? "لا يظهر أي منكما للآخر" : "Neither of you appears to the other",
    shieldEmpty: ar ? "لم تضف أي أرقام بعد." : "You haven’t added any numbers yet.",
    shieldPrivacy: ar ? "نحفظ بصمة مشفرة للرقم، وليس الرقم الكامل في قائمة الدرع، ولا نكشف إن كان صاحب الرقم عضواً في ميثاق." : "The shield stores a protected fingerprint rather than the full phone number, and never reveals whether that number belongs to a Mithaq member.",
    shieldAdded: ar ? "تمت إضافة الرقم إلى درع الخصوصية." : "The number was added to your privacy shield.",
    shieldRemoved: ar ? "تمت إزالة الرقم من الدرع." : "The number was removed from your shield.",
    shieldError: ar ? "تعذر تحديث الدرع الآن. حاول مرة أخرى." : "We couldn’t update the shield right now. Try again.",
    phoneError: ar ? "اكتب الرقم بصيغة دولية صحيحة تبدأ بعلامة +." : "Enter a valid international phone number beginning with +.",
    detailsTitle: ar ? "ما قد يظهر بعد التعارف" : "What may appear after an introduction",
    detailsBody: ar ? "هذه التفاصيل لا تظهر في الاكتشاف المجهول. تحدد فقط ما يمكن مشاركته لاحقاً داخل تعارف مصرح به." : "These details never appear in anonymous Discover. They only control what may be shared later inside an authorized introduction.",
    occupationTitle: ar ? "السماح بإظهار العمل لاحقاً" : "Allow occupation later",
    occupationBody: ar ? "يمكن إظهار وصف العمل بعد الانتقال إلى تعارف خاص." : "Your occupation description may be shown after moving into a private introduction.",
    educationTitle: ar ? "السماح بإظهار التعليم لاحقاً" : "Allow education later",
    educationBody: ar ? "يمكن إظهار وصف التعليم بعد الانتقال إلى تعارف خاص." : "Your education description may be shown after moving into a private introduction.",
    originTitle: ar ? "السماح بإظهار المنطقة الأصلية لاحقاً" : "Allow origin region later",
    originBody: ar ? "يمكن إظهار المنطقة الليبية الأصلية بعد الانتقال إلى تعارف خاص." : "Your Libyan origin region may be shown after moving into a private introduction.",
    save: ar ? "حفظ اختيارات الظهور" : "Save visibility choices",
    savedState: ar ? "الاختيارات محفوظة" : "Choices saved",
    saved: ar ? "تم حفظ اختياراتك." : "Your choices are saved.",
    saveError: ar ? "تعذر حفظ الاختيارات الآن. حاول مرة أخرى." : "We couldn’t save those choices right now. Try again.",
    trustTitle: ar ? "ما الذي تحقق منه ميثاق فعلاً؟" : "What has Mithaq actually verified?",
    trustBody: ar ? "لا نضع شارة تحقق على معلومة لم نثبتها. الصور والتحقق الإضافي اختياريان في الإطلاق الأول." : "Mithaq never labels something verified unless it has actually been checked. Photos and additional identity checks are optional at initial launch.",
    phoneVerified: ar ? "رقم الهاتف" : "Phone number",
    photoReviewed: ar ? "صورة تمت مراجعتها" : "Reviewed photo",
    realPerson: ar ? "مطابقة شخص حقيقي" : "Real-person match",
    ageVerified: ar ? "تحقق إضافي من 18+" : "Additional 18+ verification",
    identityVerified: ar ? "تحقق الهوية" : "Identity verification",
    trustNote: ar ? "الحالة الاجتماعية والأطفال وتفاصيل الحياة تبقى معلومات يصرح بها العضو بنفسه ما لم نملك لاحقاً طريقة موثوقة للتحقق منها." : "Marital status, children, and life details remain member-declared unless Mithaq later has a legitimate way to verify them.",
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingState: { minHeight: 260, alignItems: "center", justifyContent: "center" },
  stack: { width: "100%", gap: 16 },
  privateCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primarySoft, backgroundColor: colors.primaryWash, padding: 16 },
  privateTitle: { color: colors.primaryStrong, fontSize: 15, lineHeight: 23, fontWeight: "900" },
  privateBody: { color: colors.foreground, fontSize: 12, lineHeight: 20, marginTop: 5 },
  sectionCard: { width: "100%", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 16, gap: 12 },
  sectionTitle: { color: colors.foreground, fontSize: 15, lineHeight: 23, fontWeight: "900" },
  sectionBody: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  input: { minHeight: 54, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.foreground, paddingHorizontal: 13, fontSize: 14 },
  shieldList: { width: "100%", gap: 8 },
  shieldRow: { width: "100%", alignItems: "center", gap: 12, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 12 },
  shieldPhone: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
  shieldMeta: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 2 },
  removeButton: { minHeight: 36, justifyContent: "center", paddingHorizontal: 10 },
  removeText: { color: colors.danger, fontSize: 11, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 17 },
  toggleRow: { width: "100%", alignItems: "center", gap: 14, paddingVertical: 4 },
  toggleTitle: { color: colors.foreground, fontSize: 13, fontWeight: "800" },
  toggleBody: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 3 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  trustRow: { width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  trustLabel: { flex: 1, color: colors.foreground, fontSize: 12, lineHeight: 19, fontWeight: "700" },
  trustValue: { color: colors.muted, fontSize: 10, lineHeight: 16, fontWeight: "800" },
  trustValueOn: { color: colors.primary },
  message: { width: "100%", color: colors.primary, fontSize: 12, lineHeight: 20, fontWeight: "700" },
  pressed: { opacity: 0.6 },
});
