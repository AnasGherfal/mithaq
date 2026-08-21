import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BrandLogo } from "@/components/brand-logo";
import { PrimaryButton } from "@/components/primary-button";
import { BiometricGate } from "@/security/biometric-gate";
import { useAppSwitcherPrivacy } from "@/security/screen-privacy";
import { colors } from "@/theme";

export default function RootLayout() {
  useAppSwitcherPrivacy();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <BiometricGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "fade",
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="status" options={{ animation: "none" }} />
          <Stack.Screen name="introductions" options={{ animation: "none" }} />
          <Stack.Screen name="activity" options={{ animation: "none" }} />
          <Stack.Screen name="account" options={{ animation: "none" }} />
          <Stack.Screen name="photos" options={{ animation: "fade" }} />
        </Stack>
      </BiometricGate>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  useAppSwitcherPrivacy();

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.errorScreen} accessibilityRole="alert">
        <BrandLogo variant="mark" width={66} />
        <Text style={styles.errorEyebrow}>MITHAQ · ميثاق</Text>
        <Text style={styles.errorTitleArabic}>حدث خلل غير متوقع</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorBody} accessibilityLiveRegion="polite">
          لم نفقد حسابك أو إجاباتك المحفوظة. حاول فتح هذه الشاشة من جديد. Your saved account data remains protected;
          retry this screen to continue.
        </Text>
        <View style={styles.errorAction}>
          <PrimaryButton onPress={() => void retry()}>إعادة المحاولة · Try again</PrimaryButton>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  errorEyebrow: {
    color: colors.gold,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1.6,
    fontWeight: "800",
    marginTop: 24,
  },
  errorTitleArabic: {
    color: colors.primary,
    fontSize: 28,
    lineHeight: 39,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 12,
  },
  errorTitle: {
    color: colors.foreground,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
    marginTop: 2,
  },
  errorBody: { color: colors.muted, fontSize: 14, lineHeight: 23, marginTop: 14 },
  errorAction: { marginTop: 26 },
});
