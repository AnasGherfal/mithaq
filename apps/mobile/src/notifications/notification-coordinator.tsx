import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { AppState } from "react-native";
import { syncPushRegistrationIfEnabled } from "@/lib/push-notifications";
import { supabase } from "@/lib/supabase";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

function notificationData(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data;
  const route = typeof data.route === "string" ? data.route : "";
  const introductionId =
    typeof data.introductionId === "string" ? data.introductionId : "";
  const locale = data.locale === "en" ? "en" : "ar";
  return { route, introductionId, locale };
}

function openNotification(response: Notifications.NotificationResponse) {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

  const { route, introductionId, locale } = notificationData(response);
  if (route === "introductions") {
    router.push({ pathname: "/introductions", params: { locale } });
    return;
  }

  if (!uuidPattern.test(introductionId)) return;

  if (route === "introduction-handoff") {
    router.push({
      pathname: "/introduction-handoff",
      params: { locale, introductionId },
    });
    return;
  }

  if (route === "conversation") {
    router.push({
      pathname: "/conversation",
      params: { locale, introductionId },
    });
  }
}

export function NotificationCoordinator() {
  const lastHandledIdentifier = useRef<string | null>(null);

  useEffect(() => {
    function handle(response: Notifications.NotificationResponse | null) {
      if (!response) return;
      const identifier = response.notification.request.identifier;
      if (lastHandledIdentifier.current === identifier) return;
      lastHandledIdentifier.current = identifier;
      openNotification(response);
    }

    void Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => undefined);

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handle);

    const sync = () => {
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (data.session) return syncPushRegistrationIfEnabled();
          return undefined;
        })
        .catch(() => undefined);
    };

    sync();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setTimeout(sync, 0);
    });

    return () => {
      responseSubscription.remove();
      appStateSubscription.remove();
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  return null;
}
