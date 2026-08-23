import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ModerationAccess = {
  moderation_role: string;
  can_review: boolean;
  can_enforce: boolean;
};

const roleLabels: Record<string, string> = {
  reviewer: "مراجع",
  moderator: "مشرف سلامة",
  admin: "مدير",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect("/join");

  const { data: accessData, error } = await supabase.rpc("get_my_moderation_access", {});
  if (error || !Array.isArray(accessData) || accessData.length === 0) notFound();

  const access = accessData[0] as ModerationAccess;
  const canManageWaitlist = access.moderation_role === "admin";

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#19221f]" dir="rtl">
      <header className="border-b border-black/8 bg-[#102f29] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link className="inline-flex items-center gap-2 font-black" href="/admin">
              <span className="grid size-9 place-items-center rounded-xl bg-white/10">م</span>
              إدارة ميثاق
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/75">
              {roleLabels[access.moderation_role] ?? access.moderation_role}
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-1 text-sm font-black">
            <Link className="rounded-xl px-3 py-2 text-white/75 hover:bg-white/10 hover:text-white" href="/admin">
              النظرة العامة
            </Link>
            {canManageWaitlist ? (
              <Link className="rounded-xl px-3 py-2 text-white/75 hover:bg-white/10 hover:text-white" href="/admin/waitlist">
                قائمة الانتظار
              </Link>
            ) : null}
            {access.can_review ? (
              <>
                <Link className="rounded-xl px-3 py-2 text-white/75 hover:bg-white/10 hover:text-white" href="/admin/profiles">
                  الملفات
                </Link>
                <Link className="rounded-xl px-3 py-2 text-white/75 hover:bg-white/10 hover:text-white" href="/admin/photos">
                  الصور
                </Link>
              </>
            ) : null}
            {access.can_enforce ? (
              <Link className="rounded-xl px-3 py-2 text-white/75 hover:bg-white/10 hover:text-white" href="/admin/safety">
                السلامة
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            <Link className="rounded-xl border border-white/15 px-3 py-2 text-xs font-black text-white/70 hover:bg-white/10" href="/">
              الموقع العام
            </Link>
            <form action="/auth/signout" method="post">
              <button className="rounded-xl border border-white/15 px-3 py-2 text-xs font-black text-white/70 hover:bg-white/10" type="submit">
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
