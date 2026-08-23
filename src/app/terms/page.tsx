import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "شروط الاستخدام" };

export default function TermsPage() {
  return (
    <main className="min-h-screen px-5 py-10">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-black/7 bg-white/85 p-6 leading-8 shadow-sm sm:p-9">
        <Link className="font-black text-[#153d35]" href="/">ميثاق</Link>
        <p className="mt-7 text-xs font-black text-[#9d702d]">نسخة ما قبل الإطلاق · 17 أغسطس 2026</p>
        <h1 className="mt-2 text-3xl font-black text-[#153d35]">شروط الاستخدام</h1>
        <div className="mt-7 space-y-5 text-sm text-black/62">
          <p>مرحلة قائمة الانتظار مخصصة للأشخاص بعمر 18 سنة أو أكثر والمهتمين بالتعارف الجاد بغرض الزواج.</p>
          <p>إرسال الاستبيان لا يضمن القبول في ميثاق ولا يضمن الحصول على تعارف أو تطابق، كما أن خصائص الخدمة الكاملة لم تُفتح بعد.</p>
          <p>يلتزم المستخدم بتقديم معلومات صحيحة بقدر علمه، وعدم انتحال شخصية الغير أو استخدام الخدمة للإساءة أو الاحتيال أو جمع معلومات عن الآخرين.</p>
          <p>قد نقيّد أو نوقف حساباً عندما توجد مؤشرات إساءة أو خطر أو مخالفة لشروط المنتج، مع تطبيق ضوابط المراجعة المناسبة قبل الإطلاق.</p>
          <p>لا تطلب ميثاق في مرحلة قائمة الانتظار تحويل أموال أو إرسال مستندات هوية عبر محادثات خارجية. أي تحقق مستقبلي سيجري من خلال مسار رسمي داخل المنتج.</p>
          <p className="rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">هذه مسودة تشغيلية لمرحلة ما قبل الإطلاق وتحتاج مراجعة قانونية نهائية قبل الإطلاق العام.</p>
        </div>
      </article>
    </main>
  );
}
