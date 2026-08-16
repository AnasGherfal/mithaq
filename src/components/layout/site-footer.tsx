import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const groups = [
  {
    title: "product",
    links: [
      ["howItWorks", "/how-it-works"],
      ["forWomen", "/for-women"],
      ["forMen", "/for-men"],
      ["diaspora", "/libya-diaspora"],
    ],
  },
  {
    title: "trust",
    links: [
      ["safety", "/privacy-safety"],
      ["community", "/community-safety"],
      ["faq", "/faq"],
      ["contact", "/contact"],
    ],
  },
  {
    title: "legal",
    links: [
      ["privacy", "/privacy"],
      ["terms", "/terms"],
    ],
  },
] as const;

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-20 border-t border-border bg-card/55">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.25fr_2fr] lg:px-8">
        <div className="max-w-md">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-2xl font-bold text-primary"
          >
            <span lang="ar" dir="rtl">
              ميثاق
            </span>
            <span className="mx-2 text-border" aria-hidden="true">
              |
            </span>
            <span
              lang="en"
              dir="ltr"
              className="text-base font-semibold text-muted-foreground"
            >
              Mithaq
            </span>
          </Link>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {t("summary")}
          </p>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            {t("stageNote")}
          </p>
        </div>

        <nav
          className="grid gap-8 sm:grid-cols-3"
          aria-label={t("navLabel")}
        >
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-foreground">
                {t(group.title)}
              </h2>
              <ul className="mt-3 space-y-2">
                {group.links.map(([key, href]) => (
                  <li key={href}>
                    <Link
                      className="inline-flex min-h-8 items-center text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                      href={href}
                    >
                      {t(key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-border/70">
        <div className="safe-area-bottom mx-auto flex w-full max-w-7xl flex-wrap justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>{t("copyright")}</p>
          <p>{t("age")}</p>
        </div>
      </div>
    </footer>
  );
}
