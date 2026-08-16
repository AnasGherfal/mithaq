import { RefreshCw, WifiOff } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-svh w-full max-w-2xl place-items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-primary/15 bg-card p-7 shadow-sm sm:p-10">
        <div className="grid size-12 place-items-center rounded-xl bg-primary/8 text-primary">
          <WifiOff aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-3xl font-bold">أنت غير متصل الآن</h1>
        <p className="mt-3 leading-8 text-muted-foreground">
          يمكن عرض الهيكل الأساسي المحفوظ لموقع ميثاق. أعد الاتصال لفتح الصفحات
          التي تحتاج إلى الشبكة.
        </p>

        <div lang="en" dir="ltr" className="mt-7 border-t border-border pt-7">
          <h2 className="text-2xl font-semibold">You are offline</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            The saved Mithaq application shell is available. Reconnect before
            using any network-dependent page.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/ar"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            الصفحة العربية
          </Link>
          <Link
            href="/ar"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2 text-sm font-semibold"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            إعادة المحاولة
          </Link>
        </div>
      </section>
    </main>
  );
}
