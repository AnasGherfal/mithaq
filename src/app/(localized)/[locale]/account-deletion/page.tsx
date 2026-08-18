import { FileClock, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import { PublicInfoPage } from "@/components/public/public-info-page";

type PageProps = { params: Promise<{ locale: string }> };

export default async function AccountDeletionPage({ params }: PageProps) {
  const { locale } = await params;
  const isArabic = locale !== "en";

  const copy = isArabic
    ? {
        eyebrow: "حذف الحساب والبيانات",
        title: "يمكنك طلب حذف حساب ميثاق من داخل التطبيق",
        intro:
          "نحافظ على حذف الحساب كإجراء موثّق وآمن داخل تجربتك المسجّلة، حتى لا يتمكن أي شخص من طلب حذف حسابك بالنيابة عنك.",
        sections: [
          {
            title: "ابدأ من داخل التطبيق",
            body: "افتح مركز الخصوصية في تطبيق ميثاق واختر حذف الحساب. يضمن ذلك أن الطلب صادر من جلسة موثّقة تخصك.",
            icon: Smartphone,
          },
          {
            title: "ما الذي يتم حذفه",
            body: "يبدأ الطلب دورة حذف بيانات الحساب والملف الشخصي والمحتوى المرتبط بك وفق ضوابط ميثاق وسياسة الاحتفاظ المعتمدة للبيئة المستخدمة.",
            icon: LockKeyhole,
          },
          {
            title: "سجلات السلامة الضرورية",
            body: "قد تُحتفظ بعض سجلات السلامة أو البلاغات غير المحسومة بصورة محدودة عندما تكون لازمة لمنع الإساءة أو استكمال مراجعة سلامة. لا تبقى متاحة كملف عضو نشط.",
            icon: ShieldCheck,
          },
          {
            title: "إذا تعذر الوصول إلى التطبيق",
            body: "استخدم صفحة التواصل لطلب المساعدة في استعادة الوصول أو مناقشة حذف الحساب. لن نحذف حساباً بناءً على رسالة غير موثّقة فقط؛ سنحتاج إلى التحقق من أن الطلب يخص صاحب الحساب.",
            icon: FileClock,
          },
        ],
        ctaTitle: "تحتاج إلى مساعدة؟",
        ctaBody:
          "إذا لم تتمكن من تسجيل الدخول إلى ميثاق، تواصل معنا وسنرشدك إلى مسار آمن لاستعادة الوصول أو متابعة طلب الحذف.",
        ctaLabel: "التواصل مع ميثاق",
      }
    : {
        eyebrow: "Account and data deletion",
        title: "You can request deletion of your Mithaq account in the app",
        intro:
          "Account deletion stays inside your authenticated member experience so another person cannot request deletion of your account on your behalf.",
        sections: [
          {
            title: "Start inside the app",
            body: "Open Privacy Center in the Mithaq app and choose account deletion. This keeps the request tied to an authenticated session that belongs to you.",
            icon: Smartphone,
          },
          {
            title: "What is deleted",
            body: "The request starts deletion of your account, member profile, and associated product data under Mithaq's controls and the approved retention policy for the environment in use.",
            icon: LockKeyhole,
          },
          {
            title: "Necessary safety records",
            body: "A limited safety or unresolved-report record may be retained when needed to prevent abuse or complete a safety review. It is not kept as an active member profile.",
            icon: ShieldCheck,
          },
          {
            title: "If you cannot access the app",
            body: "Use the contact page for help restoring access or discussing deletion. We will not delete an account from an unauthenticated message alone; we first need to verify that the request belongs to the account owner.",
            icon: FileClock,
          },
        ],
        ctaTitle: "Need help accessing your account?",
        ctaBody:
          "If you cannot sign in to Mithaq, contact us and we will guide you through a secure access-recovery or deletion-support path.",
        ctaLabel: "Contact Mithaq",
      };

  return (
    <PublicInfoPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      intro={copy.intro}
      sections={copy.sections}
      ctaTitle={copy.ctaTitle}
      ctaBody={copy.ctaBody}
      ctaLabel={copy.ctaLabel}
      ctaHref="/contact"
    />
  );
}
