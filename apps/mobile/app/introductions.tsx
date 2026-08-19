import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ProfilePortrait } from "@/components/profile-portrait";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type IntroductionStatus = "offered" | "mutually_accepted" | "declined" | "expired" | "cancelled" | "closed";
type IntroductionDecision = "pending" | "accepted" | "declined";
type IntroductionRow = { introduction_id: string; status: IntroductionStatus; my_decision: IntroductionDecision; created_at: string; expires_at: string };
type UnreadRow = { introduction_id: string; unread_count: number | string };
type PreviewRow = {
  display_name: string | null; about_me: string | null; occupation: string | null; education: string | null;
  gender: "woman" | "man" | null; age_band_id: number | null; country_code: string | null; city: string | null;
  origin_region: string | null; marital_status: "never_married" | "divorced" | "widowed" | null; has_children: boolean | null;
  primary_photo_url?: string | null; photo_count?: number | null;
};

const ageBands = ["18–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–54", "55+"];

export default function IntroductionsScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const { height } = useWindowDimensions();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const copy = useMemo(() => introductionCopy(locale), [locale]);
  const portraitHeight = height < 760 ? 218 : 265;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<IntroductionRow[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [featuredPreviewId, setFeaturedPreviewId] = useState<string | null>(null);
  const [featuredPreview, setFeaturedPreview] = useState<PreviewRow | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [selected, setSelected] = useState<IntroductionRow | null>(null);
  const [preview, setPreview] = useState<PreviewRow | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const featured = useMemo(() => selectFeatured(items), [items]);
  const history = useMemo(() => items.filter((item) => item.introduction_id !== featured?.introduction_id), [featured?.introduction_id, items]);
  const fetchPreview = useCallback(async (introductionId: string) => {
    const { data, error } = await supabase.rpc("get_introduction_preview", { p_introduction_id: introductionId });
    if (error) return null;
    return ((Array.isArray(data) ? data[0] : data) ?? null) as PreviewRow | null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false); setActionError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) { setLoadError(true); setLoading(false); return; }
    if (!sessionData.session) { router.replace({ pathname: "/auth", params: { locale } }); return; }
    const [introductionResult, unreadResult] = await Promise.all([
      supabase.rpc("list_my_introductions"),
      supabase.rpc("list_my_conversation_unread_counts"),
    ]);
    if (introductionResult.error || unreadResult.error) { setLoadError(true); setLoading(false); return; }
    const rows = (introductionResult.data ?? []) as IntroductionRow[];
    const unreadMap: Record<string, number> = {};
    for (const row of (unreadResult.data ?? []) as UnreadRow[]) unreadMap[row.introduction_id] = Number(row.unread_count) || 0;
    setItems(rows); setUnreadCounts(unreadMap);
    const first = selectFeatured(rows);
    if (first) {
      setFeaturedLoading(true);
      setFeaturedPreviewId(first.introduction_id);
      setFeaturedPreview(await fetchPreview(first.introduction_id));
      setFeaturedLoading(false);
    } else { setFeaturedPreviewId(null); setFeaturedPreview(null); }
    setLoading(false);
  }, [fetchPreview, locale]);

  useEffect(() => { void load(); }, [load]);

  async function openIntroduction(item: IntroductionRow) {
    setSelected(item); setActionError(null);
    if (featuredPreviewId === item.introduction_id) { setPreview(featuredPreview); setPreviewLoading(false); return; }
    setPreview(null); setPreviewLoading(true);
    const row = await fetchPreview(item.introduction_id);
    setPreview(row); setPreviewLoading(false);
    if (!row) setActionError(copy.previewUnavailable);
  }

  async function respond(accept: boolean) {
    if (!selected || actionLoading) return;
    setActionLoading(true); setActionError(null);
    const { data, error } = await supabase.rpc("respond_to_introduction", { p_introduction_id: selected.introduction_id, p_accept: accept });
    if (error) { setActionLoading(false); setActionError(copy.actionUnavailable); return; }
    const nextStatus = data as IntroductionStatus;
    const nextDecision: IntroductionDecision = accept ? "accepted" : "declined";
    setSelected((current) => current ? { ...current, status: nextStatus, my_decision: nextDecision } : current);
    setItems((current) => current.map((item) => item.introduction_id === selected.introduction_id ? { ...item, status: nextStatus, my_decision: nextDecision } : item));
    setActionLoading(false);
  }

  if (selected) {
    const canRespond = selected.status === "offered" && selected.my_decision === "pending";
    const initials = preview?.display_name?.trim().charAt(0) || "م";
    const location = [preview?.city, preview?.country_code].filter(Boolean).join(" · ");
    return (
      <ScreenShell title={copy.detailTitle} rtl={rtl}>
        <View style={styles.detailPage}>
          <Pressable accessibilityRole="button" onPress={() => { setSelected(null); setPreview(null); setActionError(null); }} style={({ pressed }) => [styles.backButton, { alignSelf: rtl ? "flex-end" : "flex-start", flexDirection: rtl ? "row-reverse" : "row" }, pressed ? styles.pressed : null]}>
            <AppIcon name="back" active size={18} />
            <Text style={[styles.backText, { textAlign, writingDirection }]}>{copy.backToList}</Text>
          </Pressable>

          {previewLoading ? <View style={styles.loadingPortrait}><ActivityIndicator size="large" color={colors.primary} /></View> : preview ? (
            <>
              <ProfilePortrait height={portraitHeight} initials={initials} privacyLabel={copy.privatePhoto} rtl={rtl} uri={preview.primary_photo_url} />
              <View style={[styles.identity, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                <StatusPill copy={copy} decision={selected.my_decision} rtl={rtl} status={selected.status} />
                <Text style={[styles.detailName, { textAlign, writingDirection }]}>{preview.display_name ?? copy.member}</Text>
                <Text style={[styles.detailMeta, { textAlign, writingDirection }]}>{[preview.age_band_id ? ageBands[preview.age_band_id - 1] : null, location || null].filter(Boolean).join(" · ") || copy.privateMember}</Text>
              </View>
              <View style={styles.section}>
                <Text style={[styles.sectionEyebrow, { textAlign, writingDirection }]}>{copy.whyEyebrow}</Text>
                <Text style={[styles.sectionTitle, { textAlign, writingDirection }]}>{copy.whyTitle}</Text>
                <View style={styles.reasonList}>
                  <ReasonRow rtl={rtl} text={copy.reasonMutualPreferences} />
                  <ReasonRow rtl={rtl} text={copy.reasonEligibility} />
                  <ReasonRow rtl={rtl} text={copy.reasonPrivacy} />
                </View>
              </View>
              {preview.about_me ? <View style={styles.section}><Text style={[styles.sectionEyebrow, { textAlign, writingDirection }]}>{copy.about}</Text><Text style={[styles.about, { textAlign, writingDirection }]}>{preview.about_me}</Text></View> : null}
              <View style={styles.factGrid}>
                {preview.marital_status ? <Fact label={copy.marital} rtl={rtl} value={copy.maritalStatus[preview.marital_status]} /> : null}
                {preview.has_children !== null ? <Fact label={copy.children} rtl={rtl} value={preview.has_children ? copy.yes : copy.no} /> : null}
                {preview.origin_region ? <Fact label={copy.origin} rtl={rtl} value={preview.origin_region} /> : null}
                {preview.occupation ? <Fact label={copy.occupation} rtl={rtl} value={preview.occupation} /> : null}
                {preview.education ? <Fact label={copy.education} rtl={rtl} value={preview.education} /> : null}
              </View>
            </>
          ) : <StateCard body={copy.previewUnavailable} rtl={rtl} title={copy.previewUnavailableTitle} tone="neutral" />}

          <View style={[styles.privacyNote, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.privacyIcon}><AppIcon name="introductions" active size={18} /></View>
            <View style={styles.flex}><Text style={[styles.privacyTitle, { textAlign, writingDirection }]}>{copy.privateTitle}</Text><Text style={[styles.privacyBody, { textAlign, writingDirection }]}>{copy.privateBody}</Text></View>
          </View>
          {actionError ? <Text accessibilityRole="alert" style={[styles.error, { textAlign, writingDirection }]}>{actionError}</Text> : null}
          {canRespond ? <View style={styles.decisionSection}><Text style={[styles.decisionTitle, { textAlign, writingDirection }]}>{copy.decisionTitle}</Text><PrimaryButton loading={actionLoading} onPress={() => void respond(true)}>{copy.accept}</PrimaryButton><PrimaryButton disabled={actionLoading} onPress={() => void respond(false)} tone="quiet">{copy.decline}</PrimaryButton></View> : selected.my_decision === "accepted" && selected.status === "offered" ? <StateCard body={copy.acceptedBody} rtl={rtl} title={copy.acceptedTitle} tone="neutral" /> : selected.status === "mutually_accepted" ? <View style={styles.decisionSection}><StateCard body={copy.mutualBody} rtl={rtl} title={copy.mutualTitle} tone="success" /><PrimaryButton onPress={() => router.push({ pathname: "/introduction-handoff", params: { locale, introductionId: selected.introduction_id } })}>{copy.continueAfterMutual}</PrimaryButton></View> : null}
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/introduction-safety", params: { locale, introductionId: selected.introduction_id } })} style={({ pressed }) => [styles.safetyLink, { flexDirection: rtl ? "row-reverse" : "row" }, pressed ? styles.pressed : null]}><Text style={[styles.safetyText, { textAlign, writingDirection }]}>{copy.safety}</Text></Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell body={copy.body} rtl={rtl} title={copy.title}>
      {loading ? <View style={styles.loadingState}><ActivityIndicator size="large" color={colors.primary} /></View> : loadError ? <StateCard actionLabel={copy.retry} body={copy.errorBody} onAction={() => void load()} rtl={rtl} title={copy.errorTitle} tone="error" /> : !featured ? (
        <View style={[styles.emptyState, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
          <View style={styles.emptyIcon}><AppIcon name="introductions" active size={26} /></View>
          <Text style={[styles.emptyTitle, { textAlign, writingDirection }]}>{copy.emptyTitle}</Text>
          <Text style={[styles.emptyBody, { textAlign, writingDirection }]}>{copy.emptyBody}</Text>
          <View style={styles.emptyAction}><PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/profile", params: { locale } })}>{copy.reviewProfile}</PrimaryButton></View>
        </View>
      ) : (
        <View style={styles.listPage}>
          <View style={[styles.sectionHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}><View style={styles.flex}><Text style={[styles.listEyebrow, { textAlign, writingDirection }]}>{copy.currentEyebrow}</Text><Text style={[styles.listTitle, { textAlign, writingDirection }]}>{copy.currentTitle}</Text></View><StatusPill compact copy={copy} decision={featured.my_decision} rtl={rtl} status={featured.status} /></View>
          <Pressable accessibilityRole="button" onPress={() => void openIntroduction(featured)} style={({ pressed }) => [styles.featuredCard, pressed ? styles.cardPressed : null]}>
            {featuredLoading ? <View style={[styles.featuredLoading, { height: portraitHeight }]}><ActivityIndicator color={colors.primary} size="large" /></View> : <ProfilePortrait height={portraitHeight} initials={featuredPreview?.display_name?.trim().charAt(0) || "م"} privacyLabel={copy.privatePhoto} rtl={rtl} uri={featuredPreview?.primary_photo_url} />}
            <View style={[styles.featuredContent, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.featuredName, { textAlign, writingDirection }]}>{featuredPreview?.display_name ?? copy.privateIntroduction}</Text>
              <Text style={[styles.featuredMeta, { textAlign, writingDirection }]}>{formatFeaturedMeta(featuredPreview, copy)}</Text>
              <View style={styles.featuredReasons}><ReasonRow rtl={rtl} text={copy.reasonMutualPreferences} compact /><ReasonRow rtl={rtl} text={copy.reasonPrivacy} compact /></View>
              <View style={[styles.openRow, { flexDirection: rtl ? "row-reverse" : "row" }]}><Text style={[styles.openText, { textAlign, writingDirection }]}>{copy.openIntroduction}</Text><AppIcon name="back" active size={17} /></View>
            </View>
          </Pressable>
          {history.length > 0 ? <View style={styles.historySection}><Text style={[styles.historyTitle, { textAlign, writingDirection }]}>{copy.history}</Text><View style={styles.historyList}>{history.map((item) => <HistoryRow copy={copy} item={item} key={item.introduction_id} onPress={() => void openIntroduction(item)} rtl={rtl} unreadCount={unreadCounts[item.introduction_id] ?? 0} />)}</View></View> : null}
        </View>
      )}
    </ScreenShell>
  );
}

function selectFeatured(items: IntroductionRow[]) { return items.find((item) => ["offered", "mutually_accepted"].includes(item.status)) ?? items[0] ?? null; }
function formatFeaturedMeta(preview: PreviewRow | null, copy: ReturnType<typeof introductionCopy>) { if (!preview) return copy.privateMember; const values = [preview.age_band_id ? ageBands[preview.age_band_id - 1] : null, preview.city, preview.country_code].filter(Boolean); return values.join(" · ") || copy.privateMember; }
function HistoryRow({ item, unreadCount, copy, rtl, onPress }: { item: IntroductionRow; unreadCount: number; copy: ReturnType<typeof introductionCopy>; rtl: boolean; onPress: () => void }) {
  const textAlign = rtl ? "right" : "left"; const writingDirection = rtl ? "rtl" : "ltr";
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.historyRow, { flexDirection: rtl ? "row-reverse" : "row" }, pressed ? styles.pressed : null]}><View style={styles.historyMark}><AppIcon name="account" active size={18} /></View><View style={styles.flex}><Text style={[styles.historyName, { textAlign, writingDirection }]}>{copy.privateIntroduction}</Text><Text style={[styles.historyDate, { textAlign, writingDirection }]}>{new Date(item.created_at).toLocaleDateString(rtl ? "ar-LY" : "en-US", { month: "short", day: "numeric", year: "numeric" })}</Text></View>{unreadCount > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text></View> : null}</Pressable>;
}
function ReasonRow({ text, rtl, compact = false }: { text: string; rtl: boolean; compact?: boolean }) { return <View style={[styles.reasonRow, compact ? styles.reasonRowCompact : null, { flexDirection: rtl ? "row-reverse" : "row" }]}><Text style={styles.checkMark}>✓</Text><Text style={[styles.reasonText, compact ? styles.reasonTextCompact : null, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>{text}</Text></View>; }
function StatusPill({ rtl, status, decision, copy, compact = false }: { rtl: boolean; status: IntroductionStatus; decision: IntroductionDecision; copy: ReturnType<typeof introductionCopy>; compact?: boolean }) { const label = status === "mutually_accepted" ? copy.status.mutually_accepted : status === "offered" && decision === "accepted" ? copy.status.waiting : copy.status[status]; return <View style={[styles.statusPill, compact ? styles.statusPillCompact : null, { flexDirection: rtl ? "row-reverse" : "row" }]}><View style={styles.statusDot} /><Text style={[styles.statusText, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>{label}</Text></View>; }
function Fact({ rtl, label, value }: { rtl: boolean; label: string; value: string }) { return <View style={[styles.fact, { alignItems: rtl ? "flex-end" : "flex-start" }]}><Text style={[styles.factLabel, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>{label}</Text><Text style={[styles.factValue, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>{value}</Text></View>; }

function introductionCopy(locale: MobileLocale) {
  if (locale === "ar") return {
    title: "التعارف", body: "تعارف خاص ومدروس، وليس قائمة أشخاص للتصفح.", currentEyebrow: "التعارف الحالي", currentTitle: "شخص واحد يستحق التعرّف عليه بهدوء", privateIntroduction: "تعارف خاص", privateMember: "عضو ميثاق", privatePhoto: "صورة خاصة بالتعارف", openIntroduction: "مراجعة التعارف", detailTitle: "التعارف الخاص", backToList: "العودة إلى التعارفات", whyEyebrow: "لماذا ظهر هذا التعارف؟", whyTitle: "اختيار منضبط قبل أن يظهر لك الملف", reasonMutualPreferences: "فُحصت المتطلبات الأساسية في الاتجاهين قبل إنشاء التعارف.", reasonEligibility: "الحسابان مؤهلان للمشاركة وفق ضوابط الأمان والملف.", reasonPrivacy: "يبقى قرار كل طرف خاصاً حتى يصبح القبول متبادلاً.", about: "نبذة شخصية", decisionTitle: "هل ترغب في متابعة هذا التعارف؟", privateTitle: "خصوصية متبادلة", privateBody: "لا نعرض قرار الطرف الآخر قبل القبول المتبادل، ولا نكشف الهاتف أو أي بيانات خارج هذا التعارف.", safety: "الأمان أو الإبلاغ عن مشكلة", accept: "مهتم بالمتابعة", decline: "غير مناسب لي", acceptedTitle: "تم حفظ اهتمامك", acceptedBody: "لن نكشف قرار الطرف الآخر. سنخبرك فقط إذا أصبح القبول متبادلاً.", mutualTitle: "الاهتمام متبادل", mutualBody: "اختار الطرفان المتابعة. يمكنك الآن الانتقال إلى الخطوة التي تفتح التواصل الخاص.", continueAfterMutual: "فتح الخطوة التالية", emptyTitle: "لا يوجد تعارف حالياً", emptyBody: "هذا طبيعي. يبقى ملفك مؤهلاً، ويظهر التعارف فقط عندما يجتاز الطرفان المتطلبات الأساسية.", reviewProfile: "مراجعة ملفي وتفضيلاتي", history: "التعارفات السابقة", errorTitle: "تعذر تحميل التعارفات", errorBody: "لم يتم تغيير أي قرار. تحقق من اتصالك وحاول مرة أخرى.", retry: "إعادة المحاولة", loading: "جارٍ تحميل التعارفات", loadingPreview: "جارٍ تحميل التعارف الخاص", previewUnavailableTitle: "المعاينة غير متاحة", previewUnavailable: "قد يكون التعارف منتهياً أو أُغلق بسبب الأهلية أو الحظر أو إعدادات السلامة.", actionUnavailable: "تعذر حفظ قرارك الآن. لم نغيّر حالة التعارف.", member: "عضو ميثاق", marital: "الحالة الاجتماعية", children: "الأطفال", origin: "المنطقة الأصلية", occupation: "العمل", education: "التعليم", yes: "نعم", no: "لا", maritalStatus: { never_married: "لم يسبق الزواج", divorced: "مطلق/ة", widowed: "أرمل/ة" } as const, status: { offered: "بانتظار قرارك", waiting: "تم اهتمامك · بانتظار النتيجة", mutually_accepted: "اهتمام متبادل", declined: "تم الاعتذار", expired: "انتهت المهلة", cancelled: "أُلغي التعارف", closed: "مغلق" } as const,
  };
  return {
    title: "Introductions", body: "A private, considered introduction—not a catalogue of people.", currentEyebrow: "CURRENT INTRODUCTION", currentTitle: "One person worth considering calmly", privateIntroduction: "Private introduction", privateMember: "Mithaq member", privatePhoto: "Introduction-only photo", openIntroduction: "Review introduction", detailTitle: "Private introduction", backToList: "Back to introductions", whyEyebrow: "WHY THIS APPEARED", whyTitle: "A controlled selection before a profile reaches you", reasonMutualPreferences: "Core requirements were checked in both directions before the introduction was created.", reasonEligibility: "Both accounts are eligible under profile and safety participation controls.", reasonPrivacy: "Each decision remains private unless interest becomes mutual.", about: "About", decisionTitle: "Would you like to continue this introduction?", privateTitle: "Mutual privacy", privateBody: "We do not reveal the other person’s decision before mutual interest, and phone numbers remain private.", safety: "Safety or report a concern", accept: "I’m interested", decline: "Not for me", acceptedTitle: "Your interest is saved", acceptedBody: "We will not reveal the other person’s decision. You will only be notified if interest becomes mutual.", mutualTitle: "Interest is mutual", mutualBody: "Both people chose to continue. You can now move to the protected communication handoff.", continueAfterMutual: "Open the next step", emptyTitle: "No introduction right now", emptyBody: "That is normal. Your profile remains eligible, and an introduction appears only when both people pass the core requirements.", reviewProfile: "Review my profile and preferences", history: "Previous introductions", errorTitle: "We couldn’t load introductions", errorBody: "No decision was changed. Check your connection and try again.", retry: "Try again", loading: "Loading introductions", loadingPreview: "Loading private introduction", previewUnavailableTitle: "Preview unavailable", previewUnavailable: "The introduction may have expired or closed because of eligibility, blocking, or safety controls.", actionUnavailable: "We couldn’t save your decision. The introduction state was not changed.", member: "Mithaq member", marital: "Marital status", children: "Children", origin: "Origin region", occupation: "Occupation", education: "Education", yes: "Yes", no: "No", maritalStatus: { never_married: "Never married", divorced: "Divorced", widowed: "Widowed" } as const, status: { offered: "Waiting for your decision", waiting: "Interested · waiting for outcome", mutually_accepted: "Mutual interest", declined: "Declined", expired: "Expired", cancelled: "Cancelled", closed: "Closed" } as const,
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, pressed: { opacity: 0.62 }, cardPressed: { opacity: 0.9, transform: [{ scale: 0.994 }] }, loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" }, listPage: { width: "100%" }, sectionHeader: { width: "100%", alignItems: "flex-end", gap: 12, marginBottom: 14 }, listEyebrow: { width: "100%", color: colors.gold, fontSize: 10, lineHeight: 16, fontWeight: "800", letterSpacing: 0 }, listTitle: { width: "100%", color: colors.foreground, fontSize: 20, lineHeight: 31, fontWeight: "800", letterSpacing: 0, marginTop: 2 }, featuredCard: { width: "100%", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, overflow: "hidden", ...shadows.card }, featuredLoading: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryWash }, featuredContent: { width: "100%", paddingHorizontal: 19, paddingTop: 17, paddingBottom: 18 }, featuredName: { width: "100%", color: colors.foreground, fontSize: 24, lineHeight: 36, fontWeight: "800", letterSpacing: 0 }, featuredMeta: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 2 }, featuredReasons: { width: "100%", gap: 7, marginTop: 13, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, openRow: { width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 15 }, openText: { flex: 1, color: colors.primary, fontSize: 13, lineHeight: 20, fontWeight: "800" }, historySection: { width: "100%", marginTop: 26 }, historyTitle: { width: "100%", color: colors.foreground, fontSize: 16, lineHeight: 25, fontWeight: "800" }, historyList: { gap: 9, marginTop: 11 }, historyRow: { width: "100%", minHeight: 72, alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 10 }, historyMark: { width: 39, height: 39, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryWash }, historyName: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 21, fontWeight: "800" }, historyDate: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 2 }, unreadBadge: { minWidth: 27, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, paddingHorizontal: 7 }, unreadBadgeText: { color: colors.white, fontSize: 10, fontWeight: "900" }, emptyState: { width: "100%", minHeight: 340, justifyContent: "center", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: 24, paddingVertical: 28 }, emptyIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryWash }, emptyTitle: { width: "100%", color: colors.foreground, fontSize: 23, lineHeight: 36, fontWeight: "800", marginTop: 18 }, emptyBody: { width: "100%", color: colors.muted, fontSize: 14, lineHeight: 25, marginTop: 7 }, emptyAction: { width: "100%", marginTop: 20 }, detailPage: { width: "100%", gap: 20 }, backButton: { minHeight: 42, alignItems: "center", gap: 8 }, backText: { color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "800" }, loadingPortrait: { minHeight: 250, alignItems: "center", justifyContent: "center", borderRadius: radius.xl, backgroundColor: colors.primaryWash }, identity: { width: "100%" }, detailName: { width: "100%", color: colors.foreground, fontSize: 29, lineHeight: 43, fontWeight: "800", letterSpacing: 0, marginTop: 12 }, detailMeta: { width: "100%", color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 2 }, section: { width: "100%", paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, sectionEyebrow: { width: "100%", color: colors.gold, fontSize: 10, lineHeight: 17, fontWeight: "800", letterSpacing: 0 }, sectionTitle: { width: "100%", color: colors.foreground, fontSize: 19, lineHeight: 30, fontWeight: "800", marginTop: 5 }, reasonList: { width: "100%", gap: 10, marginTop: 14 }, reasonRow: { width: "100%", alignItems: "flex-start", gap: 10 }, reasonRowCompact: { gap: 8 }, checkMark: { color: colors.primary, fontSize: 17, lineHeight: 20, fontWeight: "900" }, reasonText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 22 }, reasonTextCompact: { fontSize: 12, lineHeight: 19 }, about: { width: "100%", color: colors.foreground, fontSize: 15, lineHeight: 28, marginTop: 8 }, factGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10 }, fact: { minWidth: "47%", flexGrow: 1, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, paddingHorizontal: 14, paddingVertical: 12 }, factLabel: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 16, fontWeight: "700" }, factValue: { width: "100%", color: colors.foreground, fontSize: 13, lineHeight: 21, fontWeight: "800", marginTop: 3 }, statusPill: { alignSelf: "flex-start", alignItems: "center", gap: 7, borderRadius: radius.pill, backgroundColor: colors.primaryWash, paddingHorizontal: 11, paddingVertical: 8 }, statusPillCompact: { paddingHorizontal: 9, paddingVertical: 7 }, statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold }, statusText: { color: colors.primary, fontSize: 10, lineHeight: 15, fontWeight: "800", flexShrink: 1 }, privacyNote: { width: "100%", alignItems: "flex-start", gap: 12, borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 16 }, privacyIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised }, privacyTitle: { width: "100%", color: colors.foreground, fontSize: 13, lineHeight: 21, fontWeight: "800" }, privacyBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 3 }, decisionSection: { width: "100%", gap: 10 }, decisionTitle: { width: "100%", color: colors.foreground, fontSize: 17, lineHeight: 28, fontWeight: "800", marginBottom: 2 }, safetyLink: { minHeight: 46, alignItems: "center", justifyContent: "center", gap: 8 }, safetyText: { color: colors.muted, fontSize: 12, lineHeight: 19, fontWeight: "700" }, error: { width: "100%", color: colors.danger, fontSize: 13, lineHeight: 21, fontWeight: "700" },
});
