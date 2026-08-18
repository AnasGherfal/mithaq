import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const biometricPreferenceKey = "mithaq.security.biometric-lock";

export async function getBiometricLockEnabled() {
  return (await SecureStore.getItemAsync(biometricPreferenceKey)) === "enabled";
}

export async function setBiometricLockEnabled(enabled: boolean) {
  if (enabled) {
    await SecureStore.setItemAsync(biometricPreferenceKey, "enabled");
    return;
  }

  await SecureStore.deleteItemAsync(biometricPreferenceKey);
}

export async function getBiometricAvailability() {
  const [hasHardware, enrolled, authenticationTypes] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  return {
    available: hasHardware && enrolled,
    hasHardware,
    enrolled,
    authenticationTypes,
  };
}

export async function authenticateWithBiometrics() {
  return LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Mithaq",
    promptSubtitle: "Protect your private account",
    cancelLabel: "Cancel",
    fallbackLabel: "Use device passcode",
    biometricsSecurityLevel: "strong",
  });
}
