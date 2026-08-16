import type arMessages from "./messages/ar.json";
import type { Locale } from "./i18n/locale";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof arMessages;
    TimeZone: "Africa/Tripoli";
  }
}
