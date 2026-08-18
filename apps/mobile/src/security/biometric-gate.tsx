import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { supabase } from "@/lib/supabase";
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  getBiometricLockEnabled,
  setBiometricLockEnabled,
} from "@/security/biometric";
import { colors, radius } from "@/theme";

export function BiometricGate({ children }: PropsWithChildren) {
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);
  const [obscured, setObscured] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const authenticationInFlight = useRef(false);
  const shouldLockOnResume = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticationInFlight.current) return;

    authenticationInFlight.current = true;
    setAuthenticating(true);

    try {
      const result = await authenticateWithBiometrics();
      if (result.success) {
        setLocked(false);
        shouldLockOnResume.current = false;
      }
    } finally {
      authenticationInFlight.current = false;
      setAuthenticating(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const [{ data }, enabled, availability] = await Promise.all([
        supabase.auth.getSession(),
        getBiometricLockEnabled(),
        getBiometricAvailability(),
      ]);

      if (!active) return;

      const needsLock = Boolean(data.session && enabled && availability.available);
      setLocked(needsLock);
      setChecking(false);

      if (needsLock) void unlock();
    }

    void initialize();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "inactive") {
        // iOS takes its app-switcher snapshot while the app is leaving the active state.
        // Hide private member content immediately without treating biometric system UI as a full background event.
        setObscured(true);
        return;
      }

      if (nextState === "background") {
        setObscured(true);
        shouldLockOnResume.current = true;
        return;
      }

      if (nextState === "active" && shouldLockOnResume.current) {
        void (async () => {
          const [{ data }, enabled, availability] = await Promise.all([
            supabase.auth.getSession(),
            getBiometricLockEnabled(),
            getBiometricAvailability(),
          ]);

          if (!data.session || !enabled || !availability.available) {
            shouldLockOnResume.current = false;
            setObscured(false);
            return;
          }

          setLocked(true);
          setObscured(false);
          void unlock();
        })();
        return;
      }

      if (nextState === "active") {
        setObscured(false);
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [unlock]);

  async function signOut() {
    await setBiometricLockEnabled(false);
    await supabase.auth.signOut({ scope: "local" });
    setLocked(false);
    setObscured(false);
    shouldLockOnResume.current = false;
  }

  if (checking || obscured) {
    return <PrivacyCover />;
  }

  if (!locked) {
    return children;
  }

  return (
    <View style={styles.locked}>
      <View style={styles.mark}>
        <View style={styles.arch} />
      </View>
      <Text style={styles.eyebrow}>PRIVATE SESSION</Text>
      <Text style={styles.title}>Unlock Mithaq</Text>
      <Text style={styles.titleArabic}>افتح ميثاق بأمان</Text>
      <Text style={styles.body}>
        Use Face ID, Touch ID, or your device biometric to continue to your private account.
      </Text>
      <View style={styles.actions}>
        <PrimaryButton loading={authenticating} onPress={() => void unlock()}>
          Unlock securely
        </PrimaryButton>
        <PrimaryButton tone="quiet" onPress={() => void signOut()}>
          Sign out instead
        </PrimaryButton>
      </View>
    </View>
  );
}

function PrivacyCover() {
  return (
    <View style={styles.cover} accessibilityLabel="Mithaq private session protected">
      <View style={styles.coverMark}>
        <View style={styles.coverArch} />
      </View>
      <Text style={styles.coverArabic}>ميثاق</Text>
      <Text style={styles.coverEnglish}>MITHAQ</Text>
      <Text style={styles.coverBody}>Private by design · خصوصيتك أولاً</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 28,
  },
  coverMark: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  coverArch: {
    width: 21,
    height: 25,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.primary,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  coverArabic: { color: colors.primary, fontSize: 25, lineHeight: 34, fontWeight: "900" },
  coverEnglish: {
    color: colors.gold,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 2,
  },
  coverBody: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 12 },
  locked: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  arch: {
    width: 23,
    height: 27,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.primary,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  eyebrow: { color: colors.gold, fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginBottom: 10 },
  title: { color: colors.foreground, fontSize: 34, lineHeight: 40, fontWeight: "800" },
  titleArabic: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "right",
  },
  body: { color: colors.muted, fontSize: 15, lineHeight: 24, marginTop: 16 },
  actions: { gap: 10, marginTop: 30 },
});
