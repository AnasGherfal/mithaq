import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import {
  MarriageActivityTimeline,
  type MarriageActivityItem,
} from "@/features/marriage-activity";
import type { MobileLocale } from "@/i18n";
import { colors, radius } from "@/theme";

export default function DevActivityScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const items = useMemo(() => sampleActivity(), []);

  if (!__DEV__) return null;

  return (
    <ScreenShell
      eyebrow={rtl ? "للتطوير فقط" : "DEVELOPMENT ONLY"}
      title={rtl ? "معاينة رحلة النشاط" : "Activity journey preview"}
      body={
        rtl
          ? "بيانات محلية وهمية لعرض رحلة كاملة بحساب واحد. لا يتم حفظ أي شيء."
          : "Local fake data for reviewing a complete journey with one account. Nothing is saved."
      }
      rtl={rtl}
    >
      <View style={styles.page}>
        <View style={styles.note}>
          <Text style={[styles.noteTitle, { textAlign: rtl ? "right" : "left" }]}>
            {rtl ? "اختبر التسلسل، لا البيانات" : "Review the sequence, not the data"}
          </Text>
          <Text style={[styles.noteBody, { textAlign: rtl ? "right" : "left" }]}>
            {rtl
              ? "لاحظ أن «اختيارك محفوظ» يظهر، لكن لا توجد مرحلة تكشف قبول الطرف الآخر قبل ظهور «القبول متبادل»."
              : "Notice that “Your choice is saved” appears, but there is no stage exposing the other person’s acceptance before “Acceptance is mutual.”"}
          </Text>
        </View>
        <MarriageActivityTimeline items={items} locale={locale} />
      </View>
    </ScreenShell>
  );
}

function sampleActivity(): MarriageActivityItem[] {
  const now = Date.now();
  const introId = "11111111-1111-4111-8111-111111111111";
  return [
    item("trusted-other", "trusted_contact_shared_with_me", introId, now - 8 * 60_000),
    item("trusted-mine", "my_trusted_contact_shared", introId, now - 22 * 60_000),
    item("message", "message_received", introId, now - 48 * 60_000, true),
    item("photo", "photo_shared_with_me", introId, now - 70 * 60_000),
    item("chat", "conversation_started", introId, now - 95 * 60_000),
    item("mutual", "mutual_acceptance", introId, now - 2 * 60 * 60_000),
    item("mine", "my_choice_saved", introId, now - 4 * 60 * 60_000),
    item("offer", "introduction_offered", introId, now - 6 * 60 * 60_000),
    item("interest", "interest_saved", null, now - 26 * 60 * 60_000),
  ];
}

function item(
  activityId: string,
  kind: MarriageActivityItem["kind"],
  introductionId: string | null,
  timestamp: number,
  isUnread = false,
): MarriageActivityItem {
  return {
    activityId,
    kind,
    introductionId,
    introductionStatus: introductionId ? "mutually_accepted" : null,
    occurredAt: new Date(timestamp).toISOString(),
    isUnread,
  };
}

const styles = StyleSheet.create({
  page: { width: "100%", gap: 20 },
  note: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primaryWash,
    padding: 16,
  },
  noteTitle: { width: "100%", color: colors.foreground, fontSize: 14, lineHeight: 22, fontWeight: "800" },
  noteBody: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 19, marginTop: 5 },
});
