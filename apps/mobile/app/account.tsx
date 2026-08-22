import { useCallback, useEffect, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  clearVisibleNotifications,
  unregisterCurrentPushDevice,
} from "@/lib/push-notifications";
import { supabase } from "@/lib/supabase";
import { setBiometricLockEnabled } from "@/security/biometric";
import { colors, radius, shadows } from "@/theme";

type AccountSnapshot = {
  userId: string;
  displayName: string | null;
  phone: string | null;
  profileComplete: boolean;
  deletionPending: boolean;
};

type AccountPath =
  | "/profile"
  | "/photos"
  | "/questionnaire"
  | "/marriage-priorities"
  | "/profile-visibility"
  | "/trusted-contacts"
  | "/privacy"
  | "/safety"
  | "/notification-privacy"
  | "/security"
  | "/dev-family-handoff"
  | "/dev-activity";

export default function AccountScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountSnapshot | null>(null);

  const copy = rtl
    ? {
        title: "حسابي", body: "ملف الزواج وخصوصيتك وأمان حسابك في مكان واحد.", member: "عضو ميثاق", ready: "ملف الزواج جاهز", incomplete: "ملف الزواج يحتاج إلى إكمال", deletion: "طلب حذف الحساب قيد المعالجة",
        marriage: "الزواج", profile: "ملفي الخاص", profileBody: "الاسم الظاهر والنبذة والتفاصيل التي تختار مشاركتها.", photos: "صوري الخاصة", photosBody: "الصور اختيارية. «خصوصية أولاً» يبقيها مخفية، والملف المفتوح قد يعرض صورة معتمدة باختيارك.", preferences: "تفضيلات الزواج", preferencesBody: "العمر والمكان والحالة الاجتماعية وحدودك الأساسية.", priorities: "أولويات الحياة الزوجية", prioritiesBody: "السكن والأطفال والعمل وتوقعات حفل الزواج.", visibility: "الخصوصية ومن لا يظهر لك", visibilityBody: "درع العائلة، تفاصيل الظهور، وما نتحقق منه فعلاً.", trustedContacts: "دائرة الثقة", trustedContactsBody: "احفظ حتى ثلاثة أشخاص قد تختار إشراك أحدهم بعد قبول متبادل.",
        trust: "الخصوصية والأمان", privacy: "الخصوصية والموافقات", privacyBody: "الموافقات والتحديثات الاختيارية وطلب حذف الحساب.", safety: "مركز السلامة", safetyBody: "البلاغات والحظر وضوابط حماية التعارف.", notifications: "الإشعارات", notificationsBody: "تنبيهات محايدة على شاشة القفل افتراضياً، وأنت تختار إن كان مسموحاً بإظهار تفاصيل أكثر.", security: "أمان الجهاز والحساب", securityBody: "القفل البيومتري والجلسات المسجلة على أجهزة أخرى.",
        development: "للتطوير فقط", familyPreview: "معاينة التسليم العائلي", familyPreviewBody: "جرّب مشاركة جهات الاتصال والصورة بعد إشراك العائلة بدون حساب ثانٍ أو أرقام حقيقية.", activityPreview: "معاينة رحلة النشاط", activityPreviewBody: "راجع تسلسل الاهتمام والتعارف والقبول والمحادثة ودائرة الثقة ببيانات محلية وهمية.",
        app: "التطبيق", language: "اللغة", languageBody: "العربية · اضغط للتبديل إلى English", signOut: "تسجيل الخروج", signOutBody: "إنهاء الجلسة المحفوظة على هذا الجهاز وإيقاف تنبيهاته الخاصة بالحساب.", loadErrorTitle: "تعذر تحميل حسابك", loadErrorBody: "تحقق من اتصالك ثم حاول مرة أخرى.", retry: "إعادة المحاولة", languageError: "تعذر حفظ اللغة الآن. حاول مرة أخرى.",
      }
    : {
        title: "Account", body: "Your Marriage profile, privacy, and account security in one place.", member: "Mithaq member", ready: "Marriage profile ready", incomplete: "Marriage profile needs completion", deletion: "Account deletion is being processed",
        marriage: "Marriage", profile: "Private profile", profileBody: "Your display name, introduction, and details you choose to share.", photos: "Private photos", photosBody: "Photos are optional. Private first keeps them hidden; an Open profile may show an approved photo by your choice.", preferences: "Marriage preferences", preferencesBody: "Age, location, marital-status choices, and essential boundaries.", priorities: "Marriage life priorities", prioritiesBody: "Housing, children, work, and wedding expectations.", visibility: "Privacy & people shield", visibilityBody: "Family Shield, detail visibility, and what Mithaq has actually verified.", trustedContacts: "Trusted contacts", trustedContactsBody: "Save up to three people you may choose to involve after mutual acceptance.",
        trust: "Privacy & security", privacy: "Privacy & consent", privacyBody: "Consent history, optional updates, and account deletion.", safety: "Safety Center", safetyBody: "Reports, blocks, and controls that protect introductions.", notifications: "Notifications", notificationsBody: "Neutral lock-screen updates by default. You decide whether more detail is allowed.", security: "Device & account security", securityBody: "Biometric protection and sessions on other devices.",
        development: "Development only", familyPreview: "Family handoff preview", familyPreviewBody: "Test contact sharing and the after-family photo stage without a second account or real phone numbers.", activityPreview: "Activity journey preview", activityPreviewBody: "Review interest, introduction, acceptance, conversation, and Trusted Circle stages with local fake data.",
        app: "App", language: "Language", languageBody: "English · tap to switch to العربية", signOut: "Sign out", signOutBody: "End the saved session on this device and unregister its private account alerts.", loadErrorTitle: "We couldn’t load your account", loadErrorBody: "Check your connection, then try again.", retry: "Try again", languageError: "We couldn’t save the language right now. Try again.",
      };

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false); setMessage(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) { setLoadError(true); setLoading(false); return; }
    const session = sessionData.session;
    if (!session) { router.replace({ pathname: "/auth", params: { locale } }); return; }
    const [profileResult, userResult] = await Promise.all([
      supabase.from("member_profiles").select("display_name, profile_completed_at").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("users").select("account_status").eq("id", session.user.id).maybeSingle(),
    ]);
    if (profileResult.error || userResult.error) { setLoadError(true); setLoading(false); return; }
    setAccount({ userId: session.user.id, displayName: profileResult.data?.display_name ?? null, phone: session.user.phone ?? null, profileComplete: Boolean(profileResult.data?.profile_completed_at), deletionPending: userResult.data?.account_status === "deletion_pending" });
    setLoading(false);
  }, [locale]);

  useEffect(() => { void load(); }, [load]);

  function open(pathname: AccountPath) { router.push({ pathname, params: { locale } }); }

  async function switchLanguage() {
    if (!account || languageSaving) return;
    const nextLocale: MobileLocale = locale === "ar" ? "en" : "ar";
    setLanguageSaving(true); setMessage(null);
    const { error } = await supabase.from("users").update({ preferred_locale: nextLocale, updated_at: new Date().toISOString() }).eq("id", account.userId);
    if (error) { setLanguageSaving(false); setMessage(copy.languageError); return; }
    setLanguageSaving(false); router.replace({ pathname: "/account", params: { locale: nextLocale } });
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await Promise.all([
      setBiometricLockEnabled(false),
      unregisterCurrentPushDevice().catch(() => false),
      clearVisibleNotifications(),
    ]);
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/");
  }

  const displayName = account?.displayName?.trim() || copy.member;
  const initial = displayName.charAt(0) || "م";
  const status = account?.deletionPending ? copy.deletion : account?.profileComplete ? copy.ready : copy.incomplete;

  return (
    <ScreenShell title={copy.title} body={copy.body} rtl={rtl}>
      {loading ? (
        <View style={styles.loadingState}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : loadError || !account ? (
        <StateCard rtl={rtl} tone="error" title={copy.loadErrorTitle} body={copy.loadErrorBody} actionLabel={copy.retry} onAction={() => void load()} />
      ) : (
        <View style={styles.page}>
          <View style={[styles.identity, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
            <View style={[styles.identityCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.name, { textAlign, writingDirection }]}>{displayName}</Text>
              <Text style={[styles.phone, { textAlign, writingDirection }]}>{maskPhone(account.phone)}</Text>
              <View style={[styles.statusPill, account.deletionPending ? styles.statusPillWarning : null]}><View style={styles.statusDot} /><Text style={[styles.statusText, { writingDirection }]}>{status}</Text></View>
            </View>
          </View>

          {message ? <Text accessibilityRole="alert" style={[styles.message, { textAlign, writingDirection }]}>{message}</Text> : null}

          <SettingsGroup title={copy.marriage} rtl={rtl}>
            <SettingsRow rtl={rtl} icon="account" title={copy.profile} body={copy.profileBody} onPress={() => open("/profile")} />
            <SettingsRow rtl={rtl} icon="photo" title={copy.photos} body={copy.photosBody} onPress={() => open("/photos")} />
            <SettingsRow rtl={rtl} icon="sliders" title={copy.preferences} body={copy.preferencesBody} onPress={() => open("/questionnaire")} />
            <SettingsRow rtl={rtl} icon="sliders" title={copy.priorities} body={copy.prioritiesBody} onPress={() => open("/marriage-priorities")} />
            <SettingsRow rtl={rtl} icon="privacy" title={copy.visibility} body={copy.visibilityBody} onPress={() => open("/profile-visibility")} />
            <SettingsRow rtl={rtl} icon="account" title={copy.trustedContacts} body={copy.trustedContactsBody} onPress={() => open("/trusted-contacts")} last />
          </SettingsGroup>

          <SettingsGroup title={copy.trust} rtl={rtl}>
            <SettingsRow rtl={rtl} icon="privacy" title={copy.privacy} body={copy.privacyBody} onPress={() => open("/privacy")} />
            <SettingsRow rtl={rtl} icon="shield" title={copy.safety} body={copy.safetyBody} onPress={() => open("/safety")} />
            <SettingsRow rtl={rtl} icon="activity" title={copy.notifications} body={copy.notificationsBody} onPress={() => open("/notification-privacy")} />
            <SettingsRow rtl={rtl} icon="privacy" title={copy.security} body={copy.securityBody} onPress={() => open("/security")} last />
          </SettingsGroup>

          {__DEV__ ? (
            <SettingsGroup title={copy.development} rtl={rtl}>
              <SettingsRow rtl={rtl} icon="activity" title={copy.activityPreview} body={copy.activityPreviewBody} onPress={() => open("/dev-activity")} />
              <SettingsRow rtl={rtl} icon="account" title={copy.familyPreview} body={copy.familyPreviewBody} onPress={() => open("/dev-family-handoff")} last />
            </SettingsGroup>
          ) : null}

          <SettingsGroup title={copy.app} rtl={rtl}>
            <SettingsRow rtl={rtl} icon="language" title={copy.language} body={copy.languageBody} onPress={() => void switchLanguage()} loading={languageSaving} last />
          </SettingsGroup>

          <View style={styles.signOutGroup}><SettingsRow rtl={rtl} icon="logout" title={copy.signOut} body={copy.signOutBody} onPress={() => void signOut()} loading={signingOut} danger last /></View>
        </View>
      )}
    </ScreenShell>
  );
}

function SettingsGroup({ title, rtl, children }: { title: string; rtl: boolean; children: ReactNode }) {
  return <View style={styles.groupWrap}><Text style={[styles.groupTitle, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>{title}</Text><View style={styles.group}>{children}</View></View>;
}

function SettingsRow({ rtl, icon, title, body, onPress, last = false, danger = false, loading = false }: { rtl: boolean; icon: AppIconName; title: string; body?: string; onPress: () => void; last?: boolean; danger?: boolean; loading?: boolean }) {
  const textAlign = rtl ? "right" : "left"; const writingDirection = rtl ? "rtl" : "ltr";
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ busy: loading, disabled: loading }} disabled={loading} onPress={onPress} style={({ pressed }) => [styles.row, !last ? styles.rowDivider : null, { flexDirection: rtl ? "row-reverse" : "row" }, pressed && !loading ? styles.rowPressed : null, loading ? styles.rowLoading : null]}>
      <View style={[styles.rowIcon, danger ? styles.rowIconDanger : null]}>{loading ? <ActivityIndicator size="small" color={danger ? colors.danger : colors.primary} /> : <AppIcon name={icon} active={!danger} size={20} rtl={rtl} />}</View>
      <View style={[styles.rowCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}><Text style={[styles.rowTitle, danger ? styles.rowTitleDanger : null, { textAlign, writingDirection }]}>{title}</Text>{body ? <Text style={[styles.rowBody, { textAlign, writingDirection }]}>{body}</Text> : null}</View>
      {!danger ? <AppIcon name="chevron" size={15} rtl={rtl} /> : null}
    </Pressable>
  );
}

function maskPhone(phone: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, ""); const last = digits.slice(-3); return `+${digits.slice(0, 3)} ••• ••${last}`;
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" }, page: { width: "100%", gap: 24 },
  identity: { width: "100%", alignItems: "center", gap: 15, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: 18, paddingVertical: 19, ...shadows.card }, avatar: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryStrong }, avatarText: { color: colors.white, fontSize: 25, lineHeight: 35, fontWeight: "800" }, identityCopy: { flex: 1, minWidth: 0 }, name: { width: "100%", color: colors.foreground, fontSize: 20, lineHeight: 31, fontWeight: "800" }, phone: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 1 }, statusPill: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: radius.pill, backgroundColor: colors.primaryWash, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 }, statusPillWarning: { backgroundColor: colors.goldSoft }, statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold }, statusText: { color: colors.primary, fontSize: 10, lineHeight: 15, fontWeight: "800" }, message: { width: "100%", color: colors.danger, fontSize: 13, lineHeight: 21, fontWeight: "700" },
  groupWrap: { width: "100%" }, groupTitle: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, fontWeight: "800", marginBottom: 8 }, group: { width: "100%", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, overflow: "hidden" }, row: { minHeight: 72, alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 }, rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, rowPressed: { backgroundColor: colors.surfaceMuted }, rowLoading: { opacity: 0.7 }, rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryWash }, rowIconDanger: { backgroundColor: "rgba(180,35,63,0.08)" }, rowCopy: { flex: 1, minWidth: 0 }, rowTitle: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: "800" }, rowTitleDanger: { color: colors.danger }, rowBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 2 }, signOutGroup: { width: "100%", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(180,35,63,0.16)", overflow: "hidden", backgroundColor: colors.surfaceRaised },
});
