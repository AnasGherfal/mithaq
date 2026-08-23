import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { RecognizedPersonAction } from "@/components/recognized-person-action";
import { ScreenShell } from "@/components/screen-shell";
import { StateCard } from "@/components/state-card";
import type { MobileLocale } from "@/i18n";
import { colors, radius } from "@/theme";

export default function DevRecognitionScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";
  const rtl = locale === "ar";
  const textAlign = rtl ? "right" : "left";
  const writingDirection = rtl ? "rtl" : "ltr";
  const [confirming, setConfirming] = useState(false);
  const [hidden, setHidden] = useState(false);

  const copy = rtl
    ? {
        eyebrow: "للتطوير فقط · بيانات محلية",
        title: "معاينة معرفة الشخص",
        body: "هذه المعاينة لا تستخدم عضواً حقيقياً ولا تحفظ أي شيء في قاعدة البيانات.",
        sample: "مثال لملف مفتوح",
        name: "مريم",
        meta: "25–29 · طرابلس",
        context: "تخيل أنك تعرف هذا الشخص خارج ميثاق وتفضّل ألا تتقاطعا هنا.",
        hiddenTitle: "لن تظهروا لبعضكم",
        hiddenBody: "في المسار الحقيقي يصبح الإخفاء متبادلاً، ويُغلق أي تعارف أو محادثة نشطة، ولا يصل للطرف الآخر إشعار بسبب اختيارك.",
        reset: "إعادة المعاينة",
        back: "العودة إلى الحساب",
      }
    : {
        eyebrow: "DEVELOPMENT ONLY · LOCAL DATA",
        title: "Recognized-person preview",
        body: "This preview uses no real member and writes nothing to the database.",
        sample: "Sample open profile",
        name: "Maya",
        meta: "25–29 · Tripoli",
        context: "Imagine you recognize this person outside Mithaq and would rather not cross paths here.",
        hiddenTitle: "You won’t be shown to each other",
        hiddenBody: "In the real flow the hide becomes reciprocal, any active introduction or chat closes, and the other person receives no notification explaining your choice.",
        reset: "Reset preview",
        back: "Back to Account",
      };

  return (
    <ScreenShell eyebrow={copy.eyebrow} title={copy.title} body={copy.body} rtl={rtl}>
      <View style={styles.page}>
        {hidden ? (
          <StateCard
            rtl={rtl}
            tone="neutral"
            title={copy.hiddenTitle}
            body={copy.hiddenBody}
            actionLabel={copy.reset}
            onAction={() => {
              setHidden(false);
              setConfirming(false);
            }}
          />
        ) : (
          <>
            <View style={styles.sampleCard}>
              <Text style={[styles.eyebrow, { textAlign, writingDirection }]}>{copy.sample}</Text>
              <View style={styles.portrait}>
                <Text style={styles.initial}>{copy.name.charAt(0)}</Text>
              </View>
              <Text style={[styles.name, { textAlign, writingDirection }]}>{copy.name}</Text>
              <Text style={[styles.meta, { textAlign, writingDirection }]}>{copy.meta}</Text>
              <Text style={[styles.context, { textAlign, writingDirection }]}>{copy.context}</Text>
            </View>

            <RecognizedPersonAction
              locale={locale}
              confirming={confirming}
              loading={false}
              onBegin={() => setConfirming(true)}
              onCancel={() => setConfirming(false)}
              onConfirm={() => {
                setConfirming(false);
                setHidden(true);
              }}
            />
          </>
        )}

        <PrimaryButton
          tone="quiet"
          onPress={() => router.replace({ pathname: "/account", params: { locale } })}
        >
          {copy.back}
        </PrimaryButton>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", gap: 14 },
  sampleCard: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: 16,
  },
  eyebrow: { width: "100%", color: colors.gold, fontSize: 9, lineHeight: 14, fontWeight: "900" },
  portrait: {
    width: "100%",
    height: 210,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandNavy,
    marginTop: 10,
  },
  initial: { color: colors.white, fontSize: 54, lineHeight: 64, fontWeight: "900" },
  name: { width: "100%", color: colors.foreground, fontSize: 24, lineHeight: 34, fontWeight: "900", marginTop: 12 },
  meta: { width: "100%", color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 2 },
  context: { width: "100%", color: colors.foreground, fontSize: 11, lineHeight: 19, marginTop: 12 },
});
