import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-black/7 bg-white/70 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-5 py-3 text-sm font-bold sm:px-8">
          <span className="ml-2 font-black text-[#153d35]">إدارة ميثاق</span>
          <Link className="rounded-xl px-3 py-2 text-black/50 hover:bg-[#f8f5ef] hover:text-[#153d35]" href="/admin">
            قائمة الانتظار
          </Link>
          <Link className="rounded-xl px-3 py-2 text-black/50 hover:bg-[#f8f5ef] hover:text-[#153d35]" href="/admin/photos">
            مراجعة الصور
          </Link>
          <Link className="rounded-xl px-3 py-2 text-black/50 hover:bg-[#f8f5ef] hover:text-[#153d35]" href="/waitlist">
            حسابي
          </Link>
        </nav>
      </div>
      {children}
    </>
  );
}
