import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";

type IntroductionStatus = "offered" | "mutually_accepted" | "declined" | "expired" | "cancelled" | "closed";

type IntroductionDecision = "pending" | "accepted" | "declined";

type IntroductionRow = {
  introduction_id: string;
  status: IntroductionStatus;
  my_decision: IntroductionDecision;
  created_at: string;
  expires_at: string;
};

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
  marital_status: "never_married" | "divorced" | "widowed" | null;
  has_children: boolean | null;
};

const ageBands = ["18–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–54", "55+"];

export default function IntroductionsScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => introductionCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<IntroductionRow[]>([]);
  const [selected, setSelected] = useState<IntroductionRow | null>(null);
  const [preview, setPreview] = useState<PreviewRow | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    if (!sessionData.session) {
      router.replace({ pathname: "/auth", params: { locale } });
      return;
    }

    const { data, error } = await supabase.rpc("list_my_introductions");
    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as IntroductionRow[]);
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openIntroduction(item: IntroductionRow) {
    setSelected(item);
    setPreview(null);
    setActionError(null);
    setPreviewLoading(true);

    const { data, error } = await supabase.rpc("get_introduction_preview", {
      p_introduction_id: item.introduction_id,
    });

    if (error) {
      setPreviewLoading(false);
      setActionError(copy.previewUnavailable);
      return;
    }

    const row = ((Array.isArray(data) ? data[0] : data) ?? null) as PreviewRow | null;
    setPreview(row);
    setPreviewLoading(false);
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
    setSelected((current) =>
      current
        ? {
            ...current,
            status: nextStatus,
            my_decision: accept ? "accepted" : "declined",
          }
        : current,
    );
    setItems((current) =>
      current.map((item) =>
        item.introduction_id === selected.introduction_id
          ? {
              ...item,
              status: nextStatus,
              my_decision: accept ? "accepted" : "declined",
            }
          : item,
      ),
    );
    setActionLoading(false);
  }

  if (selected) {
    const canRespond = selected.status === "offered" && selected.my_decision === "pending";
    return (
      <ScreenShell
        eyebrow={copy.privateEyebrow}
        title={copy.detailTitle}
        body={copy.detailBody}
        rtl={rtl}
        footer={
          <PrimaryButton tone="quiet" onPress={() => setSelected(null)}>
            {copy.backToList}
          </PrimaryButton>
        }
      >
        <View style={styles.stack}>
          <StatusPill rtl={rtl} status={selected.status} decision={selected.my_decision} copy={copy} />

          {previewLoading ? (
            <View style={styles.loadingState} accessibilityLabel={copy.loadingPreview}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : preview ? (
            <View style={styles.profileCard}>
              <View style={[styles.identityRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{preview.display_name?.trim().charAt(0) || "م"}</Text>
                </View>
                <View style={styles.identityCopy}>
                  <Text style={[styles.name, { textAlign: rtl ? "right" : "left" }]}>
                    {preview.display_name ?? copy.member}
                  </Text>
                  <Text style={[styles.meta, { textAlign: rtl ? "right" : "left" }]}>
                    {preview.gender ? copy.gender[preview.gender] : copy.member} ·{" "}
                    {preview.age_band_id ? ageBands[preview.age_band_id - 1] : "—"}
                  </Text>
                  <Text style={[styles.meta, { textAlign: rtl ? "right" : "left" }]}>
                    {[preview.city, preview.country_code].filter(Boolean).join(", ")}
                  </Text>
                </View>
              </View>

              <View style={styles.rule} />
              <Text style={[styles.sectionLabel, { textAlign: rtl ? "right" : "left" }]}>{copy.about}</Text>
              <Text style={[styles.about, { textAlign: rtl ? "right" : "left" }]}>{preview.about_me ?? "—"}</Text>

              <View style={styles.factGrid}>
                {preview.marital_status ? (
                  <Fact rtl={rtl} label={copy.marital} value={copy.maritalStatus[preview.marital_status]} />
                ) : null}
                {preview.has_children !== null ? (
                  <Fact rtl={rtl} label={copy.children} value={preview.has_children ? copy.yes : copy.no} />
                ) : null}
                {preview.origin_region ? <Fact rtl={rtl} label={copy.origin} value={preview.origin_region} /> : null}
                {preview.occupation ? <Fact rtl={rtl} label={copy.occupation} value={preview.occupation} /> : null}
                {preview.education ? <Fact rtl={rtl} label={copy.education} value={preview.education} /> : null}
              </View>
            </View>
          ) : (
            <StateCard rtl={rtl} tone="neutral" title={copy.previewUnavailableTitle} body={copy.previewUnavailable} />
          )}

          <View style={styles.privacyCard}>
            <Text style={[styles.privacyTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.privateTitle}</Text>
            <Text style={[styles.privacyBody, { textAlign: rtl ? "right" : "left" }]}>{copy.privateBody}</Text>
          </View>

          <PrimaryButton
            tone="quiet"
            onPress={() =>
              router.push({
                pathname: "/introduction-safety",
                params: { locale, introductionId: selected.introduction_id },
              })
            }
          >
            {copy.safety}
          </PrimaryButton>

          {actionError ? (
            <Text accessibilityRole="alert" style={[styles.error, { textAlign: rtl ? "right" : "left" }]}>
              {actionError}
            </Text>
          ) : null}

          {canRespond ? (
            <View style={styles.actions}>
              <PrimaryButton loading={actionLoading} onPress={() => void respond(true)}>
                {copy.accept}
              </PrimaryButton>
              <PrimaryButton tone="quiet" disabled={actionLoading} onPress={() => void respond(false)}>
                {copy.decline}
              </PrimaryButton>
            </View>
          ) : selected.my_decision === "accepted" && selected.status === "offered" ? (
            <StateCard rtl={rtl} tone="neutral" title={copy.acceptedTitle} body={copy.acceptedBody} />
          ) : selected.status === "mutually_accepted" ? (
            <View style={styles.actions}>
              <StateCard rtl={rtl} tone="success" title={copy.mutualTitle} body={copy.mutualBody} />
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
        </View>
      </ScreenShell>
    );
  }

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
        <View style={styles.loadingState} accessibilityLabel={copy.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <StateCard
          rtl={rtl}
          tone="error"
          title={copy.errorTitle}
          body={copy.errorBody}
          actionLabel={copy.retry}
          onAction={() => void load()}
        />
      ) : items.length === 0 ? (
        <StateCard rtl={rtl} tone="neutral" title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <View style={styles.stack}>
          <View style={styles.introHero}>
            <Text style={[styles.introHeroTitle, { textAlign: rtl ? "right" : "left" }]}>{copy.heroTitle}</Text>
            <Text style={[styles.introHeroBody, { textAlign: rtl ? "right" : "left" }]}>{copy.heroBody}</Text>
          </View>

          {items.map((item) => (
            <Pressable
              key={item.introduction_id}
              accessibilityRole="button"
              onPress={() => void openIntroduction(item)}
              style={({ pressed }) => [styles.itemCard, pressed ? styles.pressed : null]}
            >
              <View style={[styles.itemTop, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <View style={styles.itemCopy}>
                  <Text style={[styles.itemTitle, { textAlign: rtl ? "right" : "left" }]}>
                    {copy.privateIntroduction}
                  </Text>
                  <Text style={[styles.itemDate, { textAlign: rtl ? "right" : "left" }]}>
                    {new Date(item.created_at).toLocaleDateString(locale === "ar" ? "ar-LY" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                <View style={styles.chevron}>
                  <Text style={styles.chevronText}>{rtl ? "‹" : "›"}</Text>
                </View>
              </View>
              <StatusPill rtl={rtl} status={item.status} decision={item.my_decision} copy={copy} compact />
            </Pressable>
          ))}
        </View>
      )}
    </ScreenShell>
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
    <View style={[styles.statusPill, compact ? styles.statusPillCompact : null]}>
      <View style={styles.statusDot} />
      <Text style={[styles.statusText, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
    </View>
  );
}

function Fact({ rtl, label, value }: { rtl: boolean; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { textAlign: rtl ? "right" : "left" }]}>{label}</Text>
      <Text style={[styles.factValue, { textAlign: rtl ? "right" : "left" }]}>{value}</Text>
    </View>
  );
}

function introductionCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      eyebrow: "تعارف خاص",
      title: "تعارفاتك",
      body: "لا يوجد تصفح عام أو سحب ملفات. يظهر هنا فقط التعارف الذي ينشئه ميثاق وفق الأهلية والخصوصية والحظر.",
      heroTitle: "تعارف واحد، قرار واضح",
      heroBody:
        "يمكنك مراجعة المعلومات التي وافق الطرف الآخر على مشاركتها ثم القبول أو الاعتذار. قرار الطرف الآخر يبقى خاصاً حتى يصبح القبول متبادلاً.",
      privateIntroduction: "تعارف خاص",
      privateEyebrow: "معاينة التعارف",
      detailTitle: "راجع التعارف بهدوء",
      detailBody: "هذه المعاينة مقيدة بهذا التعارف فقط وليست ملفاً عاماً أو قابلاً للبحث.",
      privateTitle: "خصوصية متبادلة",
      privateBody: "لا نعرض لك قرار الطرف الآخر قبل القبول المتبادل. الحظر أو قيود السلامة توقف التعارف من جهة الخادم.",
      safety: "الأمان والإبلاغ",
      accept: "أرغب في المتابعة",
      decline: "الاعتذار عن التعارف",
      acceptedTitle: "تم حفظ قبولك",
      acceptedBody: "لن نكشف قرار الطرف الآخر. سنخبرك فقط إذا أصبح القبول متبادلاً.",
      mutualTitle: "القبول متبادل",
      mutualBody: "تم قبول التعارف من الطرفين. تبقى الخطوة التالية خاضعة لقواعد الأمان والخصوصية قبل فتح أي تواصل.",
      continueAfterMutual: "متابعة الخطوة التالية",
      emptyTitle: "لا توجد تعارفات حالياً",
      emptyBody: "هذا طبيعي. ميثاق لا يعرض كتالوجاً من الأعضاء ولا ينشئ تعارفاً لمجرد وجود ملف مكتمل.",
      errorTitle: "تعذر تحميل التعارفات",
      errorBody: "لم يتم تغيير أي قرار. تحقق من اتصالك وحاول مرة أخرى.",
      retry: "إعادة المحاولة",
      back: "العودة",
      backToList: "العودة إلى التعارفات",
      loading: "جارٍ تحميل التعارفات",
      loadingPreview: "جارٍ تحميل معاينة التعارف",
      previewUnavailableTitle: "المعاينة غير متاحة",
      previewUnavailable: "قد يكون التعارف منتهياً أو أُغلق بسبب الأهلية أو الحظر أو إعدادات السلامة.",
      actionUnavailable: "تعذر حفظ قرارك الآن. لم نغيّر حالة التعارف.",
      member: "عضو ميثاق",
      about: "نبذة",
      marital: "الحالة الاجتماعية",
      children: "الأطفال",
      origin: "المنطقة الأصلية",
      occupation: "العمل",
      education: "التعليم",
      yes: "نعم",
      no: "لا",
      gender: { woman: "امرأة", man: "رجل" } as const,
      maritalStatus: { never_married: "لم يسبق الزواج", divorced: "مطلق/ة", widowed: "أرمل/ة" } as const,
      status: {
        offered: "بانتظار قرارك",
        waiting: "تم قبولك · بانتظار النتيجة",
        mutually_accepted: "قبول متبادل",
        declined: "تم الاعتذار",
        expired: "انتهت المهلة",
        cancelled: "أُلغي التعارف",
        closed: "مغلق",
      } as const,
    };
  }

  return {
    eyebrow: "Private introductions",
    title: "Your introductions",
    body: "There is no public browsing or swipe deck. Only introductions created by Mithaq under eligibility, privacy, and blocking rules appear here.",
    heroTitle: "One introduction, one clear decision",
    heroBody:
      "Review only what the other member chose to disclose, then accept or decline. Their decision stays private until acceptance is mutual.",
    privateIntroduction: "Private introduction",
    privateEyebrow: "Introduction preview",
    detailTitle: "Review the introduction calmly",
    detailBody: "This preview is scoped to this introduction. It is not a public or searchable profile.",
    privateTitle: "Mutual privacy",
    privateBody:
      "We never reveal the other member’s decision before mutual acceptance. Blocking or safety restrictions stop the introduction server-side.",
    safety: "Safety & report",
    accept: "I’d like to continue",
    decline: "Decline introduction",
    acceptedTitle: "Your acceptance is saved",
    acceptedBody: "We will not reveal the other member’s decision. You will only be told if acceptance becomes mutual.",
    mutualTitle: "Acceptance is mutual",
    mutualBody:
      "Both members accepted. The next step remains subject to safety and privacy controls before any communication opens.",
    continueAfterMutual: "Continue to the next step",
    emptyTitle: "No introductions right now",
    emptyBody:
      "That is normal. Mithaq does not show a member catalogue or create introductions simply because a profile is complete.",
    errorTitle: "We couldn’t load introductions",
    errorBody: "No decision was changed. Check your connection and try again.",
    retry: "Try again",
    back: "Back",
    backToList: "Back to introductions",
    loading: "Loading introductions",
    loadingPreview: "Loading introduction preview",
    previewUnavailableTitle: "Preview unavailable",
    previewUnavailable:
      "The introduction may have expired or closed because of eligibility, blocking, or safety controls.",
    actionUnavailable: "We couldn’t save your decision. The introduction state was not changed.",
    member: "Mithaq member",
    about: "About",
    marital: "Marital status",
    children: "Children",
    origin: "Origin region",
    occupation: "Occupation",
    education: "Education",
    yes: "Yes",
    no: "No",
    gender: { woman: "Woman", man: "Man" } as const,
    maritalStatus: { never_married: "Never married", divorced: "Divorced", widowed: "Widowed" } as const,
    status: {
      offered: "Waiting for your decision",
      waiting: "Accepted · waiting for outcome",
      mutually_accepted: "Mutual acceptance",
      declined: "Declined",
      expired: "Expired",
      cancelled: "Cancelled",
      closed: "Closed",
    } as const,
  };
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  loadingState: { minHeight: 220, alignItems: "center", justifyContent: "center" },
  introHero: { borderRadius: radius.lg, backgroundColor: colors.primary, padding: 18 },
  introHeroTitle: { color: colors.white, fontSize: 17, fontWeight: "800" },
  introHeroBody: { color: "rgba(255,255,255,0.76)", fontSize: 13, lineHeight: 21, marginTop: 7 },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
    gap: 13,
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.995 }] },
  itemTop: { alignItems: "center", gap: 12 },
  itemCopy: { flex: 1 },
  itemTitle: { color: colors.foreground, fontSize: 15, fontWeight: "800" },
  itemDate: { color: colors.muted, fontSize: 12, marginTop: 4 },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  chevronText: { color: colors.primary, fontSize: 22, fontWeight: "700" },
  statusPill: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusPillCompact: { alignSelf: "flex-start" },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  statusText: { color: colors.primary, fontSize: 12, fontWeight: "800", flexShrink: 1 },
  profileCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    padding: 18,
  },
  identityRow: { alignItems: "center", gap: 13 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarText: { color: colors.primary, fontSize: 23, fontWeight: "900" },
  identityCopy: { flex: 1 },
  name: { color: colors.foreground, fontSize: 20, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: 17 },
  sectionLabel: { color: colors.primary, fontSize: 12, fontWeight: "800", marginBottom: 7 },
  about: { color: colors.foreground, fontSize: 14, lineHeight: 23 },
  factGrid: { gap: 9, marginTop: 17 },
  fact: { borderRadius: radius.md, backgroundColor: colors.surfaceMuted, paddingHorizontal: 13, paddingVertical: 11 },
  factLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  factValue: { color: colors.foreground, fontSize: 13, fontWeight: "700", marginTop: 3 },
  privacyCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryWash,
    padding: 15,
  },
  privacyTitle: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  privacyBody: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 5 },
  actions: { gap: 10 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, fontWeight: "700" },
});
