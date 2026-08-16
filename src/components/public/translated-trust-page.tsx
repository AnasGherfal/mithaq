import { EyeOff, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PublicInfoPage } from "@/components/public/public-info-page";

type TrustNamespace =
  | "HowItWorks"
  | "ForWomen"
  | "ForMen"
  | "PrivacySafety"
  | "Diaspora"
  | "Privacy"
  | "Terms"
  | "Community"
  | "Contact";

type TranslatedTrustPageProps = {
  namespace: TrustNamespace;
  ctaHref?: string;
};

export async function TranslatedTrustPage({ namespace, ctaHref }: TranslatedTrustPageProps) {
  const t = await getTranslations(namespace);

  return (
    <PublicInfoPage
      eyebrow={t("eyebrow")}
      title={t("title")}
      intro={t("intro")}
      sections={[
        { title: t("s1Title"), body: t("s1Body"), icon: LockKeyhole },
        { title: t("s2Title"), body: t("s2Body"), icon: EyeOff },
        { title: t("s3Title"), body: t("s3Body"), icon: ShieldCheck },
        { title: t("s4Title"), body: t("s4Body"), icon: UsersRound },
      ]}
      ctaTitle={t("ctaTitle")}
      ctaBody={t("ctaBody")}
      ctaLabel={t("ctaLabel")}
      ctaHref={ctaHref}
    />
  );
}
