import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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
  MemberPhotoUploadError,
  prepareAndUploadMemberPhoto,
  type MemberPhotoUploadStage,
} from "@/lib/member-photo-upload";
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

type ScreenMessage = { tone: "neutral" | "success" | "error"; text: string } | null;
type UploadStage = "choosing" | MemberPhotoUploadStage | null;

export default function PhotosScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const { width } = useWindowDimensions();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const copy = useMemo(() => photoCopy(locale), [locale]);
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const primaryHeight = Math.min(320, Math.max(250, width - 72));

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [featurePending, setFeaturePending] = useState(false);
  const [photos, setPhotos] = useState<MemberPhoto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<ScreenMessage>(null);

  const refreshPhotos = useCallback(async (preferredId?: string | null) => {
    const rows = await listMyMemberPhotos();
    setPhotos(rows);
    setSelectedId((current) => {
      const requested = preferredId ?? current;
      if (requested && rows.some((photo) => photo.photoId === requested)) return requested;
      return rows.find((photo) => photo.isPrimary)?.photoId ?? rows[0]?.photoId ?? null;
    });
    return rows;
  }, []);

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

      await refreshPhotos();
    } catch (error) {
      if (__DEV__ && isPhotoFeatureUnavailable(error)) {
        setFeaturePending(true);
        setPhotos([]);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [locale, refreshPhotos]);

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
  const secondarySlots = Array.from({ length: 4 }, (_, index) => secondary[index] ?? null);
  const busy = action !== null || uploadStage !== null;

  async function addPhoto() {
    if (busy || featurePending || photos.length >= 5) return;
    setConfirmingDeleteId(null);
    setMessage(null);
    setUploadStage("choosing");

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 1,
        selectionLimit: 1,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });

      if (result.canceled) {
        setUploadStage(null);
        return;
      }

      const asset = result.assets[0];
      if (!asset) throw new MemberPhotoUploadError("prepare_failed");

      const uploaded = await prepareAndUploadMemberPhoto({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        makePrimary: photos.length === 0,
        onStage: setUploadStage,
      });

      await refreshPhotos(uploaded.photoId);
      setMessage({ tone: "success", text: copy.uploaded });
    } catch (error) {
      if (error instanceof MemberPhotoUploadError) {
        if (error.code === "unauthorized") {
          router.replace({ pathname: "/auth", params: { locale } });
          return;
        }
        setMessage({ tone: "error", text: copy.uploadErrors[error.code] });
      } else {
        setMessage({ tone: "error", text: copy.pickerError });
      }
    } finally {
      setUploadStage(null);
    }
  }

  async function makePrimary(photo: MemberPhoto) {
    if (busy || photo.isPrimary || featurePending) return;
    setAction(`primary:${photo.photoId}`);
    setMessage(null);
    try {
      await setPrimaryMemberPhoto(photo.photoId);
      await refreshPhotos(photo.photoId);
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
      await refreshPhotos(selected.photoId);
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
      await refreshPhotos();
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
          primaryDisabled={photos.length >= 5 || busy || featurePending}
          loading={uploadStage !== null}
          secondaryIcon="account"
          onBack={() => router.replace({ pathname: "/account", params: { locale } })}
          onPrimary={() => void addPhoto()}
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
          <View style={[styles.summary, { flexDirection: rtl ? "row-reverse" : "row" }]}>
            <View style={styles.summaryIcon}>
              <AppIcon name="privacy" active size={19} />
            </View>
            <View style={[styles.summaryCopy, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.summaryTitle, { textAlign, writingDirection }]}>{copy.privateTitle}</Text>
              <Text style={[styles.summaryBody, { textAlign, writingDirection }]}>{copy.privateBody}</Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{photos.length}/5</Text>
            </View>
          </View>

          {uploadStage ? (
            <UploadProgress stage={uploadStage} rtl={rtl} copy={copy} />
          ) : null}

          {featurePending ? (
            <View style={styles.previewNotice}>
              <Text style={[styles.previewNoticeTitle, { textAlign, writingDirection }]}>{copy.previewTitle}</Text>
              <Text style={[styles.previewNoticeBody, { textAlign, writingDirection }]}>{copy.previewBody}</Text>
            </View>
          ) : null}

          <SectionHeading title={copy.primaryPortrait} body={copy.primaryBody} rtl={rtl} />
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
                void addPhoto();
              }
            }}
          />

          <SectionHeading title={copy.additional} body={copy.additionalBody} rtl={rtl} />
          <View style={[styles.grid, { flexDirection: rtl ? "row-reverse" : "row" }]}>
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
                    void addPhoto();
                  }
                }}
              />
            ))}
          </View>

          {selected ? (
            <View style={styles.controls}>
              <View style={[styles.controlsHeader, { flexDirection: rtl ? "row-reverse" : "row" }]}>
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

              <View style={[styles.orderRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                <OrderButton
                  label={copy.earlier}
                  disabled={busy || ordered.findIndex((item) => item.photoId === selected.photoId) <= 0}
                  symbol={rtl ? "→" : "←"}
                  onPress={() => void moveSelected(-1)}
                />
                <OrderButton
                  label={copy.later}
                  disabled={
                    busy ||
                    ordered.findIndex((item) => item.photoId === selected.photoId) >= ordered.length - 1
                  }
                  symbol={rtl ? "←" : "→"}
                  onPress={() => void moveSelected(1)}
                />
              </View>

              {confirmingDeleteId === selected.photoId ? (
                <View style={styles.deleteConfirm}>
                  <Text style={[styles.deleteTitle, { textAlign, writingDirection }]}>{copy.deleteTitle}</Text>
                  <Text style={[styles.deleteBody, { textAlign, writingDirection }]}>{copy.deleteBody}</Text>
                  <View style={[styles.deleteActions, { flexDirection: rtl ? "row-reverse" : "row" }]}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => setConfirmingDeleteId(null)}
                      style={({ pressed }) => [styles.cancelDelete, pressed ? styles.pressed : null]}
                    >
                      <Text style={styles.cancelDeleteText}>{copy.cancel}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => void deleteSelected(selected)}
                      style={({ pressed }) => [styles.confirmDelete, pressed ? styles.pressed : null]}
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
              <Text style={[styles.guidanceTitle, { textAlign, writingDirection }]}>{copy.guidanceTitle}</Text>
              <Text style={[styles.guidanceBody, { textAlign, writingDirection }]}>{copy.guidanceBody}</Text>
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

function UploadProgress({
  stage,
  rtl,
  copy,
}: {
  stage: Exclude<UploadStage, null>;
  rtl: boolean;
  copy: ReturnType<typeof photoCopy>;
}) {
  const progress = { choosing: 12, preparing: 38, uploading: 76, registering: 94 }[stage];
  return (
    <View style={styles.uploadCard} accessibilityLiveRegion="polite">
      <View style={[styles.uploadRow, { flexDirection: rtl ? "row-reverse" : "row" }]}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={[styles.uploadText, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>
          {copy.uploadStages[stage]}
        </Text>
        <Text style={styles.uploadPercent}>{progress}%</Text>
      </View>
      <View style={[styles.uploadTrack, { alignItems: rtl ? "flex-end" : "flex-start" }]}>
        <View style={[styles.uploadFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

function SectionHeading({ title, body, rtl }: { title: string; body: string; rtl: boolean }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>{title}</Text>
      <Text style={[styles.sectionBody, { textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }]}>{body}</Text>
    </View>
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
        <Image resizeMode="cover" source={{ uri: photo.signedUrl }} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={styles.emptyPhoto}>
          <View style={styles.emptyPhotoIcon}>
            <AppIcon name="photo" active size={primary ? 30 : 24} />
          </View>
          {!photo ? <Text style={styles.plus}>+</Text> : null}
          <Text style={[primary ? styles.emptyPhotoTitle : styles.emptyPhotoTitleSmall, { textAlign: "center", writingDirection: rtl ? "rtl" : "ltr" }]}>
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

function ReviewBadge({ state, compact = false, copy }: { state: MemberPhotoReviewState; compact?: boolean; copy: ReturnType<typeof photoCopy> }) {
  return (
    <View style={[
      styles.reviewBadge,
      compact ? styles.reviewBadgeCompact : null,
      state === "approved" ? styles.reviewApproved : null,
      state === "needs_changes" ? styles.reviewChanges : null,
      state === "rejected" ? styles.reviewRejected : null,
    ]}>
      <View style={[
        styles.reviewDot,
        state === "approved" ? styles.reviewDotApproved : null,
        state === "needs_changes" ? styles.reviewDotChanges : null,
        state === "rejected" ? styles.reviewDotRejected : null,
      ]} />
      <Text style={[
        styles.reviewBadgeText,
        state === "needs_changes" ? styles.reviewBadgeTextChanges : null,
        state === "rejected" ? styles.reviewBadgeTextRejected : null,
      ]}>{copy.reviewLabel[state]}</Text>
    </View>
  );
}

function OrderButton({ label, disabled, symbol, onPress }: { label: string; disabled: boolean; symbol: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.orderButton, pressed && !disabled ? styles.pressed : null, disabled ? styles.disabled : null]}
    >
      <Text style={styles.orderSymbol}>{symbol}</Text>
      <Text style={styles.orderText}>{label}</Text>
    </Pressable>
  );
}

function photoCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    title: ar ? "صوري الخاصة" : "Private photos",
    body: ar
      ? "أضف صورة شخصية واضحة وما يصل إلى أربع صور إضافية. تبقى جميعها خاصة حتى المراجعة والسماح داخل تعارف."
      : "Add one clear portrait and up to four supporting photos. Every image stays private until review and introduction permission allow it.",
    account: ar ? "حسابي" : "Account",
    add: ar ? "اختيار صورة" : "Choose photo",
    full: ar ? "اكتملت 5 صور" : "5 photos added",
    loading: ar ? "جارٍ تحميل صورك الخاصة" : "Loading your private photos",
    loadErrorTitle: ar ? "تعذر تحميل صورك" : "We couldn’t load your photos",
    loadErrorBody: ar ? "لم نغيّر أي صورة. تحقق من الاتصال ثم حاول مرة أخرى." : "No photo was changed. Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    privateTitle: ar ? "خاصة افتراضياً" : "Private by default",
    privateBody: ar ? "نستخدم وصولاً مؤقتاً للمعاينة، وكل صورة جديدة تبدأ بانتظار المراجعة." : "Self-previews use temporary access, and every new photo starts in pending review.",
    previewTitle: ar ? "يجب تفعيل تخزين الصور على بيئة المعاينة" : "Photo storage must be enabled in preview",
    previewBody: ar ? "طبّق ترحيلات M11 على مشروع Supabase المرحلي قبل رفع صور حقيقية." : "Apply the M11 migrations to hosted staging before accepting real uploads.",
    primaryPortrait: ar ? "الصورة الشخصية الأساسية" : "Primary portrait",
    primaryBody: ar ? "يتم قص الصورة تلقائياً إلى إطار 4:5 مع الحفاظ على المنتصف، ثم ضغطها قبل الرفع." : "Mithaq center-crops to a 4:5 portrait and compresses it before private upload.",
    additional: ar ? "صور إضافية" : "Additional photos",
    additionalBody: ar ? "حتى أربع صور حديثة وطبيعية تساعد على تقديمك بتوازن." : "Up to four recent, natural photos can present you with balance.",
    primaryBadge: ar ? "الأساسية" : "Primary",
    primarySelected: ar ? "الصورة الأساسية محددة" : "Primary photo selected",
    photoSelected: ar ? "صورة محددة" : "Photo selected",
    makePrimary: ar ? "اجعلها الصورة الأساسية" : "Make primary photo",
    earlier: ar ? "تحريك للأمام" : "Move earlier",
    later: ar ? "تحريك للخلف" : "Move later",
    delete: ar ? "حذف الصورة" : "Delete photo",
    deleteTitle: ar ? "حذف هذه الصورة؟" : "Delete this photo?",
    deleteBody: ar ? "ستُزال من ملفك الخاص ومن التخزين. يمكنك إضافة صورة أخرى لاحقاً." : "It will be removed from your private profile and storage. You can add another later.",
    cancel: ar ? "إلغاء" : "Cancel",
    confirmDelete: ar ? "حذف" : "Delete",
    addSlot: ar ? "إضافة صورة" : "Add photo",
    securePreviewUnavailable: ar ? "تعذر فتح المعاينة الآمنة" : "Secure preview unavailable",
    photoAccessibility: ar ? "صورة خاصة في ملف ميثاق" : "Private Mithaq profile photo",
    emptyAccessibility: ar ? "مكان فارغ لإضافة صورة خاصة" : "Empty slot for a private photo",
    guidanceTitle: ar ? "ابدأ بصورة شخصية واحدة" : "Begin with one clear portrait",
    guidanceBody: ar ? "اختر صورة حديثة. سنقصّها ونضغطها ثم نرفعها إلى مجلدك الخاص بحالة قيد المراجعة." : "Choose a recent photo. Mithaq crops, compresses, and uploads it to your private folder as pending review.",
    uploaded: ar ? "تم رفع الصورة بأمان وهي الآن بانتظار المراجعة." : "The photo was uploaded privately and is now pending review.",
    pickerError: ar ? "تعذر فتح مكتبة الصور أو قراءة الصورة المختارة. حاول بصورة أخرى." : "We couldn’t open the photo library or read the selected image. Try another photo.",
    primarySaved: ar ? "تم تحديث الصورة الأساسية." : "Your primary photo was updated.",
    orderSaved: ar ? "تم حفظ ترتيب الصور." : "Photo order was saved.",
    deleted: ar ? "تم حذف الصورة من ملفك الخاص." : "The photo was removed from your private profile.",
    cleanupPending: ar ? "أُزيلت الصورة من الملف، لكن تنظيف النسخة المخزنة يحتاج إعادة محاولة آمنة." : "The photo was removed from the profile, but private object cleanup needs a secure retry.",
    actionError: ar ? "تعذر حفظ التغيير الآن. لم نفترض نجاح العملية؛ حاول مرة أخرى." : "We couldn’t save that change. We did not assume success; try again.",
    uploadStages: {
      choosing: ar ? "اختر الصورة التي تريد استخدامها" : "Choose the photo you want to use",
      preparing: ar ? "جارٍ القص والضغط على جهازك" : "Cropping and compressing on your device",
      uploading: ar ? "جارٍ الرفع إلى التخزين الخاص" : "Uploading to private storage",
      registering: ar ? "جارٍ حفظ حالة المراجعة" : "Saving the review state",
    } as const,
    uploadErrors: {
      unauthorized: ar ? "انتهت جلستك. سجّل الدخول من جديد." : "Your session ended. Sign in again.",
      image_too_small: ar ? "دقة الصورة منخفضة. اختر صورة أوضح وأكبر." : "This image is too small. Choose a clearer, higher-resolution photo.",
      prepare_failed: ar ? "تعذر تجهيز الصورة. اختر صورة أخرى بصيغة معتادة." : "We couldn’t prepare this image. Choose another common image format.",
      file_too_large: ar ? "بقي حجم الصورة كبيراً بعد الضغط. اختر صورة أخرى." : "The image remains too large after compression. Choose another photo.",
      upload_failed: ar ? "تعذر رفع الصورة إلى التخزين الخاص. تحقق من الاتصال وحاول مرة أخرى." : "We couldn’t upload to private storage. Check your connection and try again.",
      registration_failed: ar ? "لم يكتمل تسجيل الصورة، وتم تنظيف الملف المرفوع بأمان." : "Photo registration failed, and the uploaded object was cleaned up safely.",
      registration_failed_cleanup_pending: ar ? "لم يكتمل تسجيل الصورة ويحتاج تنظيف الملف الخاص إلى إعادة محاولة." : "Photo registration failed and private-object cleanup needs a retry.",
    } as const,
    review: {
      pending: ar ? "الصورة بانتظار المراجعة قبل أي ظهور." : "This photo is waiting for review before any disclosure.",
      approved: ar ? "الصورة معتمدة ويمكن استخدامها عندما تسمح إعدادات التعارف." : "This photo is approved and can be used when introduction privacy permits it.",
      needs_changes: ar ? "تحتاج الصورة إلى استبدال قبل اعتمادها." : "This photo needs to be replaced before approval.",
      rejected: ar ? "هذه الصورة غير معتمدة ولن تظهر في أي تعارف." : "This photo is not approved and will not appear in an introduction.",
    } as const,
    reviewLabel: {
      pending: ar ? "قيد المراجعة" : "Pending review",
      approved: ar ? "معتمدة" : "Approved",
      needs_changes: ar ? "تحتاج تغييراً" : "Needs changes",
      rejected: ar ? "غير معتمدة" : "Not approved",
    } as const,
  };
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 320, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", gap: 18 },
  summary: { width: "100%", alignItems: "center", gap: 12, borderRadius: radius.lg, backgroundColor: colors.primaryWash, padding: 15 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  summaryBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 2 },
  countPill: { minWidth: 45, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  countText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  uploadCard: { width: "100%", borderRadius: radius.lg, backgroundColor: colors.accentWash, borderWidth: 1, borderColor: colors.accentSoft, padding: 14 },
  uploadRow: { width: "100%", alignItems: "center", gap: 10 },
  uploadText: { flex: 1, color: colors.foreground, fontSize: 12, lineHeight: 19, fontWeight: "800" },
  uploadPercent: { color: colors.accent, fontSize: 11, fontWeight: "900" },
  uploadTrack: { width: "100%", height: 5, borderRadius: 3, overflow: "hidden", backgroundColor: colors.accentSoft, marginTop: 11 },
  uploadFill: { height: "100%", borderRadius: 3, backgroundColor: colors.accent },
  previewNotice: { width: "100%", borderRadius: radius.md, borderWidth: 1, borderColor: colors.goldSoft, backgroundColor: "#FFF9EC", padding: 15 },
  previewNoticeTitle: { width: "100%", color: colors.gold, fontSize: 13, lineHeight: 21, fontWeight: "800" },
  previewNoticeBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 4 },
  sectionHeader: { width: "100%", marginTop: 4 },
  sectionTitle: { width: "100%", color: colors.foreground, fontSize: 17, lineHeight: 27, fontWeight: "800" },
  sectionBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 3 },
  primaryTile: { width: "100%", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, overflow: "hidden", ...shadows.card },
  secondaryTile: { width: "48%", aspectRatio: 0.82, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, overflow: "hidden" },
  tileSelected: { borderWidth: 2, borderColor: colors.accent },
  tilePressed: { opacity: 0.86, transform: [{ scale: 0.992 }] },
  emptyPhoto: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentWash, paddingHorizontal: 16 },
  emptyPhotoIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.accentSoft },
  plus: { color: colors.accent, fontSize: 25, lineHeight: 28, fontWeight: "500", marginTop: 8 },
  emptyPhotoTitle: { color: colors.foreground, fontSize: 14, lineHeight: 23, fontWeight: "800", marginTop: 8 },
  emptyPhotoTitleSmall: { color: colors.muted, fontSize: 10, lineHeight: 16, fontWeight: "700", marginTop: 7 },
  tileBadgeRow: { position: "absolute", top: 10 },
  tileBadgeRowLtr: { left: 10 },
  tileBadgeRowRtl: { right: 10 },
  primaryBadge: { position: "absolute", bottom: 12, borderRadius: radius.pill, backgroundColor: "rgba(23,36,59,0.78)", paddingHorizontal: 10, paddingVertical: 7 },
  primaryBadgeLtr: { left: 12 },
  primaryBadgeRtl: { right: 12 },
  primaryBadgeText: { color: colors.white, fontSize: 10, lineHeight: 14, fontWeight: "800" },
  grid: { width: "100%", flexWrap: "wrap", gap: 12 },
  controls: { width: "100%", gap: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 16, ...shadows.card },
  controlsHeader: { width: "100%", alignItems: "center", gap: 12 },
  controlsCopy: { flex: 1, minWidth: 0 },
  controlsTitle: { width: "100%", color: colors.foreground, fontSize: 15, lineHeight: 23, fontWeight: "800" },
  controlsBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 2 },
  reviewBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.pill, backgroundColor: colors.goldSoft, paddingHorizontal: 10, paddingVertical: 8 },
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
  orderButton: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, paddingHorizontal: 10 },
  orderSymbol: { color: colors.primary, fontSize: 17, lineHeight: 20, fontWeight: "800" },
  orderText: { color: colors.foreground, fontSize: 11, lineHeight: 17, fontWeight: "800" },
  deleteButton: { minHeight: 48, alignItems: "center", justifyContent: "center", gap: 9, borderRadius: radius.md, backgroundColor: "#FFF5F6" },
  deleteButtonText: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: "800" },
  deleteConfirm: { width: "100%", borderRadius: radius.md, backgroundColor: "#FFF5F6", padding: 14 },
  deleteTitle: { width: "100%", color: colors.danger, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  deleteBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 3 },
  deleteActions: { width: "100%", gap: 9, marginTop: 12 },
  cancelDelete: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  cancelDeleteText: { color: colors.foreground, fontSize: 12, fontWeight: "800" },
  confirmDelete: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.danger },
  confirmDeleteText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  guidance: { width: "100%", borderRadius: radius.lg, backgroundColor: colors.accentWash, padding: 17 },
  guidanceTitle: { width: "100%", color: colors.accent, fontSize: 15, lineHeight: 24, fontWeight: "800" },
  guidanceBody: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 4 },
  message: { width: "100%", color: colors.muted, fontSize: 12, lineHeight: 20, fontWeight: "700" },
  messageSuccess: { color: colors.primary },
  messageError: { color: colors.danger },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.42 },
});
