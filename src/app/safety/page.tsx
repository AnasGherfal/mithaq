import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "الأمان والثقة" };

const principles = [
  {
    title: "لا دليل عام ولا رسائل مفتوحة",
    text: "في الإطلاق الخاص لن يكون ميثاق دليلاً عاماً للحسابات، ولن تُفتح المحادثة لمجرد وجود شخصين على المنصة. التعارف يبدأ بطريقة مضبوطة وبعد اهتمام متبادل.",
  },
  {
    title: "الصور ليست شرطاً للعرض العام",
    text: "خيارات ظهور الصور جزء من تفضيلات الخصوصية، والهدف هو عدم كشف صورة أو معلومة أكثر من اللازم قبل المرحلة المناسبة.",
  },
  {
    title: "الهاتف للتحقق، وليس للتعارف",
    text: "رقم الهاتف يستخدم للدخول والتحقق ولا يُعرض في ملف العضو أو في قائمة الانتظار لمستخدمين آخرين.",
  },
  {
    title: "الإبلاغ والحظر جزء من المنتج",
    text: "قبل فتح التعارف الكامل، ميثاق يبني مسارات للحظر والإبلاغ والمراجعة، مع ضوابط تمنع استمرار التواصل بعد إنهائه أو حظر الطرف الآخر.",
  },
];

export default function SafetyPage() {
  return (
    <main className="min-h-screen px-5 py-10">
      <article className="mx-auto max-w-4xl rounded-[2rem] border border-black/7 bg-white/88 p-6 shadow-sm sm:p-9">
        <Link className="font-black text-[#153d35]" href="/">ميثاق</Link>
        <p className="mt-7 text-xs font-black text-[#9d702d]">الأمان والثقة · مرحلة ما قبل الإطلاق</p>
        <h1 className="mt-2 text-3xl font-black text-[#153d35]">الخصوصية ليست ميزة إضافية في ميثاق.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-black/58">
          ميثاق مخصص للبالغين 18 سنة فما فوق وللتعارف الجاد بغرض الزواج. في مرحلة قائمة الانتظار الحالية لا يوجد تواصل بين الأعضاء أصلاً؛ هذه المبادئ توضح كيف نجهز المرحلة الخاصة التالية.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {principles.map((item) => (
            <section key={item.title} className="rounded-3xl border border-black/8 bg-[#f8f5ef] p-5">
              <div className="size-2 rounded-full bg-[#c99a52]" />
              <h2 className="mt-4 font-black text-[#153d35]">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-black/55">{item.text}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-3xl bg-[#153d35] p-6 text-white sm:p-7">
          <h2 className="text-xl font-black">احذر من انتحال صفة ميثاق</h2>
          <div className="mt-3 space-y-2 text-sm leading-7 text-white/72">
            <p>لا تحول أموالاً لشخص يدّعي أنه يستطيع قبولك أو تسريع دورك في قائمة الانتظار.</p>
            <p>لا ترسل صورة هوية أو وثيقة شخصية عبر واتساب أو رسالة خاصة لشخص يدّعي أنه يمثل ميثاق.</p>
            <p>أي تحقق من الهوية مستقبلاً سيظهر كمسار رسمي داخل المنتج نفسه عندما تصبح تلك المرحلة جاهزة.</p>
          </div>
        </section>

        <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold">
          <Link className="rounded-xl border border-black/10 px-4 py-2 text-[#153d35]" href="/privacy">سياسة الخصوصية</Link>
          <Link className="rounded-xl border border-black/10 px-4 py-2 text-[#153d35]" href="/terms">شروط الاستخدام</Link>
        </div>
      </article>
    </main>
  );
}
