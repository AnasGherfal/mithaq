import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-black/7 bg-white/90 p-8 text-center shadow-[0_25px_70px_rgba(35,43,38,.1)]">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#153d35] text-2xl font-black text-white">م</div>
        <p className="mt-6 text-sm font-black text-[#9d702d]">404</p>
        <h1 className="mt-2 text-2xl font-black text-[#153d35]">الصفحة غير موجودة</h1>
        <p className="mt-3 text-sm leading-7 text-black/55">
          قد يكون الرابط غير صحيح أو أن الصفحة لم تعد متاحة.
        </p>
        <Link
          className="focus-ring mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#153d35] px-7 py-3 font-bold text-white hover:bg-[#0f2c27]"
          href="/"
        >
          العودة للرئيسية
        </Link>
      </section>
    </main>
  );
}
