import type { MobileLocale } from "@/i18n";

export function questionnaireCopy(locale: MobileLocale) {
  const ar = locale === "ar";
  return {
    eyebrow: ar ? "إعداد التسجيل الخاص" : "Private registration",
    title: ar ? "دعنا نفهم ما يناسبك" : "Help us understand what fits you",
    body: ar
      ? "ثلاث خطوات هادئة. إجاباتك خاصة وليست ملفاً عاماً."
      : "Three calm steps. Your answers stay private and never become a public profile.",
    steps: ar ? ["عنك", "التفضيلات", "الخصوصية"] : ["About you", "Preferences", "Privacy"],
    back: ar ? "رجوع" : "Back",
    next: ar ? "متابعة" : "Continue",
    save: ar ? "حفظ ومتابعة" : "Save and continue",
    loading: ar ? "جارٍ تحميل إجاباتك الخاصة" : "Loading your private answers",
    loadErrorTitle: ar ? "تعذر تحميل إجاباتك بأمان" : "We could not load your answers safely",
    loadErrorBody: ar
      ? "لم نعرض نموذجاً فارغاً حتى لا تستبدل إجابات محفوظة بالخطأ. تحقق من الاتصال ثم حاول مرة أخرى."
      : "We did not show a blank form because it could overwrite saved answers. Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    aboutYou: ar ? "عنك" : "About you",
    aboutYouBody: ar
      ? "معلومات أساسية تساعدنا على فهم جاهزية الشبكة."
      : "Basic details that help us understand network readiness.",
    woman: ar ? "امرأة" : "Woman",
    man: ar ? "رجل" : "Man",
    ageRange: ar ? "الفئة العمرية" : "Age range",
    residence: ar ? "مكان الإقامة" : "Residence",
    libya: ar ? "ليبيا" : "Libya",
    diaspora: ar ? "خارج ليبيا" : "Diaspora",
    country: ar ? "رمز الدولة الحالية" : "Current country code",
    city: ar ? "المدينة الحالية" : "Current city",
    region: ar ? "المنطقة الليبية (اختياري)" : "Libyan region (optional)",
    marital: ar ? "الحالة الاجتماعية" : "Marital status",
    status: {
      never_married: ar ? "لم يسبق لي الزواج" : "Never married",
      divorced: ar ? "مطلق/مطلقة" : "Divorced",
      widowed: ar ? "أرمل/أرملة" : "Widowed",
    },
    children: ar ? "لدي أطفال" : "I have children",
    libyanAttestation: ar ? "أؤكد أنني ليبي/ليبية أو من أصل ليبي" : "I confirm I am Libyan or of Libyan origin",
    preferences: ar ? "ما تبحث عنه" : "What you are looking for",
    preferencesBody: ar
      ? "هذه التفضيلات خاصة وتُستخدم لتقييم التوافق مستقبلاً."
      : "These preferences stay private and support future compatibility assessment.",
    timeline: ar ? "الاستعداد للزواج" : "Marriage timeline",
    timelineValues: {
      within_6_months: ar ? "خلال 6 أشهر" : "Within 6 months",
      "6_to_12_months": ar ? "6–12 شهراً" : "6–12 months",
      "1_to_2_years": ar ? "سنة إلى سنتين" : "1–2 years",
      unsure: ar ? "غير متأكد" : "Unsure",
    },
    minAge: ar ? "أقل عمر مناسب" : "Minimum preferred age",
    maxAge: ar ? "أعلى عمر مناسب" : "Maximum preferred age",
    accepted: ar ? "الحالات الاجتماعية المقبولة" : "Accepted marital statuses",
    partnerChildren: ar ? "شريك لديه أطفال" : "Partner with children",
    openLibya: ar ? "منفتح على شخص في ليبيا" : "Open to someone in Libya",
    openDiaspora: ar ? "منفتح على شخص في الخارج" : "Open to someone in the diaspora",
    relocation: ar ? "الاستعداد للانتقال" : "Relocation willingness",
    countries: ar ? "دول مفضلة" : "Preferred countries",
    countriesHelp: ar ? "اختياري — رموز مثل GB, CA" : "Optional — codes such as GB, CA",
    tri: { yes: ar ? "نعم" : "Yes", no: ar ? "لا" : "No", depends: ar ? "يعتمد" : "Depends" },
    privacyTitle: ar ? "الخصوصية والثقة" : "Privacy and trust",
    privacyBody: ar
      ? "حدد مستوى الراحة الذي تفضله قبل إطلاق التعارف الخاص."
      : "Set the level of comfort you want before private introductions ever launch.",
    identity: ar ? "مستعد للتحقق من الهوية لاحقاً" : "Willing to verify identity later",
    photo: ar ? "خصوصية الصورة مستقبلاً" : "Future photo privacy",
    photoValues: {
      none: ar ? "لا أريد إظهار صورة" : "Do not show a photo",
      blurred: ar ? "صورة ضبابية أولاً" : "Blurred first",
      after_mutual_interest: ar ? "بعد اهتمام متبادل" : "After mutual interest",
      explicit_approval: ar ? "بعد موافقة صريحة مني" : "Only after my explicit approval",
      after_family_involvement: ar ? "بعد إشراك الأسرة" : "After family involvement",
    },
    family: ar ? "إشراك الأسرة" : "Family involvement",
    familyValues: {
      early: ar ? "مبكراً" : "Early",
      after_initial_interest: ar ? "بعد اهتمام أولي" : "After initial interest",
      later: ar ? "لاحقاً" : "Later",
      unsure: ar ? "غير متأكد" : "Unsure",
    },
    reassuranceTitle: ar ? "أنت تتحكم في الخصوصية" : "You stay in control",
    reassuranceBody: ar
      ? "هذه الإجابات لا تنشئ ملفاً عاماً، وتأكيد الهاتف لا يعني توثيق الهوية."
      : "These answers do not create a public profile, and phone confirmation does not mean identity verification.",
    validation: {
      country: ar
        ? "أدخل رمز دولة صحيحاً من حرفين، مثل LY أو GB."
        : "Enter a valid two-letter country code, such as LY or GB.",
      city: ar ? "أدخل مدينتك الحالية للمتابعة." : "Enter your current city to continue.",
      libyan: ar
        ? "يلزم تأكيد الارتباط بليبيا للانضمام إلى ميثاق حالياً."
        : "Confirm your Libyan connection to continue with Mithaq at this stage.",
      age: ar
        ? "راجع نطاق العمر المفضل وتأكد أن الحد الأدنى لا يتجاوز الحد الأعلى."
        : "Check the preferred age range and make sure the minimum does not exceed the maximum.",
      status: ar ? "اختر حالة اجتماعية مقبولة واحدة على الأقل." : "Choose at least one accepted marital status.",
      location: ar
        ? "اختر الانفتاح على شخص في ليبيا أو في الخارج على الأقل."
        : "Choose at least one location option: Libya or diaspora.",
      countries: ar
        ? "استخدم رموز دول من حرفين مفصولة بفواصل، مثل GB, CA."
        : "Use two-letter country codes separated by commas, such as GB, CA.",
      unauthorized: ar
        ? "انتهت جلستك. سجّل الدخول من جديد للمتابعة."
        : "Your session ended. Sign in again to continue.",
      database: ar
        ? "تعذر حفظ إجاباتك الآن. لم نعتبر التسجيل مكتملاً؛ حاول مرة أخرى."
        : "We could not save your answers right now. Registration was not marked complete; try again.",
    },
    error: ar ? "راجع إجاباتك وحاول مرة أخرى." : "Review your answers and try again.",
  };
}
