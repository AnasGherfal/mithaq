import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "سياسة الخصوصية" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-5 py-10">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-black/7 bg-white/85 p-6 leading-8 shadow-sm sm:p-9">
        <Link className="font-black text-[#153d35]" href="/">ميثاق</Link>
        <p className="mt-7 text-xs font-black text-[#9d702d]">نسخة ما قبل الإطلاق · 17 أغسطس 2026</p>
        <h1 className="mt-2 text-3xl font-black text-[#153d35]">سياسة الخصوصية</h1>
        <div className="mt-7 space-y-5 text-sm text-black/62">
          <p>نجمع رقم الهاتف لأغراض تسجيل الدخول والتحقق، ونحفظ إجابات قائمة الانتظار اللازمة لفهم احتياجات المستخدمين وتجهيز تجربة ميثاق.</p>
          <p>قد تشمل البيانات: الفئة العمرية، مكان الإقامة، الحالة الاجتماعية، تفضيلات أساسية للتعارف، اختيارات خصوصية الصور ودور العائلة، وسجل الموافقات المرتبط بنسخة المستند.</p>
          <p>رموز الدعوة تُستخدم لقياس فتح الدعوة ومراحل التسجيل بطريقة محدودة، ولا تجعل بيانات الاستبيان علنية.</p>
          <p>الوصول إلى البيانات يخضع لضوابط حسابية وقواعد وصول على مستوى قاعدة البيانات. معلومات المستخدم الخاصة لا تُعرض لمستخدم آخر لمجرد وجوده في قائمة الانتظار.</p>
          <p>لا نبيع بيانات المحادثات أو بيانات قائمة الانتظار للمعلنين. سنوضح مدد الاحتفاظ ومسارات الحذف والدعم بالتفصيل في النسخة النهائية قبل الإطلاق العام.</p>
          <p className="rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">هذه مسودة تشغيلية لمرحلة ما قبل الإطلاق وتحتاج مراجعة قانونية نهائية قبل الإطلاق العام.</p>
        </div>
      </article>
    </main>
  );
}
