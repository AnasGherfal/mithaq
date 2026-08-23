import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { ProfilePortrait } from "@/components/profile-portrait";
import { RecognizedPersonAction } from "@/components/recognized-person-action";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import { TrustBadges } from "@/components/trust-badges";
import type { MobileLocale } from "@/i18n";
import { hideRecognizedIntroductionMember } from "@/lib/recognized-pair-hide";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type IntroductionStatus = "offered" | "mutually_accepted" | "declined" | "expired" | "cancelled" | "closed";
type IntroductionDecision = "pending" | "accepted" | "declined";
type IntroductionPresentationMode = "open_profile" | "controlled_reveal";
type IntroductionReason =
  "same_city" | "living_arrangement" | "children_plan" | "work_after_marriage" | "wedding_style";

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
  age_band_label: string | null;
  country_code: string | null;
  city: string | null;
  origin_region: string | null;
  marital_status: "never_married" | "married" | "divorced" | "widowed" | null;
  has_children: boolean | null;
  primary_photo_url: string | null;
  presentation_mode: IntroductionPresentationMode | null;
  alignment_reasons: string[] | null;
  real_person_verified: boolean | null;
  age_18_plus_verified: boolean | null;
  identity_verified: boolean | null;
};

const reasonValues: IntroductionReason[] = [
  "same_city",
  "living_arrangement",
  "children_plan",
  "work_after_marriage",
  "wedding_style",
];

