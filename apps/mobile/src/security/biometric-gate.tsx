import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/primary-button";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/theme";
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  getBiometricLockEnabled,
} from "@/security/biometric";

export function BiometricGate({ children }: PropsWithChildren) {
  const [checking, setChecking] = useState(true);
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const shouldLockOnResume = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating) return;

    setAuthenticating(true);
    const result = await authenticateWithBiometrics();
    setAuthenticating(false);

    if (result.success) {
      setLocked(false);
      shouldLockOnResume.current = false;
    }
  }, [authenticating]);

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

      if (needsLock) {
        void unlock();
      }
    }

    void initialize();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
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
            return;
          }

          setLocked(true);
          void unlock();
        })();
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [unlock]);

  async function signOut() {
    await supabase.auth.signOut();
    setLocked(false);
    shouldLockOnResume.current = false;
  }

  if (checking) {
    return <View style={styles.blank} />;
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

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.background },
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
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "800",
    marginBottom: 10,
  },
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
