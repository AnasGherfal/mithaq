import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-svh w-full max-w-xl place-items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-3 text-2xl font-semibold">
          الصفحة غير موجودة · Page not found
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          تحقق من الرابط أو ارجع إلى الصفحة الرئيسية.
          <span lang="en" dir="ltr" className="mt-1 block">
            Check the address or return to the foundation page.
          </span>
        </p>
        <Link
          href="/ar"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          العودة إلى ميثاق
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </section>
    </main>
  );
}
