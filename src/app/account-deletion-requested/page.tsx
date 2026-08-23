import Link from "next/link";

export default function AccountDeletionRequestedPage() {
  return (
    <main className="min-h-screen px-5 py-12">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-black/7 bg-white/88 p-7 text-center shadow-[0_25px_70px_rgba(35,43,38,.1)] sm:p-9">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-100 text-2xl text-amber-800">✓</div>
        <h1 className="mt-5 text-2xl font-black text-[#153d35]">تم تسجيل طلب حذف الحساب</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-black/58">
          تم تسجيل طلب حذف حساب ميثاق بالكامل، وتم تسجيل خروجك. طلب قائمة الانتظار لم يعد نشطاً، وستتم معالجة حذف الحساب وفق دورة الحذف المحددة خلال 30 يوماً.
        </p>
        <div className="mt-6 rounded-2xl bg-[#f8f5ef] p-4 text-xs leading-6 text-black/48">
          لا ترسل رقم هاتفك أو مستندات هويتك لأي شخص يدّعي أنه يحتاجها لإكمال الحذف خارج ميثاق.
        </div>
        <Link className="focus-ring mt-6 inline-flex rounded-2xl bg-[#153d35] px-5 py-3 font-black text-white" href="/">
          العودة للرئيسية
        </Link>
      </section>
    </main>
  );
}
