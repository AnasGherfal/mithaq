import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { MobileLocale } from "@/i18n";
import { colors } from "@/theme";

export default function SpacesRedirectScreen() {
  const params = useLocalSearchParams<{ locale?: string }>();
  const locale: MobileLocale = params.locale === "en" ? "en" : "ar";

  useEffect(() => {
    router.replace({ pathname: "/status", params: { locale } });
  }, [locale]);

  return (
    <View style={styles.page}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
