import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ProfilePortrait } from "@/components/profile-portrait";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import { TrustBadges } from "@/components/trust-badges";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type IntroductionStatus = "offered" | "mutually_accepted" | "declined" | "expired" | "cancelled" | "closed";
type IntroductionDecision = "pending" | "accepted" | "declined";
type IntroductionRow = {
  introduction_id: string;
  status: IntroductionStatus;
  my_decision: IntroductionDecision;
  created_at: string;
  expires_at: string;
};
type UnreadRow = { introduction_id: string; unread_count: number | string };
type PreviewRow = {
  display_name: string | null;
  about_me: string | null;
  occupation: string | null;
  education: string | null;
  gender: "woman" | "man" | null;
  age_band_id: number | null;
  country_code: string | null;
  city: string | null;
  origin_region: string | null;
  marital_status: "never_married" | "married" | "divorced" | "widowed" | null;
  has_children: boolean | null;
  primary_photo_url: string | null;
  real_person_verified: boolean | null;
  age_18_plus_verified: boolean | null;
  identity_verified: boolean | null;
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
  const [previewCache, setPreviewCache] = useState<Record<string, PreviewRow | null>>({});
  const [selected, setSelected] = useState<IntroductionRow | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const featured = useMemo(
    () => items.find((item) => item.status === "offered" || item.status === "mutually_accepted") ?? items[0] ?? null,
    [items],
  );
  const history = useMemo(
    () => items.filter((item) => item.introduction_id !== featured?.introduction_id),
    [featured?.introduction_id, items],
  );

  const fetchPreview = useCallback(async (introductionId: string) => {
    const { data, error } = await supabase.rpc("get_introduction_preview", {
      p_introduction_id: introductionId,
    });
    if (error) return null;
    return ((Array.isArray(data) ? data[0] : data) ?? null) as PreviewRow | null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setActionError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const [introductionResult, unreadResult] = await Promise.all([
        supabase.rpc("list_my_introductions"),
        supabase.rpc("list_my_conversation_unread_counts"),
      ]);
      if (introductionResult.error || unreadResult.error) throw introductionResult.error ?? unreadResult.error;

      const rows = (introductionResult.data ?? []) as IntroductionRow[];
      const unreadMap: Record<string, number> = {};
      for (const row of (unreadResult.data ?? []) as UnreadRow[]) {
        unreadMap[row.introduction_id] = Number(row.unread_count) || 0;
      }

      setItems(rows);
      setUnreadCounts(unreadMap);

      const first = rows.find((item) => item.status === "offered" || item.status === "mutually_accepted") ?? rows[0] ?? null;
      if (first) {
        const firstPreview = await fetchPreview(first.introduction_id);
        setPreviewCache((current) => ({ ...current, [first.introduction_id]: firstPreview }));
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchPreview, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openIntroduction(item: IntroductionRow) {
    setSelected(item);
    setActionError(null);
    if (Object.prototype.hasOwnProperty.call(previewCache, item.introduction_id)) return;

    setPreviewLoading(true);
    const row = await fetchPreview(item.introduction_id);
    setPreviewCache((current) => ({ ...current, [item.introduction_id]: row }));
    setPreviewLoading(false);
    if (!row) setActionError(copy.previewUnavailable);
  }

  async function respond(accept: boolean) {
    if (!selected || actionLoading) return;
    setActionLoading(true);
    setActionError(null);

    const { data, error } = await supabase.rpc("respond_to_introduction", {
      p_introduction_id: selected.introduction_id,
      p_accept: accept,
    });

    if (error) {
      setActionLoading(false);
      setActionError(copy.actionUnavailable);
      return;
    }

    const nextStatus = data as IntroductionStatus;
    const nextDecision: IntroductionDecision = accept ? "accepted" : "declined";
    setSelected((current) =>
      current ? { ...current, status: nextStatus, my_decision: nextDecision } : current,
    );
    setItems((current) =>
      current.map((item) =>
        item.introduction_id === selected.introduction_id
          ? { ...item, status: nextStatus, my_decision: nextDecision }
          : item,
      ),
    );
    setActionLoading(false);
  }

  if (selected) {
    const preview = previewCache[selected.introduction_id] ?? null;
    const canRespond = selected.status === "offered" && selected.my_decision === "pending";
    const initials = preview?.display_name?.trim().charAt(0) || "م";
    const location = [preview?.city, preview?.country_code].filter(Boolean).join(" · ");
    const hasTrust = Boolean(
      preview &&
        (preview.real_person_verified || preview.age_18_plus_verified || preview.identity_verified),
    );

    return (
      <ScreenShell title={copy.detailTitle} rtl={rtl}>
        <View style={styles.detailPage}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSelected(null);
              setActionError(null);
            }}
            style={({ pressed }) => [
              styles.backButton,
              { alignSelf: rtl ? "flex-end" : "flex-start", flexDirection: rtl ? "row-reverse" : "row" },
              pressed ? styles.pressed : null,
            ]}
          >
            <AppIcon name="back" active size={18} />
            <Text style={[styles.backText, { textAlign, writingDirection }]}>{copy.backToList}</Text>
          </Pressable>

          {previewLoading ? (
            <View style={styles.loadingPortrait}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : preview ? (
            <>
              <ProfilePortrait
                height={portraitHeight}
                initials={initials}
                privacyLabel={copy.privatePhoto}
                rtl={rtl}
                uri={preview.primary_photo_url}
              />

              <View style={[styles.identity, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                <StatusPill copy={copy} decision={selected.my_decision} rtl={rtl} status={selected.status} />
                <Text style={[styles.detailName, { textAlign, writingDirection }]}>
                  {preview.display_name ?? copy.member}
                </Text>
                <Text style={[styles.detailMeta, { textAlign, writingDirection }]}>
                  {[preview.age_band_id ? ageBands[preview.age_band_id - 1] : null, location || null]
                    .filter(Boolean)
                    .join(" · ") || copy.privateMember}
                </Text>
                {hasTrust ? (
                  <View style={styles.trustBlock}>
                    <TrustBadges
                      locale={locale}
                      realPersonVerified={Boolean(preview.real_person_verified)}
                      age18PlusVerified={Boolean(preview.age_18_plus_verified)}
                      identityVerified={Boolean(preview.identity_verified)}
                    />
                    <Text style={[styles.trustNote, { textAlign, writingDirection }]}>
                      {copy.trustNote}
                    </Text>
                  </View>
                ) : null}
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

              {preview.about_me ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionEyebrow, { textAlign, writingDirection }]}>{copy.about}</Text>
                  <Text style={[styles.about, { textAlign, writingDirection }]}>{preview.about_me}</Text>
                </View>
              ) : null}

              <View style={styles.factGrid}>
                {preview.marital_status ? (
                  <Fact label={copy.marital} rtl={rtl} value={copy.maritalStatus[preview.marital_status]} />
                ) : null}
                {preview.has_children !== null ? (
                  <Fact label={copy.children} rtl={rtl} value={preview.has_children ? copy.yes : copy.no} />
                ) : null}
                {preview.origin_region ? <Fact label={copy.origin} rtl={rtl} value={preview.origin_region} /> : null}
                {preview.occupation ? <Fact label={copy.occupation} rtl={rtl} value={preview.occupation} /> : null}
                {preview.education ? <Fact label={copy.education} rtl={rtl} value={preview.education} /> : null}
              </View>
            </>
          ) : (
            <StateCard
              body={copy.previewUnavailable}
              rtl={rtl}
              title={copy.previewUnavailableTitle}
              tone="neutral"
            />
          )}

          <View style={[styles.privacyNote, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.privacyIcon}>
              <AppIcon name="introductions" active size={18} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.privacyTitle, { textAlign, writingDirection }]}>{copy.privateTitle}</Text>
              <Text style={[styles.privacyBody, { textAlign, writingDirection }]}>{copy.privateBody}</Text>
            </View>
          </View>

          {actionError ? (
            <Text accessibilityRole="alert" style={[styles.error, { textAlign, writingDirection }]}>
              {actionError}
            </Text>
          ) : null}

          {canRespond ? (
            <View style={styles.decisionSection}>
              <Text style={[styles.decisionTitle, { textAlign, writingDirection }]}>{copy.decisionTitle}</Text>
              <PrimaryButton loading={actionLoading} onPress={() => void respond(true)}>
                {copy.accept}
              </PrimaryButton>
              <PrimaryButton disabled={actionLoading} onPress={() => void respond(false)} tone="quiet">
                {copy.decline}
              </PrimaryButton>
            </View>
          ) : selected.my_decision === "accepted" && selected.status === "offered" ? (
            <StateCard body={copy.acceptedBody} rtl={rtl} title={copy.acceptedTitle} tone="neutral" />
          ) : selected.status === "mutually_accepted" ? (
            <View style={styles.decisionSection}>
              <StateCard body={copy.mutualBody} rtl={rtl} title={copy.mutualTitle} tone="success" />
              <PrimaryButton
                onPress={() =>
                  router.push({
                    pathname: "/introduction-handoff",
                    params: { locale, introductionId: selected.introduction_id },
                  })
                }
              >
                {copy.continueAfterMutual}
              </PrimaryButton>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/introduction-safety",
                params: { locale, introductionId: selected.introduction_id },
              })
            }
            style={({ pressed }) => [
              styles.safetyLink,
              { flexDirection: rtl ? "row-reverse" : "row" },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.safetyText, { textAlign, writingDirection }]}>{copy.safety}</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const featuredPreview = featured ? previewCache[featured.introduction_id] ?? null : null;
  const featuredHasTrust = Boolean(
    featuredPreview &&
      (featuredPreview.real_person_verified ||
        featuredPreview.age_18_plus_verified ||
        featuredPreview.identity_verified),
  );

  return (
    <ScreenShell body={copy.body} rtl={rtl} title={copy.title}>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <StateCard
          actionLabel={copy.retry}
          body={copy.errorBody}
          onAction={() => void load()}
          rtl={rtl}
          title={copy.errorTitle}
          tone="error"
        />
      ) : !featured ? (
        <View style={[styles.emptyState, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
          <View style={styles.emptyIcon}>
            <AppIcon name="introductions" active size={26} />
          </View>
          <Text style={[styles.emptyTitle, { textAlign, writingDirection }]}>{copy.emptyTitle}</Text>
          <Text style={[styles.emptyBody, { textAlign, writingDirection }]}>{copy.emptyBody}</Text>
          <View style={styles.emptyAction}>
            <PrimaryButton
              tone="quiet"
              onPress={() => router.push({ pathname: "/profile", params: { locale } })}
            >
              {copy.reviewProfile}
            </PrimaryButton>
          </View>
        </View>
      ) : (
        <View style={styles.listPage}>
          <View style={[styles.sectionHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.flex}>
              <Text style={[styles.listEyebrow, { textAlign, writingDirection }]}>{copy.currentEyebrow}</Text>
              <Text style={[styles.listTitle, { textAlign, writingDirection }]}>{copy.currentTitle}</Text>
            </View>
            <StatusPill compact copy={copy} decision={featured.my_decision} rtl={rtl} status={featured.status} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => void openIntroduction(featured)}
            style={({ pressed }) => [styles.featuredCard, pressed ? styles.cardPressed : null]}
          >
            <ProfilePortrait
              height={portraitHeight}
              initials={featuredPreview?.display_name?.trim().charAt(0) || "م"}
              privacyLabel={copy.privatePhoto}
              rtl={rtl}
              uri={featuredPreview?.primary_photo_url}
            />
            <View style={[styles.featuredContent, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.featuredName, { textAlign, writingDirection }]}>
                {featuredPreview?.display_name ?? copy.privateIntroduction}
              </Text>
              <Text style={[styles.featuredMeta, { textAlign, writingDirection }]}>
                {formatFeaturedMeta(featuredPreview, copy)}
              </Text>
              {featuredHasTrust ? (
                <View style={styles.featuredTrust}>
                  <TrustBadges
                    compact
                    locale={locale}
                    realPersonVerified={Boolean(featuredPreview?.real_person_verified)}
                    age18PlusVerified={Boolean(featuredPreview?.age_18_plus_verified)}
                    identityVerified={Boolean(featuredPreview?.identity_verified)}
                  />
                </View>
              ) : null}
              <View style={styles.featuredReasons}>
                <ReasonRow rtl={rtl} text={copy.reasonMutualPreferences} compact />
                <ReasonRow rtl={rtl} text={copy.reasonPrivacy} compact />
              </View>
              <View style={[styles.openRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <Text style={[styles.openText, { textAlign, writingDirection }]}>{copy.openIntroduction}</Text>
                <AppIcon name="back" active size={17} />
              </View>
            </View>
          </Pressable>

          {history.length > 0 ? (
            <View style={styles.historySection}>
              <Text style={[styles.historyTitle, { textAlign, writingDirection }]}>{copy.history}</Text>
              <View style={styles.historyList}>
                {history.map((item) => (
                  <HistoryRow
                    copy={copy}
                    item={item}
                    key={item.introduction_id}
                    onPress={() => void openIntroduction(item)}
                    rtl={rtl}
                    unreadCount={unreadCounts[item.introduction_id] ?? 0}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function formatFeaturedMeta(preview: PreviewRow | null, copy: ReturnType<typeof introductionCopy>) {
  if (!preview) return copy.privateMember;
  const values = [
    preview.age_band_id ? ageBands[preview.age_band_id - 1] : null,
    preview.city,
    preview.country_code,
  ].filter(Boolean);
  return values.join(" · ") || copy.privateMember;
}

function HistoryRow({
  item,
  unreadCount,
  copy,
  rtl,
  onPress,
}: {
  item: IntroductionRow;
  unreadCount: number;
  copy: ReturnType<typeof introductionCopy>;
  rtl: boolean;
  onPress: () => void;
}) {
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.historyRow,
        { flexDirection: rtl ? "row-reverse" : "row" },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.historyMark}>
        <AppIcon name="account" active size={18} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.historyName, { textAlign, writingDirection }]}>{copy.privateIntroduction}</Text>
        <Text style={[styles.historyDate, { textAlign, writingDirection }]}>
          {new Date(item.created_at).toLocaleDateString(rtl ? "ar-LY" : "en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </View>
      {unreadCount > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ReasonRow({ text, rtl, compact = false }: { text: string; rtl: boolean; compact?: boolean }) {
  return (
    <View style={[styles.reasonRow, compact ? styles.reasonRowCompact : null, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <Text style={styles.checkMark}>✓</Text>
      <Text style={[styles.reasonText, compact ? styles.reasonTextCompact : null, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>
        {text}
      </Text>
    </View>
  );
}

function StatusPill({
  rtl,
  status,
  decision,
  copy,
  compact = false,
}: {
  rtl: boolean;
  status: IntroductionStatus;
  decision: IntroductionDecision;
  copy: ReturnType<typeof introductionCopy>;
  compact?: boolean;
}) {
  const label =
    status === "mutually_accepted"
      ? copy.status.mutually_accepted
      : status === "offered" && decision === "accepted"
        ? copy.status.waiting
        : copy.status[status];
  return (
    <View style={[styles.statusPill, compact ? styles.statusPillCompact : null, { flexDirection: rtl ? "row-reverse" : "row" }]}>
      <View style={styles.statusDot} />
      <Text style={[styles.statusText, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>
        {label}
      </Text>
    </View>
  );
}

function Fact({ rtl, label, value }: { rtl: boolean; label: string; value: string }) {
  return (
    <View style={[styles.fact, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
      <Text style={[styles.factLabel, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>{label}</Text>
      <Text style={[styles.factValue, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>{value}</Text>
    </View>
  );
}

function introductionCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  const status = ar
    ? {
        offered: "بانتظار قرارك",
        waiting: "تم اهتمامك · بانتظار النتيجة",
        mutually_accepted: "اهتمام متبادل",
        declined: "تم الاعتذار",
        expired: "انتهت المهلة",
        cancelled: "أُلغي التعارف",
        closed: "مغلق",
      }
    : {
        offered: "Waiting for your decision",
        waiting: "Interested · waiting for outcome",
        mutually_accepted: "Mutual interest",
        declined: "Declined",
        expired: "Expired",
        cancelled: "Cancelled",
        closed: "Closed",
      };
  const maritalStatus = ar
    ? {
        never_married: "لم يسبق الزواج",
        married: "متزوج/ة",
        divorced: "مطلق/ة",
        widowed: "أرمل/ة",
      }
    : {
        never_married: "Never married",
        married: "Married",
        divorced: "Divorced",
        widowed: "Widowed",
      };

  return {
    title: ar ? "التعارف" : "Introductions",
    body: ar ? "تعارف خاص ومدروس، وليس قائمة أشخاص للتصفح." : "A private, considered introduction—not a catalogue of people.",
    currentEyebrow: ar ? "التعارف الحالي" : "CURRENT INTRODUCTION",
    currentTitle: ar ? "شخص واحد يستحق التعرّف عليه بهدوء" : "One person worth considering calmly",
    privateIntroduction: ar ? "تعارف خاص" : "Private introduction",
    privateMember: ar ? "عضو ميثاق" : "Mithaq member",
    privatePhoto: ar ? "صورة خاصة بالتعارف" : "Introduction-only photo",
    openIntroduction: ar ? "مراجعة التعارف" : "Review introduction",
    detailTitle: ar ? "التعارف الخاص" : "Private introduction",
    backToList: ar ? "العودة إلى التعارفات" : "Back to introductions",
    whyEyebrow: ar ? "لماذا ظهر هذا التعارف؟" : "WHY THIS APPEARED",
    whyTitle: ar ? "اختيار منضبط قبل أن يظهر لك الملف" : "A controlled selection before a profile reaches you",
    reasonMutualPreferences: ar ? "فُحصت المتطلبات الأساسية في الاتجاهين قبل إنشاء التعارف." : "Core requirements were checked in both directions before the introduction was created.",
    reasonEligibility: ar ? "الحسابان مؤهلان للمشاركة وفق ضوابط الأمان والملف." : "Both accounts are eligible under profile and safety participation controls.",
    reasonPrivacy: ar ? "يبقى قرار كل طرف خاصاً حتى يصبح القبول متبادلاً." : "Each decision remains private unless interest becomes mutual.",
    trustNote: ar ? "تعرض ميثاق فقط ما تم التحقق منه فعلياً؛ بقية تفاصيل الملف يصرّح بها العضو بنفسه." : "Mithaq shows only checks it actually verified; other profile details remain member-declared.",
    about: ar ? "نبذة شخصية" : "About",
    decisionTitle: ar ? "هل ترغب في متابعة هذا التعارف؟" : "Would you like to continue this introduction?",
    privateTitle: ar ? "خصوصية متبادلة" : "Mutual privacy",
    privateBody: ar ? "لا نعرض قرار الطرف الآخر قبل القبول المتبادل، ولا نكشف الهاتف أو أي بيانات خارج هذا التعارف." : "We do not reveal the other person’s decision before mutual interest, and phone numbers remain private.",
    safety: ar ? "الأمان أو الإبلاغ عن مشكلة" : "Safety or report a concern",
    accept: ar ? "مهتم بالمتابعة" : "I’m interested",
    decline: ar ? "غير مناسب لي" : "Not for me",
    acceptedTitle: ar ? "تم حفظ اهتمامك" : "Your interest is saved",
    acceptedBody: ar ? "لن نكشف قرار الطرف الآخر. سنخبرك فقط إذا أصبح القبول متبادلاً." : "We will not reveal the other person’s decision. You will only be notified if interest becomes mutual.",
    mutualTitle: ar ? "الاهتمام متبادل" : "Interest is mutual",
    mutualBody: ar ? "اختار الطرفان المتابعة. يمكنك الآن الانتقال إلى الخطوة التي تفتح التواصل الخاص." : "Both people chose to continue. You can now move to the protected communication handoff.",
    continueAfterMutual: ar ? "فتح الخطوة التالية" : "Open the next step",
    emptyTitle: ar ? "لا يوجد تعارف حالياً" : "No introduction right now",
    emptyBody: ar ? "هذا طبيعي. يبقى ملفك مؤهلاً، ويظهر التعارف فقط عندما يجتاز الطرفان المتطلبات الأساسية." : "That is normal. Your profile remains eligible, and an introduction appears only when both people pass the core requirements.",
    reviewProfile: ar ? "مراجعة ملفي وتفضيلاتي" : "Review my profile and preferences",
    history: ar ? "التعارفات السابقة" : "Previous introductions",
    errorTitle: ar ? "تعذر تحميل التعارفات" : "We couldn’t load introductions",
    errorBody: ar ? "لم يتم تغيير أي قرار. تحقق من اتصالك وحاول مرة أخرى." : "No decision was changed. Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    previewUnavailableTitle: ar ? "المعاينة غير متاحة" : "Preview unavailable",
    previewUnavailable: ar ? "قد يكون التعارف منتهياً أو أُغلق بسبب الخصوصية أو الأهلية أو الحظر أو إعدادات السلامة." : "The introduction may have expired or closed because of privacy, eligibility, blocking, or safety controls.",
    actionUnavailable: ar ? "تعذر حفظ قرارك الآن. لم نغيّر حالة التعارف." : "We couldn’t save your decision. The introduction state was not changed.",
    member: ar ? "عضو ميثاق" : "Mithaq member",
    marital: ar ? "الحالة الاجتماعية" : "Marital status",
    children: ar ? "الأطفال" : "Children",
    origin: ar ? "المنطقة الأصلية" : "Origin region",
    occupation: ar ? "العمل" : "Occupation",
    education: ar ? "التعليم" : "Education",
    yes: ar ? "نعم" : "Yes",
    no: ar ? "لا" : "No",
    maritalStatus,
    status,
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.62 },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.994 }] },
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  loadingPortrait: { minHeight: 230, alignItems: "center", justifyContent: "center", borderRadius: radius.xl, backgroundColor: colors.primaryWash },
  listPage: { width: "100%" },
  sectionHeader: { width: "100%", alignItems: "flex-end", gap: 12, marginBottom: 14 },
  listEyebrow: { width: "100%", color: colors.gold, fontSize: 10, lineHeight: 16, fontWeight: "800" },
  listTitle: { width: "100%", color: colors.foreground, fontSize: 20, lineHeight: 31, fontWeight: "800", marginTop: 2 },
  featuredCard: { width: "100%", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, overflow: "hidden", ...shadows.card },
  featuredContent: { width: "100%", paddingHorizontal: 19, paddingTop: 17, paddingBottom: 18 },
  featuredName: { width: "100%", color: colors.foreground, fontSize: 24, lineHeight: 36, fontWeight: "800" },
  featuredMeta: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 2 },
  featuredTrust: { width: "100%", marginTop: 10 },
  featuredReasons: { width: "100%", gap: 7, marginTop: 13, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  openRow: { width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 15 },
  openText: { flex: 1, color: colors.primary, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  statusPill: { alignItems: "center", gap: 7, borderRadius: radius.pill, backgroundColor: colors.primaryWash, paddingHorizontal: 10, paddingVertical: 7 },
  statusPillCompact: { paddingHorizontal: 8, paddingVertical: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  statusText: { color: colors.primaryStrong, fontSize: 9, lineHeight: 13, fontWeight: "800" },
  historySection: { width: "100%", marginTop: 26 },
  historyTitle: { width: "100%", color: colors.foreground, fontSize: 15, lineHeight: 23, fontWeight: "800", marginBottom: 10 },
  historyList: { width: "100%", gap: 8 },
  historyRow: { width: "100%", minHeight: 70, alignItems: "center", gap: 11, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: 13, paddingVertical: 10 },
  historyMark: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  historyName: { width: "100%", color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "800" },
  historyDate: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  unreadBadge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, paddingHorizontal: 6 },
  unreadBadgeText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  emptyState: { width: "100%", minHeight: 360, justifyContent: "center", gap: 8 },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryWash, marginBottom: 7 },
  emptyTitle: { width: "100%", color: colors.foreground, fontSize: 22, lineHeight: 33, fontWeight: "800" },
  emptyBody: { width: "100%", color: colors.muted, fontSize: 13, lineHeight: 22 },
  emptyAction: { width: "100%", marginTop: 10 },
  detailPage: { width: "100%", gap: 17 },
  backButton: { minHeight: 42, alignItems: "center", gap: 7 },
  backText: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "800" },
  identity: { width: "100%", gap: 5 },
  detailName: { width: "100%", color: colors.foreground, fontSize: 27, lineHeight: 37, fontWeight: "900", marginTop: 4 },
  detailMeta: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20 },
  trustBlock: { width: "100%", gap: 7, marginTop: 7 },
  trustNote: { width: "100%", color: colors.muted, fontSize: 9, lineHeight: 15 },
  section: { width: "100%", borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 16 },
  sectionEyebrow: { width: "100%", color: colors.gold, fontSize: 9, lineHeight: 14, fontWeight: "900" },
  sectionTitle: { width: "100%", color: colors.foreground, fontSize: 16, lineHeight: 25, fontWeight: "800", marginTop: 4 },
  reasonList: { width: "100%", gap: 9, marginTop: 12 },
  reasonRow: { width: "100%", alignItems: "flex-start", gap: 8 },
  reasonRowCompact: { alignItems: "center" },
  checkMark: { color: colors.primary, fontSize: 11, lineHeight: 17, fontWeight: "900" },
  reasonText: { flex: 1, color: colors.foreground, fontSize: 11, lineHeight: 18 },
  reasonTextCompact: { fontSize: 10, lineHeight: 16, color: colors.muted },
  about: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 25, marginTop: 8 },
  factGrid: { width: "100%", gap: 8 },
  fact: { width: "100%", borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 13 },
  factLabel: { width: "100%", color: colors.muted, fontSize: 9, lineHeight: 14, fontWeight: "700" },
  factValue: { width: "100%", color: colors.foreground, fontSize: 12, lineHeight: 19, fontWeight: "800", marginTop: 3 },
  privacyNote: { width: "100%", alignItems: "flex-start", gap: 11, borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 14 },
  privacyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  privacyTitle: { width: "100%", color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  privacyBody: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 2 },
  decisionSection: { width: "100%", gap: 9 },
  decisionTitle: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "800", marginBottom: 2 },
  safetyLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  safetyText: { color: colors.danger, fontSize: 11, lineHeight: 17, fontWeight: "800" },
  error: { width: "100%", color: colors.danger, fontSize: 11, lineHeight: 18, fontWeight: "700" },
});