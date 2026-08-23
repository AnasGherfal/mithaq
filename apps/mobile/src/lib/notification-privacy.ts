import { supabase } from "@/lib/supabase";

export type NotificationPreviewMode = "neutral" | "detailed";

export type PushNotificationSettings = {
  pushEnabled: boolean;
  previewMode: NotificationPreviewMode;
  registeredDeviceCount: number;
};

type SettingsRow = {
  push_enabled?: unknown;
  preview_mode?: unknown;
  registered_device_count?: unknown;
};

function normalizeSettings(data: unknown): PushNotificationSettings {
  const row = (Array.isArray(data) ? data[0] : data) as SettingsRow | null | undefined;
  return {
    pushEnabled: Boolean(row?.push_enabled),
    previewMode: row?.preview_mode === "detailed" ? "detailed" : "neutral",
    registeredDeviceCount: Number(row?.registered_device_count ?? 0) || 0,
  };
}

export async function getPushNotificationSettings(): Promise<PushNotificationSettings> {
  const { data, error } = await supabase.rpc("get_my_push_notification_settings");
  if (error) throw error;
  return normalizeSettings(data);
}

export async function setPushNotificationSettings(
  pushEnabled: boolean,
  previewMode: NotificationPreviewMode,
): Promise<PushNotificationSettings> {
  const { data, error } = await supabase.rpc("set_my_push_notification_settings", {
    p_push_enabled: pushEnabled,
    p_preview_mode: previewMode,
  });
  if (error) throw error;
  return normalizeSettings(data);
}

export async function registerExpoPushDevice(input: {
  installationId: string;
  expoPushToken: string;
  platform: "ios" | "android";
}) {
  const { data, error } = await supabase.rpc("register_my_expo_push_device", {
    p_installation_id: input.installationId,
    p_expo_push_token: input.expoPushToken,
    p_platform: input.platform,
  });
  if (error) throw error;
  return String(data ?? "");
}

export async function unregisterPushDevice(installationId: string) {
  const { data, error } = await supabase.rpc("unregister_my_push_device", {
    p_installation_id: installationId,
  });
  if (error) throw error;
  return Boolean(data);
}
