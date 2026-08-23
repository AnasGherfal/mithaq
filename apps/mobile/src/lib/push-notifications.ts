import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  getPushNotificationSettings,
  registerExpoPushDevice,
  setPushNotificationSettings,
  type NotificationPreviewMode,
  unregisterPushDevice,
} from "@/lib/notification-privacy";

const installationIdKey = "mithaq.push.installation-id";
const androidChannelId = "private-updates";

export type PushEnableResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "development_build_required"
        | "project_not_configured"
        | "permission_denied"
        | "unsupported_platform"
        | "registration_failed";
    };

function createInstallationId() {
  const random = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `mithaq-${Date.now().toString(36)}-${random.slice(0, 24)}`;
}

async function getInstallationId(createIfMissing = true) {
  const existing = await SecureStore.getItemAsync(installationIdKey);
  if (existing || !createIfMissing) return existing;

  const created = createInstallationId();
  await SecureStore.setItemAsync(installationIdKey, created);
  return created;
}

function currentPlatform(): "ios" | "android" | null {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return null;
}

function projectId() {
  return Constants.easConfig?.projectId?.trim() || null;
}

export function remotePushRuntimeStatus() {
  if (!currentPlatform()) return "unsupported_platform" as const;
  if (Constants.expoGoConfig) return "development_build_required" as const;
  if (!projectId()) return "project_not_configured" as const;
  return "available" as const;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(androidChannelId, {
    name: "Private updates",
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: null,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

async function expoPushToken() {
  const id = projectId();
  if (!id) return null;
  const result = await Notifications.getExpoPushTokenAsync({ projectId: id });
  return result.data;
}

export async function enableDiscreetPushNotifications(previewMode: NotificationPreviewMode): Promise<PushEnableResult> {
  const runtime = remotePushRuntimeStatus();
  if (runtime !== "available") return { ok: false, reason: runtime };

  const platform = currentPlatform();
  if (!platform) return { ok: false, reason: "unsupported_platform" };

  try {
    await ensureAndroidChannel();

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return { ok: false, reason: "permission_denied" };

    const [installationId, token] = await Promise.all([getInstallationId(), expoPushToken()]);
    if (!installationId || !token) {
      return { ok: false, reason: "project_not_configured" };
    }

    await setPushNotificationSettings(true, previewMode);
    try {
      await registerExpoPushDevice({
        installationId,
        expoPushToken: token,
        platform,
      });
    } catch {
      await setPushNotificationSettings(false, previewMode).catch(() => undefined);
      return { ok: false, reason: "registration_failed" };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "registration_failed" };
  }
}

export async function disableDiscreetPushNotifications(previewMode: NotificationPreviewMode) {
  const installationId = await getInstallationId(false);
  if (installationId) {
    await unregisterPushDevice(installationId).catch(() => undefined);
  }
  return setPushNotificationSettings(false, previewMode);
}

export async function saveNotificationPreviewMode(previewMode: NotificationPreviewMode) {
  const current = await getPushNotificationSettings();
  return setPushNotificationSettings(current.pushEnabled, previewMode);
}

export async function syncPushRegistrationIfEnabled() {
  const runtime = remotePushRuntimeStatus();
  if (runtime !== "available") return;

  const platform = currentPlatform();
  if (!platform) return;

  const settings = await getPushNotificationSettings();
  if (!settings.pushEnabled) return;

  // Background/session sync must never prompt for permission and must never
  // change the account-wide preference just because this particular device
  // has not granted notification access.
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  try {
    await ensureAndroidChannel();
    const [installationId, token] = await Promise.all([getInstallationId(), expoPushToken()]);
    if (!installationId || !token) return;
    await registerExpoPushDevice({ installationId, expoPushToken: token, platform });
  } catch {
    // Registration is retried on a later foreground/session sync. Never log tokens.
  }
}

export async function unregisterCurrentPushDevice() {
  const installationId = await getInstallationId(false);
  if (!installationId) return false;
  return unregisterPushDevice(installationId);
}

export async function clearVisibleNotifications() {
  await Promise.all([
    Notifications.dismissAllNotificationsAsync().catch(() => undefined),
    Notifications.setBadgeCountAsync(0).catch(() => undefined),
  ]);
}
