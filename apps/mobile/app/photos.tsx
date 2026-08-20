import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { AppIcon } from "@/components/app-icon";
import { GuidedActionBar } from "@/components/guided-action-bar";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import {
  isPhotoFeatureUnavailable,
  listMyMemberPhotos,
  removeMemberPhoto,
  reorderMemberPhotos,
  setPrimaryMemberPhoto,
  type MemberPhoto,
  type MemberPhotoReviewState,
} from "@/lib/member-photos";
import { supabase } from "@/lib/supabase";
import { colors, radius, shadows } from "@/theme";

type MessageTone = "neutral" | "success" | "error";

type ScreenMessage = {
  tone: MessageTone;
  text: string;
} | null;

export default function PhotosScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const { width } = useWindowDimensions();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => photoCopy(locale), [locale]);
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const primaryHeight = Math.min(318, Math.max(250, width - 72));

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(false);
  const [photos, setPhotos] = useState<MemberPhoto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<ScreenMessage>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setFeaturePending(false);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (!data.session) {
        router.replace({ pathname: "/auth", params: { locale } });
        return;
      }

      const rows = await listMyMemberPhotos();
      setPhotos(rows);
      setSelectedId((current) => {
        if (current && rows.some((photo) => photo.photoId === current)) return current;
        return rows.find((photo) => photo.isPrimary)?.photoId ?? rows[0]?.photoId ?? null;
      });
      setLoading(false);
    } catch (error) {
      if (__DEV__ && isPhotoFeatureUnavailable(error)) {
        setPhotos([]);
        setFeaturePending(true);
        setLoading(false);
        return;
      }

      setLoadError(true);
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const ordered = useMemo(
    () => [...photos].sort((a, b) => a.position - b.position),
    [photos],
  );
  const primary = ordered.find((photo) => photo.isPrimary) ?? ordered[0] ?? null;
  const secondary = ordered.filter((photo) => photo.photoId !== primary?.photoId);
  const selected = ordered.find((photo) => photo.photoId === selectedId) ?? primary;
  const secondarySlots: Array<MemberPhoto | null> = Array.from(
    { length: 4 },
    (_, index) => secondary[index] ?? null,
  );
  const busy = action !== null;

  function requestAdd() {
    setConfirmingDeleteId(null);
    setMessage({ tone: "neutral", text: copy.uploadPending });
  }

  async function makePrimary(photo: MemberPhoto) {
    if (busy || photo.isPrimary || featurePending) return;
    setAction(`primary:${photo.photoId}`);
    setMessage(null);

    try {
      await setPrimaryMemberPhoto(photo.photoId);
      setPhotos((current) =>
        current.map((item) => ({ ...item, isPrimary: item.photoId === photo.photoId })),
      );
      setSelectedId(photo.photoId);
      setMessage({ tone: "success", text: copy.primarySaved });
    } catch {
      setMessage({ tone: "error", text: copy.actionError });
    } finally {
      setAction(null);
    }
  }

  async function moveSelected(delta: -1 | 1) {
    if (!selected || busy || featurePending) return;
    const currentIndex = ordered.findIndex((photo) => photo.photoId === selected.photoId);
    const targetIndex = currentIndex + delta;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const nextOrder = [...ordered];
    const [moving] = nextOrder.splice(currentIndex, 1);
    if (!moving) return;
    nextOrder.splice(targetIndex, 0, moving);

    setAction(`order:${selected.photoId}`);
    setMessage(null);

    try {
      await reorderMemberPhotos(nextOrder.map((photo) => photo.photoId));
      setPhotos(
        nextOrder.map((photo, index) => ({
          ...photo,
          position: index + 1,
        })),
      );
      setMessage({ tone: "success", text: copy.orderSaved });
    } catch {
      setMessage({ tone: "error", text: copy.actionError });
    } finally {
      setAction(null);
    }
  }

  async function deleteSelected(photo: MemberPhoto) {
    if (busy || featurePending) return;
    setAction(`delete:${photo.photoId}`);
    setMessage(null);

    try {
      const result = await removeMemberPhoto(photo.photoId);
      const next = ordered.filter((item) => item.photoId !== photo.photoId);
      const promotedId = photo.isPrimary ? next[0]?.photoId : null;

      setPhotos(
        next.map((item, index) => ({
          ...item,
          position: index + 1,
          isPrimary: promotedId ? item.photoId === promotedId : item.isPrimary,
        })),
      );
      setSelectedId(promotedId ?? next[0]?.photoId ?? null);
      setConfirmingDeleteId(null);
      setMessage({
        tone: result.storageCleanupFailed ? "neutral" : "success",
        text: result.storageCleanupFailed ? copy.cleanupPending : copy.deleted,
      });
    } catch {
      setMessage({ tone: "error", text: copy.actionError });
    } finally {
      setAction(null);
    }
  }

  return (
    <ScreenShell
      title={copy.title}
      body={copy.body}
      rtl={rtl}
      bottomBar={
        <GuidedActionBar
          rtl={rtl}
          backLabel={copy.account}
          primaryLabel={photos.length >= 5 ? copy.full : copy.add}
          primaryDisabled={photos.length >= 5 || busy}
          secondaryIcon="account"
          onBack={() => router.replace({ pathname: "/account", params: { locale } })}
          onPrimary={requestAdd}
        />
      }
    >
      {loading ? (
        <View style={styles.loadingState} accessibilityLabel={copy.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
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
        <View style={styles.page}>
          <View
            style={[
              styles.summary,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            <View style={styles.summaryIcon}>
              <AppIcon name="privacy" active size={19} />
            </View>
            <View style={[styles.summaryCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.summaryTitle, { textAlign, writingDirection }]}>
                {copy.privateTitle}
              </Text>
              <Text style={[styles.summaryBody, { textAlign, writingDirection }]}>
                {copy.privateBody}
              </Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{photos.length}/5</Text>
            </View>
          </View>

          {featurePending ? (
            <View style={styles.previewNotice}>
              <Text style={[styles.previewNoticeTitle, { textAlign, writingDirection }]}>
                {copy.previewTitle}
              </Text>
              <Text style={[styles.previewNoticeBody, { textAlign, writingDirection }]}>
                {copy.previewBody}
              </Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { textAlign, writingDirection }]}>
              {copy.primaryPortrait}
            </Text>
            <Text style={[styles.sectionBody, { textAlign, writingDirection }]}>
              {copy.primaryBody}
            </Text>
          </View>

          <PhotoTile
            photo={primary}
            selected={Boolean(primary && selected?.photoId === primary.photoId)}
            primary
            height={primaryHeight}
            rtl={rtl}
            copy={copy}
            onPress={() => {
              if (primary) {
                setSelectedId(primary.photoId);
                setConfirmingDeleteId(null);
              } else {
                requestAdd();
              }
            }}
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { textAlign, writingDirection }]}>
              {copy.additional}
            </Text>
            <Text style={[styles.sectionBody, { textAlign, writingDirection }]}>
              {copy.additionalBody}
            </Text>
          </View>

          <View
            style={[
              styles.grid,
              { flexDirection: rtl ? "row-reverse" : "row" },
            ]}
          >
            {secondarySlots.map((photo, index) => (
              <PhotoTile
                key={photo?.photoId ?? `empty-${index}`}
                photo={photo}
                selected={Boolean(photo && selected?.photoId === photo.photoId)}
                rtl={rtl}
                copy={copy}
                onPress={() => {
                  if (photo) {
                    setSelectedId(photo.photoId);
                    setConfirmingDeleteId(null);
                  } else {
                    requestAdd();
                  }
                }}
              />
            ))}
          </View>

          {selected ? (
            <View style={styles.controls}>
              <View
                style={[
                  styles.controlsHeader,
                  { flexDirection: rtl ? "row-reverse" : "row" },
                ]}
              >
                <View style={[styles.controlsCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
                  <Text style={[styles.controlsTitle, { textAlign, writingDirection }]}>
                    {selected.isPrimary ? copy.primarySelected : copy.photoSelected}
                  </Text>
                  <Text style={[styles.controlsBody, { textAlign, writingDirection }]}>
                    {copy.review[selected.reviewState]}
                  </Text>
                </View>
                <ReviewBadge state={selected.reviewState} copy={copy} />
              </View>

              {!selected.isPrimary ? (
                <PrimaryButton
                  tone="quiet"
                  loading={action === `primary:${selected.photoId}`}
                  disabled={busy && action !== `primary:${selected.photoId}`}
                  onPress={() => void makePrimary(selected)}
                >
                  {copy.makePrimary}
                </PrimaryButton>
              ) : null}

              <View
                style={[
                  styles.orderRow,
                  { flexDirection: rtl ? "row-reverse" : "row" },
                ]}
              >
                <OrderButton
                  label={copy.earlier}
                  disabled={
                    busy || ordered.findIndex((item) => item.photoId === selected.photoId) <= 0
                  }
                  rtl={rtl}
                  direction="earlier"
                  onPress={() => void moveSelected(-1)}
                />
                <OrderButton
                  label={copy.later}
                  disabled={
                    busy ||
                    ordered.findIndex((item) => item.photoId === selected.photoId) >=
                      ordered.length - 1
                  }
                  rtl={rtl}
                  direction="later"
                  onPress={() => void moveSelected(1)}
                />
              </View>

              {confirmingDeleteId === selected.photoId ? (
                <View style={styles.deleteConfirm}>
                  <Text style={[styles.deleteTitle, { textAlign, writingDirection }]}>
                    {copy.deleteTitle}
                  </Text>
                  <Text style={[styles.deleteBody, { textAlign, writingDirection }]}>
                    {copy.deleteBody}
                  </Text>
                  <View
                    style={[
                      styles.deleteActions,
                      { flexDirection: rtl ? "row-reverse" : "row" },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => setConfirmingDeleteId(null)}
                      style={({ pressed }) => [
                        styles.cancelDelete,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={styles.cancelDeleteText}>{copy.cancel}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => void deleteSelected(selected)}
                      style={({ pressed }) => [
                        styles.confirmDelete,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      {action === `delete:${selected.photoId}` ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.confirmDeleteText}>{copy.confirmDelete}</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => setConfirmingDeleteId(selected.photoId)}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    { flexDirection: rtl ? "row-reverse" : "row" },
                    pressed ? styles.pressed : null,
                    busy ? styles.disabled : null,
                  ]}
                >
                  <AppIcon name="trash" size={18} />
                  <Text style={styles.deleteButtonText}>{copy.delete}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.guidance}>
              <Text style={[styles.guidanceTitle, { textAlign, writingDirection }]}>
                {copy.guidanceTitle}
              </Text>
              <Text style={[styles.guidanceBody, { textAlign, writingDirection }]}>
                {copy.guidanceBody}
              </Text>
            </View>
          )}

          {message ? (
            <Text
              accessibilityRole={message.tone === "error" ? "alert" : undefined}
              accessibilityLiveRegion="polite"
              style={[
                styles.message,
                message.tone === "success" ? styles.messageSuccess : null,
                message.tone === "error" ? styles.messageError : null,
                { textAlign, writingDirection },
              ]}
            >
              {message.text}
            </Text>
          ) : null}
        </View>
      )}
    </ScreenShell>
  );
}

function PhotoTile({
  photo,
  selected,
  primary = false,
  height,
  rtl,
  copy,
  onPress,
}: {
  photo: MemberPhoto | null;
  selected: boolean;
  primary?: boolean;
  height?: number;
  rtl: boolean;
  copy: ReturnType<typeof photoCopy>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={photo ? copy.photoAccessibility : copy.emptyAccessibility}
      onPress={onPress}
      style={({ pressed }) => [
        primary ? styles.primaryTile : styles.secondaryTile,
        height ? { height } : null,
        selected ? styles.tileSelected : null,
        pressed ? styles.tilePressed : null,
      ]}
    >
      {photo?.signedUrl ? (
        <Image
          resizeMode="cover"
          source={{ uri: photo.signedUrl }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={styles.emptyPhoto}>
          <View style={styles.emptyPhotoIcon}>
            <AppIcon name="photo" active size={primary ? 30 : 24} />
          </View>
          {!photo ? <Text style={styles.plus}>+</Text> : null}
          <Text
            style={[
              primary ? styles.emptyPhotoTitle : styles.emptyPhotoTitleSmall,
              { textAlign: "center", writingDirection: rtl ? "rtl" : "ltr" },
            ]}
          >
            {photo ? copy.securePreviewUnavailable : copy.addSlot}
          </Text>
        </View>
      )}

      {photo ? (
        <View style={[styles.tileBadgeRow, rtl ? styles.tileBadgeRowRtl : styles.tileBadgeRowLtr]}>
          <ReviewBadge state={photo.reviewState} compact copy={copy} />
        </View>
      ) : null}

      {photo?.isPrimary ? (
        <View style={[styles.primaryBadge, rtl ? styles.primaryBadgeRtl : styles.primaryBadgeLtr]}>
          <Text style={styles.primaryBadgeText}>{copy.primaryBadge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ReviewBadge({
  state,
  compact = false,
  copy,
}: {
  state: MemberPhotoReviewState;
  compact?: boolean;
  copy: ReturnType<typeof photoCopy>;
}) {
  return (
    <View
      style={[
        styles.reviewBadge,
        compact ? styles.reviewBadgeCompact : null,
        state === "approved" ? styles.reviewApproved : null,
        state === "needs_changes" ? styles.reviewChanges : null,
        state === "rejected" ? styles.reviewRejected : null,
      ]}
    >
      <View
        style={[
          styles.reviewDot,
          state === "approved" ? styles.reviewDotApproved : null,
          state === "needs_changes" ? styles.reviewDotChanges : null,
          state === "rejected" ? styles.reviewDotRejected : null,
        ]}
      />
      <Text
        style={[
          styles.reviewBadgeText,
          state === "needs_changes" ? styles.reviewBadgeTextChanges : null,
          state === "rejected" ? styles.reviewBadgeTextRejected : null,
        ]}
      >
        {copy.reviewLabel[state]}
      </Text>
    </View>
  );
}

function OrderButton({
  label,
  disabled,
  direction,
  rtl,
  onPress,
}: {
  label: string;
  disabled: boolean;
  direction: "earlier" | "later";
  rtl: boolean;
  onPress: () => void;
}) {
  const symbol = direction === "earlier" ? (rtl ? "→" : "←") : rtl ? "←" : "→";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.orderButton,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={styles.orderSymbol}>{symbol}</Text>
      <Text style={[styles.orderText, { writingDirection: rtl ? "rtl" : "ltr" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function photoCopy(locale: MobileLocale) {
  if (locale === "ar") {
    return {
      title: "صوري الخاصة",
      body: "جهّز صورة شخصية واضحة وصوراً إضافية. لا تظهر أي صورة إلا بعد المراجعة ووفق خصوصية التعارف.",
      account: "حسابي",
      add: "إضافة صورة",
      full: "اكتملت 5 صور",
      loading: "جارٍ تحميل صورك الخاصة",
      loadErrorTitle: "تعذر تحميل صورك",
      loadErrorBody: "لم نغيّر أي صورة. تحقق من الاتصال ثم حاول مرة أخرى.",
      retry: "إعادة المحاولة",
      privateTitle: "خاصة افتراضياً",
      privateBody: "التخزين خاص، وكل صورة تحتاج مراجعة قبل أن تصبح مؤهلة للظهور داخل تعارف مسموح.",
      previewTitle: "ميزة الصور قيد التفعيل في المعاينة",
      previewBody: "واجهة الإدارة جاهزة، ويجري تفعيل التخزين الخاص في بيئة المعاينة قبل السماح برفع صور حقيقية.",
      primaryPortrait: "الصورة الشخصية الأساسية",
      primaryBody: "اختر صورة حديثة وواضحة للوجه. يمكنك تغيير الصورة الأساسية لاحقاً.",
      additional: "صور إضافية",
      additionalBody: "حتى أربع صور تساعد على تقديمك بصورة طبيعية ومتوازنة.",
      primaryBadge: "الأساسية",
      primarySelected: "الصورة الأساسية محددة",
      photoSelected: "صورة محددة",
      makePrimary: "اجعلها الصورة الأساسية",
      earlier: "تحريك للأمام",
      later: "تحريك للخلف",
      delete: "حذف الصورة",
      deleteTitle: "حذف هذه الصورة؟",
      deleteBody: "ستُزال من ملفك الخاص. يمكنك إضافة صورة أخرى لاحقاً.",
      cancel: "إلغاء",
      confirmDelete: "حذف",
      addSlot: "إضافة صورة",
      securePreviewUnavailable: "تعذر فتح المعاينة الآمنة",
      photoAccessibility: "صورة خاصة في ملف ميثاق",
      emptyAccessibility: "مكان فارغ لإضافة صورة خاصة",
      guidanceTitle: "ابدأ بصورة شخصية واحدة",
      guidanceBody: "سنقصّها ونضغطها ونرفعها إلى التخزين الخاص، ثم تظهر لديك بحالة بانتظار المراجعة.",
      uploadPending: "اختيار الصور من الهاتف هو الخطوة التالية في هذه النسخة. لن نطلب الوصول للصور قبل اكتمال القص والضغط والرفع الخاص.",
      primarySaved: "تم تحديث الصورة الأساسية.",
      orderSaved: "تم حفظ ترتيب الصور.",
      deleted: "تم حذف الصورة من ملفك الخاص.",
      cleanupPending: "أُزيلت الصورة من ملفك. سيُعاد تنظيف الملف الخاص بأمان.",
      actionError: "تعذر حفظ التغيير الآن. لم نفترض نجاح العملية؛ حاول مرة أخرى.",
      review: {
        pending: "الصورة بانتظار المراجعة قبل أي ظهور.",
        approved: "الصورة معتمدة ويمكن استخدامها عندما تسمح إعدادات التعارف.",
        needs_changes: "تحتاج الصورة إلى استبدال قبل اعتمادها.",
        rejected: "هذه الصورة غير معتمدة ولن تظهر في أي تعارف.",
      } as const,
      reviewLabel: {
        pending: "قيد المراجعة",
        approved: "معتمدة",
        needs_changes: "تحتاج تغييراً",
        rejected: "غير معتمدة",
      } as const,
    };
  }

  return {
    title: "Private photos",
    body: "Prepare one clear portrait and a few supporting photos. Nothing appears until review and introduction privacy allow it.",
    account: "Account",
    add: "Add photo",
    full: "5 photos added",
    loading: "Loading your private photos",
    loadErrorTitle: "We couldn’t load your photos",
    loadErrorBody: "No photo was changed. Check your connection and try again.",
    retry: "Try again",
    privateTitle: "Private by default",
    privateBody: "Storage is private, and every photo requires review before it can become eligible inside a permitted introduction.",
    previewTitle: "Photos are being enabled in preview",
    previewBody: "The management experience is ready while private hosted storage is enabled before real uploads are accepted.",
    primaryPortrait: "Primary portrait",
    primaryBody: "Choose a recent, clear portrait. You can change the primary photo later.",
    additional: "Additional photos",
    additionalBody: "Up to four supporting photos can present you naturally and with balance.",
    primaryBadge: "Primary",
    primarySelected: "Primary photo selected",
    photoSelected: "Photo selected",
    makePrimary: "Make primary photo",
    earlier: "Move earlier",
    later: "Move later",
    delete: "Delete photo",
    deleteTitle: "Delete this photo?",
    deleteBody: "It will be removed from your private profile. You can add another photo later.",
    cancel: "Cancel",
    confirmDelete: "Delete",
    addSlot: "Add photo",
    securePreviewUnavailable: "Secure preview unavailable",
    photoAccessibility: "Private Mithaq profile photo",
    emptyAccessibility: "Empty slot for a private photo",
    guidanceTitle: "Begin with one clear portrait",
    guidanceBody: "Mithaq will crop, compress, and upload it privately, then show it as awaiting review.",
    uploadPending: "Choosing photos from your device is the next preview slice. Mithaq will not request photo access before private crop, compression, and upload are ready.",
    primarySaved: "Your primary photo was updated.",
    orderSaved: "Photo order was saved.",
    deleted: "The photo was removed from your private profile.",
    cleanupPending: "The photo was removed from your profile. Secure file cleanup will be retried.",
    actionError: "We couldn’t save that change. We did not assume success; try again.",
    review: {
      pending: "This photo is waiting for review before any disclosure.",
      approved: "This photo is approved and can be used when introduction privacy permits it.",
      needs_changes: "This photo needs to be replaced before approval.",
      rejected: "This photo is not approved and will not appear in an introduction.",
    } as const,
    reviewLabel: {
      pending: "Pending review",
      approved: "Approved",
      needs_changes: "Needs changes",
      rejected: "Not approved",
    } as const,
  };
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 18 },
  summary: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryWash,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: {
    width: "100%",
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "800",
  },
  summaryBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 2 },
  countPill: {
    minWidth: 45,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  previewNotice: {
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: "#FFF9EC",
    padding: 15,
  },
  previewNoticeTitle: {
    width: "100%",
    color: colors.gold,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "800",
  },
  previewNoticeBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 4 },
  sectionHeader: { width: "100%", marginTop: 4 },
  sectionTitle: { width: "100%", color: colors.foreground, fontSize: 17, lineHeight: 27, fontWeight: "800" },
  sectionBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 3 },
  primaryTile: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    ...shadows.card,
  },
  secondaryTile: {
    width: "48%",
    aspectRatio: 0.82,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  tileSelected: { borderWidth: 2, borderColor: colors.accent },
  tilePressed: { opacity: 0.86, transform: [{ scale: 0.992 }] },
  emptyPhoto: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentWash,
    paddingHorizontal: 16,
  },
  emptyPhotoIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.accentSoft,
  },
  plus: { color: colors.accent, fontSize: 25, lineHeight: 28, fontWeight: "500", marginTop: 8 },
  emptyPhotoTitle: { color: colors.foreground, fontSize: 14, lineHeight: 23, fontWeight: "800", marginTop: 8 },
  emptyPhotoTitleSmall: { color: colors.muted, fontSize: 10, lineHeight: 16, fontWeight: "700", marginTop: 7 },
  tileBadgeRow: { position: "absolute", top: 10 },
  tileBadgeRowLtr: { left: 10 },
  tileBadgeRowRtl: { right: 10 },
  primaryBadge: {
    position: "absolute",
    bottom: 12,
    borderRadius: radius.pill,
    backgroundColor: "rgba(23,36,59,0.78)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  primaryBadgeLtr: { left: 12 },
  primaryBadgeRtl: { right: 12 },
  primaryBadgeText: { color: colors.white, fontSize: 10, lineHeight: 14, fontWeight: "800" },
  grid: { width: "100%", flexWrap: "wrap", gap: 12 },
  controls: {
    width: "100%",
    gap: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
    ...shadows.card,
  },
  controlsHeader: { width: "100%", alignItems: "center", gap: 12 },
  controlsCopy: { flex: 1, minWidth: 0 },
  controlsTitle: { width: "100%", color: colors.foreground, fontSize: 15, lineHeight: 23, fontWeight: "800" },
  controlsBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 2 },
  reviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reviewBadgeCompact: { paddingHorizontal: 8, paddingVertical: 6 },
  reviewApproved: { backgroundColor: colors.primarySoft },
  reviewChanges: { backgroundColor: colors.accentSoft },
  reviewRejected: { backgroundColor: "#FBEAEC" },
  reviewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  reviewDotApproved: { backgroundColor: colors.primary },
  reviewDotChanges: { backgroundColor: colors.accent },
  reviewDotRejected: { backgroundColor: colors.danger },
  reviewBadgeText: { color: colors.foreground, fontSize: 9, lineHeight: 13, fontWeight: "800" },
  reviewBadgeTextChanges: { color: colors.accent },
  reviewBadgeTextRejected: { color: colors.danger },
  orderRow: { width: "100%", gap: 10 },
  orderButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
  },
  orderSymbol: { color: colors.primary, fontSize: 17, lineHeight: 20, fontWeight: "800" },
  orderText: { color: colors.foreground, fontSize: 11, lineHeight: 17, fontWeight: "800" },
  deleteButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: radius.md,
    backgroundColor: "#FFF5F6",
  },
  deleteButtonText: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: "800" },
  deleteConfirm: {
    width: "100%",
    borderRadius: radius.md,
    backgroundColor: "#FFF5F6",
    padding: 14,
  },
  deleteTitle: { width: "100%", color: colors.danger, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  deleteBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 3 },
  deleteActions: { width: "100%", gap: 9, marginTop: 12 },
  cancelDelete: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelDeleteText: { color: colors.foreground, fontSize: 12, fontWeight: "800" },
  confirmDelete: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.danger,
  },
  confirmDeleteText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  guidance: {
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: colors.accentWash,
    padding: 17,
  },
  guidanceTitle: { width: "100%", color: colors.accent, fontSize: 15, lineHeight: 24, fontWeight: "800" },
  guidanceBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 4 },
  message: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, fontWeight: "700" },
  messageSuccess: { color: colors.primary },
  messageError: { color: colors.danger },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.42 },
});