export default function IntroductionsScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const { height } = useWindowDimensions();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const copy = useMemo(() => introductionCopy(locale), [locale]);
  const portraitHeight = height < 760 ? 218 : 280;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [items, setItems] = useState<IntroductionRow[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [previewCache, setPreviewCache] = useState<Record<string, PreviewRow | null>>({});
  const [selected, setSelected] = useState<IntroductionRow | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<"accepted" | "declined" | null>(null);
  const [recognitionConfirm, setRecognitionConfirm] = useState(false);
  const [recognizedIntroductionId, setRecognizedIntroductionId] = useState<string | null>(null);

  const decisionX = useRef(new Animated.Value(0)).current;
  const decisionOpacity = useRef(new Animated.Value(1)).current;
  const decisionScale = useRef(new Animated.Value(1)).current;

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
    setRecognitionConfirm(false);
    setRecognizedIntroductionId(null);

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
      if (introductionResult.error || unreadResult.error) {
        throw introductionResult.error ?? unreadResult.error;
      }

      const rows = (introductionResult.data ?? []) as IntroductionRow[];
      const unreadMap: Record<string, number> = {};
      for (const row of (unreadResult.data ?? []) as UnreadRow[]) {
        unreadMap[row.introduction_id] = Number(row.unread_count) || 0;
      }

      setItems(rows);
      setUnreadCounts(unreadMap);

      const first =
        rows.find((item) => item.status === "offered" || item.status === "mutually_accepted") ?? rows[0] ?? null;
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
    resetDecisionMotion();
    setDecisionFeedback(null);
    setRecognitionConfirm(false);
    setRecognizedIntroductionId(null);
    setSelected(item);
    setActionError(null);
    if (Object.prototype.hasOwnProperty.call(previewCache, item.introduction_id)) return;

    setPreviewLoading(true);
    const row = await fetchPreview(item.introduction_id);
    setPreviewCache((current) => ({ ...current, [item.introduction_id]: row }));
    setPreviewLoading(false);
    if (!row) setActionError(copy.previewUnavailable);
  }

  function closeDetail() {
    setSelected(null);
    setActionError(null);
    setDecisionFeedback(null);
    setRecognitionConfirm(false);
    setRecognizedIntroductionId(null);
    resetDecisionMotion();
  }

  function resetDecisionMotion() {
    decisionX.setValue(0);
    decisionOpacity.setValue(1);
    decisionScale.setValue(1);
  }

  function animateAccepted() {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(decisionX, {
          toValue: 24,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(decisionScale, {
          toValue: 1.018,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(decisionX, {
        toValue: 0,
        damping: 15,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.spring(decisionScale, {
        toValue: 1,
        damping: 16,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function animateDeclined(onComplete: () => void) {
    Animated.parallel([
      Animated.timing(decisionX, {
        toValue: -48,
        duration: 240,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(decisionOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(decisionScale, {
        toValue: 0.985,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
      resetDecisionMotion();
    });
  }

  async function respond(accept: boolean) {
    if (!selected || actionLoading || recognitionConfirm) return;
    setActionLoading(true);
    setActionError(null);
    setDecisionFeedback(null);

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
    const introductionId = selected.introduction_id;

    setSelected((current) => (current ? { ...current, status: nextStatus, my_decision: nextDecision } : current));
    setItems((current) =>
      current.map((item) =>
        item.introduction_id === introductionId ? { ...item, status: nextStatus, my_decision: nextDecision } : item,
      ),
    );
    setDecisionFeedback(accept ? "accepted" : "declined");
    setActionLoading(false);

    if (accept) {
      animateAccepted();
      return;
    }

    animateDeclined(() => {
      setSelected(null);
      setDecisionFeedback(null);
      setRecognitionConfirm(false);
    });
  }

  async function confirmRecognizedHide() {
    if (!selected || actionLoading || !recognitionConfirm) return;
    const introductionId = selected.introduction_id;
    setActionLoading(true);
    setActionError(null);

    try {
      await hideRecognizedIntroductionMember(introductionId);
      setItems((current) =>
        current.map((item) =>
          item.introduction_id === introductionId ? { ...item, status: "cancelled" as IntroductionStatus } : item,
        ),
      );
      setPreviewCache((current) => ({ ...current, [introductionId]: null }));
      setRecognitionConfirm(false);
      setRecognizedIntroductionId(introductionId);
    } catch {
      setActionError(copy.recognizedError);
    } finally {
      setActionLoading(false);
    }
  }

  if (selected && recognizedIntroductionId === selected.introduction_id) {
    return (
      <ScreenShell title={copy.detailTitle} rtl={rtl}>
        <StateCard
          rtl={rtl}
          tone="neutral"
          title={copy.recognizedSuccessTitle}
          body={copy.recognizedSuccessBody}
          actionLabel={copy.backToList}
          onAction={closeDetail}
        />
      </ScreenShell>
    );
  }

  if (selected) {
    const preview = previewCache[selected.introduction_id] ?? null;
    const canRespond = selected.status === "offered" && selected.my_decision === "pending";
    const canRecognize = Boolean(preview) && (selected.status === "offered" || selected.status === "mutually_accepted");
    const initials = preview?.display_name?.trim().charAt(0) || "م";
    const location = [preview?.city, preview?.country_code].filter(Boolean).join(" · ");
    const hasTrust = Boolean(
      preview && (preview.real_person_verified || preview.age_18_plus_verified || preview.identity_verified),
    );
    const reasons = normalizeReasons(preview?.alignment_reasons);
    const presentationMode = preview?.presentation_mode === "open_profile" ? "open_profile" : "controlled_reveal";

    return (
      <ScreenShell title={copy.detailTitle} rtl={rtl}>
        <Animated.View
          style={[
            styles.detailPage,
            {
              opacity: decisionOpacity,
              transform: [{ translateX: decisionX }, { scale: decisionScale }],
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={closeDetail}
            style={({ pressed }) => [
              styles.backButton,
              {
                alignSelf: rtl ? "flex-end" : "flex-start",
                flexDirection: rtl ? "row-reverse" : "row",
              },
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
              <View style={styles.presentationRow}>
                <View style={presentationMode === "open_profile" ? styles.openModePill : styles.privateModePill}>
                  <Text style={presentationMode === "open_profile" ? styles.openModeText : styles.privateModeText}>
                    {presentationMode === "open_profile" ? copy.openProfile : copy.controlledReveal}
                  </Text>
                </View>
              </View>

              <ProfilePortrait
                height={portraitHeight}
                initials={initials}
                privacyLabel={presentationMode === "open_profile" ? copy.openPhotoLabel : copy.privatePhoto}
                rtl={rtl}
                uri={preview.primary_photo_url}
              />

              <View style={[styles.identity, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                <StatusPill copy={copy} decision={selected.my_decision} rtl={rtl} status={selected.status} />
                <Text style={[styles.detailName, { textAlign, writingDirection }]}>
                  {preview.display_name ?? copy.member}
                </Text>
                <Text style={[styles.detailMeta, { textAlign, writingDirection }]}>
                  {[preview.age_band_label, location || null].filter(Boolean).join(" · ") || copy.privateMember}
                </Text>
                {hasTrust ? (
                  <View style={styles.trustBlock}>
                    <TrustBadges
                      locale={locale}
                      realPersonVerified={Boolean(preview.real_person_verified)}
                      age18PlusVerified={Boolean(preview.age_18_plus_verified)}
                      identityVerified={Boolean(preview.identity_verified)}
                    />
                    <Text style={[styles.trustNote, { textAlign, writingDirection }]}>{copy.trustNote}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.whySection}>
                <Text style={[styles.sectionEyebrow, { textAlign, writingDirection }]}>{copy.whyEyebrow}</Text>
                <Text style={[styles.sectionTitle, { textAlign, writingDirection }]}>{copy.whyTitle}</Text>
                <Text style={[styles.whyBody, { textAlign, writingDirection }]}>
                  {reasons.length > 0 ? copy.whyBody : copy.whyFallback}
                </Text>
                {reasons.length > 0 ? (
                  <View style={[styles.reasonChips, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    {reasons.map((reason) => (
                      <View key={reason} style={styles.reasonChip}>
                        <Text style={[styles.reasonChipText, { writingDirection }]}>{copy.reason(reason)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={[styles.reasonPrivacy, { textAlign, writingDirection }]}>{copy.reasonPrivacy}</Text>
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
            <StateCard body={copy.previewUnavailable} rtl={rtl} title={copy.previewUnavailableTitle} tone="neutral" />
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
              <Text style={[styles.decisionEyebrow, { textAlign, writingDirection }]}>{copy.yourDecision}</Text>
              <Text style={[styles.decisionTitle, { textAlign, writingDirection }]}>{copy.decisionTitle}</Text>
              <Text style={[styles.decisionBody, { textAlign, writingDirection }]}>{copy.decisionBody}</Text>
              <View style={styles.decisionRow}>
                <DecisionButton
                  direction="left"
                  disabled={actionLoading || recognitionConfirm}
                  label={copy.decline}
                  onPress={() => void respond(false)}
                  sublabel={copy.declineHint}
                />
                <DecisionButton
                  direction="right"
                  disabled={actionLoading || recognitionConfirm}
                  label={copy.accept}
                  loading={actionLoading && !recognitionConfirm}
                  onPress={() => void respond(true)}
                  sublabel={copy.acceptHint}
                />
              </View>
            </View>
          ) : selected.my_decision === "accepted" && selected.status === "offered" ? (
            <View style={styles.waitingCard}>
              <Text style={[styles.waitingMark, { textAlign }]}>✓</Text>
              <Text style={[styles.waitingTitle, { textAlign, writingDirection }]}>{copy.acceptedTitle}</Text>
              <Text style={[styles.waitingBody, { textAlign, writingDirection }]}>{copy.acceptedBody}</Text>
              {decisionFeedback === "accepted" ? (
                <Text accessibilityLiveRegion="polite" style={[styles.waitingFresh, { textAlign, writingDirection }]}>
                  {copy.acceptedFresh}
                </Text>
              ) : null}
            </View>
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

          {canRecognize ? (
            <RecognizedPersonAction
              locale={locale}
              confirming={recognitionConfirm}
              loading={actionLoading && recognitionConfirm}
              onBegin={() => {
                setRecognitionConfirm(true);
                setActionError(null);
              }}
              onCancel={() => setRecognitionConfirm(false)}
              onConfirm={() => void confirmRecognizedHide()}
            />
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={actionLoading}
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
              actionLoading ? styles.disabled : null,
            ]}
          >
            <Text style={[styles.safetyText, { textAlign, writingDirection }]}>{copy.safety}</Text>
          </Pressable>
        </Animated.View>
      </ScreenShell>
    );
  }

  const featuredPreview = featured ? (previewCache[featured.introduction_id] ?? null) : null;
  const featuredHasTrust = Boolean(
    featuredPreview &&
    (featuredPreview.real_person_verified || featuredPreview.age_18_plus_verified || featuredPreview.identity_verified),
  );
  const featuredReasons = normalizeReasons(featuredPreview?.alignment_reasons);

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
            <PrimaryButton tone="quiet" onPress={() => router.push({ pathname: "/profile", params: { locale } })}>
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
              privacyLabel={
                featuredPreview?.presentation_mode === "open_profile" ? copy.openPhotoLabel : copy.privatePhoto
              }
              rtl={rtl}
              uri={featuredPreview?.primary_photo_url}
            />
            <View style={[styles.featuredContent, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
              <View style={styles.featuredTopRow}>
                <View
                  style={
                    featuredPreview?.presentation_mode === "open_profile" ? styles.openModePill : styles.privateModePill
                  }
                >
                  <Text
                    style={
                      featuredPreview?.presentation_mode === "open_profile"
                        ? styles.openModeText
                        : styles.privateModeText
                    }
                  >
                    {featuredPreview?.presentation_mode === "open_profile" ? copy.openProfile : copy.controlledReveal}
                  </Text>
                </View>
              </View>
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
                {(featuredReasons.length > 0 ? featuredReasons.slice(0, 3) : ["same_city" as IntroductionReason]).map(
                  (reason) => (
                    <ReasonRow key={reason} rtl={rtl} text={copy.reason(reason)} compact />
                  ),
                )}
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

function normalizeReasons(values?: string[] | null): IntroductionReason[] {
  return (values ?? []).filter((value): value is IntroductionReason =>
    reasonValues.includes(value as IntroductionReason),
  );
}

function formatFeaturedMeta(preview: PreviewRow | null, copy: ReturnType<typeof introductionCopy>) {
  if (!preview) return copy.privateMember;
  const values = [preview.age_band_label, preview.city, preview.country_code].filter(Boolean);
  return values.join(" · ") || copy.privateMember;
}

function DecisionButton({
  direction,
  label,
  sublabel,
  disabled,
  loading = false,
  onPress,
}: {
  direction: "left" | "right";
  label: string;
  sublabel: string;
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const interested = direction === "right";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.decisionButton,
        interested ? styles.acceptButton : styles.declineButton,
        pressed && !disabled ? styles.decisionPressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <>
          <Text style={interested ? styles.acceptButtonTitle : styles.declineButtonTitle}>
            {interested ? `${label} →` : `← ${label}`}
          </Text>
          <Text style={interested ? styles.acceptButtonHint : styles.declineButtonHint}>{sublabel}</Text>
        </>
      )}
    </Pressable>
  );
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
    <View
      style={[
        styles.reasonRow,
        compact ? styles.reasonRowCompact : null,
        { flexDirection: rtl ? "row-reverse" : "row" },
      ]}
    >
      <Text style={styles.checkMark}>✓</Text>
      <Text
        style={[
          styles.reasonText,
          compact ? styles.reasonTextCompact : null,
          { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" },
        ]}
      >
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
    <View
      style={[
        styles.statusPill,
        compact ? styles.statusPillCompact : null,
        { flexDirection: rtl ? "row-reverse" : "row" },
      ]}
    >
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
      <Text style={[styles.factLabel, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>
        {label}
      </Text>
      <Text style={[styles.factValue, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>
        {value}
      </Text>
    </View>
  );
}

function introductionCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  const status = ar
    ? {
        offered: "بانتظار قرارك",
        waiting: "اخترت المتابعة · القرار الآخر ما زال خاصاً",
        mutually_accepted: "قبول متبادل",
        declined: "تم الاعتذار",
        expired: "انتهت المهلة",
        cancelled: "أُلغي التعارف",
        closed: "مغلق",
      }
    : {
        offered: "Waiting for your decision",
        waiting: "You chose to continue · their decision stays private",
        mutually_accepted: "Mutual acceptance",
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
  const reasonLabels: Record<IntroductionReason, string> = ar
    ? {
        same_city: "نفس المدينة",
        living_arrangement: "توقعات السكن متقاربة",
        children_plan: "نظرة متقاربة للأطفال",
        work_after_marriage: "توقعات العمل متقاربة",
        wedding_style: "توقعات حفل الزواج متقاربة",
      }
    : {
        same_city: "Same city",
        living_arrangement: "Living expectations align",
        children_plan: "Similar view on children",
        work_after_marriage: "Work expectations align",
        wedding_style: "Wedding expectations align",
      };

  return {
    title: ar ? "التعارفات" : "Introductions",
    body: ar
      ? "هنا فقط ينتقل التوافق من ملف إلى قرار جاد وخاص بين شخصين."
      : "This is where a match becomes a serious, private decision between two people.",
    currentEyebrow: ar ? "تعارف يحتاج قرارك" : "AN INTRODUCTION NEEDS YOUR DECISION",
    currentTitle: ar ? "راجع الشخص بهدوء قبل أن تختار" : "Consider the person calmly before you choose",
    privateIntroduction: ar ? "تعارف خاص" : "Private introduction",
    privateMember: ar ? "عضو ميثاق" : "Mithaq member",
    privatePhoto: ar ? "صورة لم تُكشف في الاكتشاف" : "Photo protected until its allowed stage",
    openPhotoLabel: ar ? "صورة اختار صاحبها إظهارها" : "Visible by this member’s choice",
    openProfile: ar ? "ملف مفتوح باختيار صاحبه" : "Open profile by member choice",
    controlledReveal: ar ? "كشف متدرج خاص" : "Private staged reveal",
    openIntroduction: ar ? "فتح التعارف واتخاذ قرار" : "Open introduction and decide",
    detailTitle: ar ? "تعارف خاص" : "Private introduction",
    backToList: ar ? "العودة إلى التعارفات" : "Back to introductions",
    whyEyebrow: ar ? "لماذا هذا التعارف؟" : "WHY THIS INTRODUCTION",
    whyTitle: ar ? "نقاط توافق حقيقية دون كشف الإجابات الخاصة" : "Real areas of fit without exposing private answers",
    whyBody: ar
      ? "هذه الفئات متقاربة بينكما. ميثاق لا يعرض الإجابات الخاصة ولا يحولها إلى نسبة توافق."
      : "These areas align between you. Mithaq does not reveal private answers or turn them into a compatibility score.",
    whyFallback: ar
      ? "اجتزتما المتطلبات الأساسية في الاتجاهين، حتى لو لم توجد أولويات عملية مشتركة محفوظة بعد."
      : "You both pass the essential requirements in both directions, even if no shared practical priorities are saved yet.",
    reason: (value: IntroductionReason) => reasonLabels[value],
    reasonPrivacy: ar
      ? "قرارك لا يُكشف للطرف الآخر وحده. لا يظهر القبول إلا عندما يصبح متبادلاً."
      : "Your decision is never exposed one-sided. Acceptance appears only when it becomes mutual.",
    trustNote: ar
      ? "علامات ميثاق تخص فقط ما تحققنا منه فعلياً؛ بقية التفاصيل يصرح بها العضو بنفسه."
      : "Mithaq badges cover only checks we actually performed; other details remain member-declared.",
    about: ar ? "عن هذا الشخص" : "About this person",
    yourDecision: ar ? "قرارك" : "YOUR DECISION",
    decisionTitle: ar ? "هل تريد متابعة هذا التعارف؟" : "Do you want to continue this introduction?",
    decisionBody: ar
      ? "لا يوجد ضغط ولا إشعار بقرار منفرد. اختر ما يناسبك فقط."
      : "There is no pressure and no notification of a one-sided choice. Choose only what feels right for you.",
    decline: ar ? "ليس مناسباً لي" : "Not for me",
    declineHint: ar ? "ينتهي التعارف بهدوء" : "Close this introduction quietly",
    accept: ar ? "أرغب بالمتابعة" : "I’d like to continue",
    acceptHint: ar ? "يبقى قبولك خاصاً" : "Your yes stays private",
    privateTitle: ar ? "الخصوصية مستمرة" : "Privacy continues here",
    privateBody: ar
      ? "لا أرقام هاتف ولا قبول من طرف واحد ولا دليل أعضاء. درع العائلة والحظر يوقفان المسار فوراً."
      : "No phone numbers, no one-sided acceptance, and no member directory. Family Shield or a block stops the path immediately.",
    acceptedTitle: ar ? "تم حفظ رغبتك في المتابعة" : "Your choice to continue is saved",
    acceptedBody: ar
      ? "لن نخبرك بقرار الطرف الآخر ما لم يصبح القبول متبادلاً فعلاً."
      : "Mithaq will not reveal the other person’s decision unless acceptance genuinely becomes mutual.",
    acceptedFresh: ar ? "تم الحفظ الآن بشكل خاص." : "Saved privately just now.",
    mutualTitle: ar ? "أصبح القبول متبادلاً" : "Acceptance is mutual",
    mutualBody: ar
      ? "كلاكما اختار المتابعة. يمكنك الآن الانتقال إلى كشف الصورة حسب الاختيارات ثم المحادثة الخاصة."
      : "You both chose to continue. You can now move into the photo-reveal choices and private conversation.",
    recognizedSuccessTitle: ar ? "لن تظهروا لبعضكم مرة أخرى" : "You won’t be shown to each other again",
    recognizedSuccessBody: ar
      ? "تم إخفاء هذا التقاطع بشكل خاص وإغلاق أي تعارف أو محادثة نشطة بينكما. لم نخبر الشخص الآخر أنك اخترت ذلك."
      : "This pair was privately hidden and any active introduction or conversation between you was closed. Mithaq did not tell the other person you chose this.",
    recognizedError: ar
      ? "تعذر حفظ خيار الخصوصية هذا الآن. لم نغيّر التعارف. حاول مرة أخرى."
      : "We couldn’t save this privacy choice. The introduction was not changed. Try again.",
    safety: ar ? "الأمان · إبلاغ أو حظر" : "Safety · report or block",
    continueAfterMutual: ar ? "متابعة إلى الخطوة التالية" : "Continue to the next step",
    emptyTitle: ar ? "لا يوجد تعارف حالياً" : "No introduction right now",
    emptyBody: ar
      ? "هذا طبيعي. ميثاق لا يملأ الشاشة بأشخاص؛ يظهر التعارف فقط عندما يوجد سبب جدي لعرضه."
      : "That is normal. Mithaq does not fill the screen with people; an introduction appears only when there is a serious reason to show one.",
    reviewProfile: ar ? "مراجعة ملفي وتفضيلاتي" : "Review my profile and preferences",
    history: ar ? "التعارفات السابقة" : "Previous introductions",
    errorTitle: ar ? "تعذر تحميل التعارفات" : "We couldn’t load introductions",
    errorBody: ar
      ? "لم يتم تغيير أي قرار. تحقق من اتصالك وحاول مرة أخرى."
      : "No decision was changed. Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    previewUnavailableTitle: ar ? "المعاينة غير متاحة" : "Preview unavailable",
    previewUnavailable: ar
      ? "قد يكون التعارف انتهى أو أُغلق بسبب الخصوصية أو الأهلية أو درع العائلة أو الحظر."
      : "The introduction may have ended or closed because of privacy, eligibility, Family Shield, or blocking.",
    actionUnavailable: ar
      ? "تعذر حفظ قرارك الآن. لم نغيّر حالة التعارف."
      : "We couldn’t save your decision. The introduction state was not changed.",
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
  disabled: { opacity: 0.48 },
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  loadingPortrait: {
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.primaryWash,
  },
  listPage: { width: "100%" },
  sectionHeader: { width: "100%", alignItems: "flex-end", gap: 12, marginBottom: 14 },
  listEyebrow: { width: "100%", color: colors.gold, fontSize: 10, lineHeight: 16, fontWeight: "800" },
  listTitle: { width: "100%", color: colors.foreground, fontSize: 20, lineHeight: 31, fontWeight: "800", marginTop: 2 },
  featuredCard: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
    ...shadows.card,
  },
  featuredContent: { width: "100%", paddingHorizontal: 19, paddingTop: 17, paddingBottom: 18 },
  featuredTopRow: { width: "100%", marginBottom: 9 },
  featuredName: { width: "100%", color: colors.foreground, fontSize: 24, lineHeight: 36, fontWeight: "800" },
  featuredMeta: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 2 },
  featuredTrust: { width: "100%", marginTop: 10 },
  featuredReasons: {
    width: "100%",
    gap: 7,
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  openRow: { width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 15 },
  openText: { flex: 1, color: colors.primary, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  presentationRow: { width: "100%", alignItems: "flex-start" },
  openModePill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openModeText: { color: colors.white, fontSize: 9, lineHeight: 13, fontWeight: "900" },
  privateModePill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  privateModeText: { color: colors.primaryStrong, fontSize: 9, lineHeight: 13, fontWeight: "900" },
  statusPill: {
    alignItems: "center",
    gap: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillCompact: { paddingHorizontal: 8, paddingVertical: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  statusText: { color: colors.primaryStrong, fontSize: 9, lineHeight: 13, fontWeight: "800" },
  historySection: { width: "100%", marginTop: 26 },
  historyTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "800",
    marginBottom: 10,
  },
  historyList: { width: "100%", gap: 8 },
  historyRow: {
    width: "100%",
    minHeight: 70,
    alignItems: "center",
    gap: 11,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  historyMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  historyName: { width: "100%", color: colors.foreground, fontSize: 13, lineHeight: 20, fontWeight: "800" },
  historyDate: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  emptyState: { width: "100%", minHeight: 360, justifyContent: "center", gap: 8 },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    marginBottom: 7,
  },
  emptyTitle: { width: "100%", color: colors.foreground, fontSize: 22, lineHeight: 33, fontWeight: "800" },
  emptyBody: { width: "100%", color: colors.muted, fontSize: 13, lineHeight: 22 },
  emptyAction: { width: "100%", marginTop: 10 },
  detailPage: { width: "100%", gap: 17 },
  backButton: { minHeight: 42, alignItems: "center", gap: 7 },
  backText: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "800" },
  identity: { width: "100%", gap: 5 },
  detailName: {
    width: "100%",
    color: colors.foreground,
    fontSize: 28,
    lineHeight: 39,
    fontWeight: "900",
    marginTop: 4,
  },
  detailMeta: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20 },
  trustBlock: { width: "100%", gap: 7, marginTop: 7 },
  trustNote: { width: "100%", color: colors.muted, fontSize: 9, lineHeight: 15 },
  section: {
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  whySection: {
    width: "100%",
    borderRadius: radius.xl,
    backgroundColor: colors.primaryWash,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: 17,
  },
  sectionEyebrow: { width: "100%", color: colors.gold, fontSize: 9, lineHeight: 14, fontWeight: "900" },
  sectionTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "900",
    marginTop: 4,
  },
  whyBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 6 },
  reasonChips: { width: "100%", flexWrap: "wrap", gap: 7, marginTop: 12 },
  reasonChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reasonChipText: { color: colors.primaryStrong, fontSize: 10, lineHeight: 15, fontWeight: "800" },
  reasonPrivacy: {
    width: "100%",
    color: colors.primaryStrong,
    fontSize: 10,
    lineHeight: 17,
    marginTop: 12,
    fontWeight: "700",
  },
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
  privacyNote: {
    width: "100%",
    alignItems: "flex-start",
    gap: 11,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    padding: 14,
  },
  privacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  privacyTitle: { width: "100%", color: colors.primaryStrong, fontSize: 12, lineHeight: 19, fontWeight: "900" },
  privacyBody: { width: "100%", color: colors.muted, fontSize: 10, lineHeight: 17, marginTop: 2 },
  decisionSection: { width: "100%", gap: 9, marginTop: 3 },
  decisionEyebrow: { width: "100%", color: colors.gold, fontSize: 9, lineHeight: 14, fontWeight: "900" },
  decisionTitle: { width: "100%", color: colors.foreground, fontSize: 19, lineHeight: 29, fontWeight: "900" },
  decisionBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 19, marginBottom: 4 },
  decisionRow: { width: "100%", flexDirection: "row", gap: 10 },
  decisionButton: {
    flex: 1,
    minHeight: 86,
    borderRadius: radius.lg,
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  declineButton: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderStrong },
  acceptButton: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary, ...shadows.button },
  declineButtonTitle: { color: colors.danger, fontSize: 13, lineHeight: 19, fontWeight: "900", textAlign: "center" },
  acceptButtonTitle: { color: colors.white, fontSize: 13, lineHeight: 19, fontWeight: "900", textAlign: "center" },
  declineButtonHint: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 5, textAlign: "center" },
  acceptButtonHint: { color: "rgba(255,255,255,0.75)", fontSize: 9, lineHeight: 14, marginTop: 5, textAlign: "center" },
  decisionPressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },
  waitingCard: {
    width: "100%",
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    padding: 18,
    ...shadows.card,
  },
  waitingMark: { color: colors.white, fontSize: 25, lineHeight: 32, fontWeight: "900" },
  waitingTitle: { width: "100%", color: colors.white, fontSize: 17, lineHeight: 27, fontWeight: "900", marginTop: 5 },
  waitingBody: { width: "100%", color: "rgba(255,255,255,0.78)", fontSize: 11, lineHeight: 19, marginTop: 5 },
  waitingFresh: { width: "100%", color: colors.white, fontSize: 10, lineHeight: 16, fontWeight: "800", marginTop: 10 },
  safetyLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  safetyText: { color: colors.danger, fontSize: 11, lineHeight: 17, fontWeight: "800" },
  error: { width: "100%", color: colors.danger, fontSize: 11, lineHeight: 18, fontWeight: "700" },
});
