import type { MobileLocale } from "@/i18n";

export function questionnaireCopy(locale: MobileLocale) {
  const ar = locale === "ar";

  return {
    eyebrow: ar ? "تفضيلاتك الخاصة" : "Private preferences",
    title: ar ? "دعنا نفهم ما يناسبك" : "Help us understand what fits you",
    body: ar
      ? "إجاباتك خاصة وتُستخدم لتقييم التوافق فقط."
      : "Your answers stay private and are used only to evaluate compatibility.",
    steps: ar
      ? ["الأساسيات", "المكان", "الزواج", "النطاق", "الخصوصية", "الأسرة"]
      : ["Basics", "Location", "Marriage", "Reach", "Privacy", "Family"],
    stageTitles: ar
      ? [
          "لنبدأ بالأساسيات",
          "أين تعيش اليوم؟",
          "ما الذي تبحث عنه؟",
          "أين يمكن أن يكون التعارف؟",
          "كيف تريد حماية هويتك؟",
          "كيف تفضّل إشراك الأسرة؟",
        ]
      : [
          "Let’s start with the basics",
          "Where do you live today?",
          "What are you looking for?",
          "Where could an introduction be?",
          "How do you want to protect your identity?",
          "How should family be involved?",
        ],
    stageBodies: ar
      ? [
          "اختر المعلومات الأساسية التي تساعد ميثاق على فهم ملفك.",
          "المكان والحالة الاجتماعية يساعداننا على فهم التوافق، ولا تمنع أي حالة اجتماعية من استخدام ميثاق.",
          "حدد استعدادك وما تقبله بوضوح. يمكنك تعديل ذلك لاحقاً.",
          "أخبرنا بمرونتك تجاه ليبيا والخارج والانتقال.",
          "يبدأ ميثاق بخصوصية أولاً. لا تحتاج لصورة أو تحقق إضافي كي تبدأ، ويمكنك بعد إكمال الإعداد اختيار فتح ملفك من البداية إذا كنت مرتاحاً لذلك.",
          "راجع تفضيلاتك الأخيرة قبل حفظها والمتابعة.",
        ]
      : [
          "Choose the basic details Mithaq needs to understand your profile.",
          "Location and marital status help us understand fit. No marital status prevents someone from using Mithaq.",
          "Set your readiness and boundaries clearly. You can change them later.",
          "Tell us how flexible you are across Libya, the diaspora, and relocation.",
          "Mithaq starts you Private first. You do not need a photo or extra verification to begin, and after setup you can choose Open profile from the start if you are comfortable with that.",
          "Review the final preferences before saving and continuing.",
        ],
    back: ar ? "رجوع" : "Back",
    next: ar ? "متابعة" : "Continue",
    save: ar ? "حفظ والمتابعة" : "Save and continue",
    loading: ar ? "جارٍ تحميل إجاباتك الخاصة" : "Loading your private answers",
    loadErrorTitle: ar ? "تعذر تحميل إجاباتك بأمان" : "We could not load your answers safely",
    loadErrorBody: ar
      ? "لم نعرض نموذجاً فارغاً حتى لا تستبدل إجابات محفوظة بالخطأ. تحقق من الاتصال ثم حاول مرة أخرى."
      : "We did not show a blank form because it could overwrite saved answers. Check your connection and try again.",
    retry: ar ? "إعادة المحاولة" : "Try again",
    aboutYou: ar ? "عنك" : "About you",
    aboutYouBody: ar ? "معلومات أساسية تساعدنا على فهم ملفك." : "Basic details that help us understand your profile.",
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
      married: ar ? "متزوج/متزوجة" : "Married",
      divorced: ar ? "مطلق/مطلقة" : "Divorced",
      widowed: ar ? "أرمل/أرملة" : "Widowed",
    },
    children: ar ? "لدي أطفال" : "I have children",
    libyanAttestation: ar ? "أؤكد أنني ليبي/ليبية أو من أصل ليبي" : "I confirm I am Libyan or of Libyan origin",
    preferences: ar ? "ما تبحث عنه" : "What you are looking for",
    preferencesBody: ar
      ? "هذه التفضيلات خاصة وتُستخدم لتقييم التوافق."
      : "These preferences stay private and support compatibility assessment.",
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
      ? "الظهور بخصوصية أولاً هو الأساس. هذه الخيارات تخص كشف الصورة لاحقاً فقط."
      : "Private-first visibility is the default. These choices only control staged photo reveal later.",
    identity: ar ? "قد أرغب في تحقق إضافي مستقبلاً (اختياري)" : "I may want additional verification later (optional)",
    photo: ar ? "إذا أضفت صورة، متى يمكن كشفها؟" : "If I add a photo, when may it be revealed?",
    photoValues: {
      none: ar ? "لا أريد إضافة أو إظهار صورة" : "I do not want to add or show a photo",
      after_mutual_interest: ar ? "بعد القبول المتبادل" : "After mutual acceptance",
      explicit_approval: ar ? "فقط بعد موافقة صريحة مني" : "Only after my explicit approval",
      after_family_involvement: ar ? "بعد أن أشرك شخصاً موثوقاً من جهتي" : "After I involve one of my trusted contacts",
    },
    family: ar ? "إشراك الأسرة" : "Family involvement",
    familyValues: {
      early: ar ? "مبكراً" : "Early",
      after_initial_interest: ar ? "بعد اهتمام أولي" : "After initial interest",
      later: ar ? "لاحقاً" : "Later",
      unsure: ar ? "غير متأكد" : "Unsure",
    },
    reassuranceTitle: ar ? "الصورة اختيارية بالكامل" : "A photo is completely optional",
    reassuranceBody: ar
      ? "يمكنك استخدام ميثاق بدون رفع صورة. يبدأ حسابك بخيار «خصوصية أولاً». بعد إكمال الإعداد يمكنك اختيار «اعرض ملفي من البداية»؛ عندها يمكن أن تظهر صورة معتمدة في الاكتشاف. اختيارك هنا يحدد فقط طريقة كشف الصورة إذا بقيت على «خصوصية أولاً»."
      : "You can use Mithaq without uploading a photo. Your account starts Private first. After setup you can choose Open profile from the start; then an approved photo may appear in Discover. This choice only controls staged photo reveal while you stay Private first.",
    reviewTitle: ar ? "ملخص تفضيلاتك" : "Your preference summary",
    reviewBody: ar
      ? "هذه ليست نتيجة توافق. إنها مراجعة لما سيستخدمه ميثاق عند البحث عن تعارف مناسب."
      : "This is not a compatibility score. It is a review of what Mithaq will use when looking for a suitable introduction.",
    reviewAge: ar ? "العمر المناسب" : "Preferred age",
    reviewLocations: ar ? "نطاق البحث" : "Search reach",
    reviewPhoto: ar ? "كشف الصورة" : "Photo reveal",
    reviewFamily: ar ? "الأسرة" : "Family",
    locationBoth: ar ? "ليبيا والخارج" : "Libya and diaspora",
    locationLibya: ar ? "ليبيا" : "Libya",
    locationDiaspora: ar ? "خارج ليبيا" : "Diaspora",
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
