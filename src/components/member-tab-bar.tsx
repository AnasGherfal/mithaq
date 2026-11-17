"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/member", label: "ملفي", icon: "◈" },
  { href: "/discovery", label: "الاستكشاف", icon: "✦" },
  { href: "/introductions", label: "المقدمات", icon: "❖" },
  { href: "/photos", label: "الصور", icon: "▣" },
  { href: "/settings", label: "الإعدادات", icon: "⚙" },
];

export function MemberTabBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Spacer so page content is never hidden behind the fixed bar on phones. */}
      <div aria-hidden className="h-24 sm:hidden" />
      <nav
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-black/8 bg-white/92 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`focus-ring flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-black transition ${
                    active ? "text-[#153d35]" : "text-black/40"
                  }`}
                  href={tab.href}
                >
                  <span
                    aria-hidden
                    className={`grid size-8 place-items-center rounded-xl text-base transition ${
                      active ? "bg-[#153d35] text-white" : ""
                    }`}
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
