import Link from "next/link";

type MemberPrimaryNavProps = {
  pendingIntroductions?: number;
  unreadMessages?: number;
  unreadActivity?: number;
};

export function MemberPrimaryNav({
  pendingIntroductions = 0,
  unreadMessages = 0,
  unreadActivity = 0,
}: MemberPrimaryNavProps) {
  return (
    <nav aria-label="التنقل الرئيسي" className="flex flex-wrap items-center gap-2">
      <Link className="focus-ring rounded-full bg-[#153d35] px-4 py-2.5 text-sm font-black text-white" href="/discovery">
        الاستكشاف
      </Link>
      <Link className="focus-ring rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#153d35]" href="/introductions">
        المقدمات{pendingIntroductions > 0 ? ` · ${pendingIntroductions}` : ""}
      </Link>
      <Link className="focus-ring rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#153d35]" href="/conversations">
        المحادثات{unreadMessages > 0 ? ` · ${unreadMessages}` : ""}
      </Link>
      <Link className="focus-ring rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-[#153d35]" href="/activity">
        النشاط{unreadActivity > 0 ? ` · ${unreadActivity}` : ""}
      </Link>
      <details className="relative">
        <summary className="focus-ring cursor-pointer list-none rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-black text-black/55">
          المزيد
        </summary>
        <div className="absolute left-0 z-30 mt-2 min-w-44 rounded-2xl border border-black/8 bg-white p-2 shadow-xl">
          <Link className="block rounded-xl px-3 py-2 text-sm font-bold text-black/60 hover:bg-[#f8f5ef]" href="/photos">الصور والثقة</Link>
          <Link className="block rounded-xl px-3 py-2 text-sm font-bold text-black/60 hover:bg-[#f8f5ef]" href="/family-shield">درع العائلة</Link>
          <Link className="block rounded-xl px-3 py-2 text-sm font-bold text-black/60 hover:bg-[#f8f5ef]" href="/settings">الإعدادات</Link>
          <form action="/auth/signout" method="post">
            <button className="w-full rounded-xl px-3 py-2 text-right text-sm font-bold text-red-700 hover:bg-red-50" type="submit">تسجيل الخروج</button>
          </form>
        </div>
      </details>
    </nav>
  );
}
